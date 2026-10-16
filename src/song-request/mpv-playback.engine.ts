
import {
    Injectable,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import net, { type Socket } from 'node:net';
import type { ResolvedYouTubeTrack } from './song-request.types.js';
import type { PlaybackEngine } from './playback-engine.js';

interface PendingCommand {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

interface MpvMessage {
    request_id?: number;
    error?: string;
    event?: string;
    reason?: string;
}

@Injectable()
export class MpvPlaybackEngine
    implements PlaybackEngine, OnModuleDestroy {
    private readonly logger = new Logger(MpvPlaybackEngine.name);

    private readonly mpvPath: string;
    private readonly ytDlpPath: string;
    private readonly ipcPath: string;
    private readonly radioUrl: string | undefined;

    private process: ChildProcess | undefined;
    private socket: Socket | undefined;
    private connecting: Promise<void> | undefined;

    private requestId = 0;
    private buffer = '';
    private isRadio = false;
    private destroyed = false;

    private readonly pendingCommands = new Map<
        number,
        PendingCommand
    >();

    private activeRequestId: string | undefined;

    private readonly trackEndedListeners = new Set<
        (requestId: string) => void
    >();

    constructor(private readonly config: ConfigService) {
        this.mpvPath = this.config.getOrThrow<string>(
            'playback.mpvPath',
        );

        this.ytDlpPath = resolve(
            process.cwd(),
            this.config.getOrThrow<string>(
                'playback.ytDlpPath',
            ),
        );

        this.ipcPath = this.config.getOrThrow<string>(
            'playback.ipcPath',
        );

        this.radioUrl = this.config.get<string>(
            'playback.radioUrl',
        );
    }

    onTrackEnded(
        listener: (requestId: string) => void,
    ): () => void {
        this.trackEndedListeners.add(listener);

        return () => {
            this.trackEndedListeners.delete(listener);
        };
    }

    async playTrack(
        track: ResolvedYouTubeTrack,
        requestId: string,
    ): Promise<void> {
        await this.ensureConnected();

        this.isRadio = false;
        this.activeRequestId = requestId;

        try {
            await this.sendCommand([
                'loadfile',
                track.url,
                'replace',
            ]);

            this.logger.log(`Loading "${track.title}"`);
        } catch (error) {
            this.activeRequestId = undefined;
            throw error;
        }
    }

    async stopTrack(): Promise<void> {
        if (!this.socket || this.socket.destroyed) {
            return;
        }

        await this.sendCommand(['stop']);
    }

    async startRadio(): Promise<void> {
        if (!this.radioUrl) {
            this.logger.debug(
                'No radio URL configured; leaving playback idle',
            );
            return;
        }

        await this.ensureConnected();

        this.isRadio = true;
        this.activeRequestId = undefined;

        await this.sendCommand([
            'loadfile',
            this.radioUrl,
            'replace',
        ]);

        this.logger.log('Radio playback started');
    }

    async onModuleDestroy(): Promise<void> {
        this.destroyed = true;

        this.socket?.destroy();
        this.socket = undefined;

        this.process?.kill();
        this.process = undefined;

        for (const [id, pending] of this.pendingCommands) {
            clearTimeout(pending.timeout);
            pending.reject(
                new Error('mpv playback engine is shutting down'),
            );
            this.pendingCommands.delete(id);
        }

        if (process.platform !== 'win32') {
            await unlink(this.ipcPath).catch(() => undefined);
        }
    }

    private async ensureConnected(): Promise<void> {
        if (this.destroyed) {
            throw new Error(
                'mpv playback engine has been shut down',
            );
        }

        if (this.socket && !this.socket.destroyed) {
            return;
        }

        if (this.connecting) {
            return this.connecting;
        }

        this.connecting = this.startProcessAndConnect();

        try {
            await this.connecting;
        } finally {
            this.connecting = undefined;
        }
    }

    private async startProcessAndConnect(): Promise<void> {
        if (process.platform !== 'win32') {
            await unlink(this.ipcPath).catch(() => undefined);
        }

        const child = spawn(
            this.mpvPath,
            [
                '--idle=yes',
                '--no-terminal',
                '--force-window=no',
                '--ytdl=yes',
                `--script-opts=ytdl_hook-ytdl_path=${this.ytDlpPath}`,
                `--input-ipc-server=${this.ipcPath}`,
            ],
            {
                stdio: 'ignore',
                windowsHide: true,
            },
        );

        this.process = child;

        child.on('error', (error) => {
            this.logger.error(
                `Failed to launch mpv: ${error.message}`,
            );
        });

        child.on('exit', (code, signal) => {
            if (this.process === child) {
                this.process = undefined;
            }

            this.socket?.destroy();
            this.socket = undefined;

            const error = new Error(
                `mpv exited (code=${code}, signal=${signal})`,
            );

            this.rejectPendingCommands(error);
            this.logger.warn(error.message);

            // Don't advance playback during application shutdown.
            if (this.destroyed) {
                return;
            }

            // Recover if mpv exits while a song is active.
            const requestId = this.activeRequestId;

            if (!requestId) {
                return;
            }

            this.activeRequestId = undefined;
            this.isRadio = false;

            this.logger.warn(
                `mpv exited during request ${requestId}; advancing playback`,
            );

            for (const listener of this.trackEndedListeners) {
                listener(requestId);
            }
        });

        await new Promise<void>((resolveSpawn, rejectSpawn) => {
            child.once('spawn', resolveSpawn);
            child.once('error', rejectSpawn);
        });

        await this.connectSocket();
    }

    private connectSocket(): Promise<void> {
        return new Promise((resolveConnection, rejectConnection) => {
            const deadline = Date.now() + 5000;

            let currentSocket: Socket | undefined;
            let retryTimer: ReturnType<typeof setTimeout> | undefined;
            let settled = false;

            const finish = (error?: Error) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeout);

                if (retryTimer) {
                    clearTimeout(retryTimer);
                }

                if (error) {
                    currentSocket?.destroy();
                    rejectConnection(error);
                } else {
                    resolveConnection();
                }
            };

            const timeout = setTimeout(() => {
                finish(
                    new Error(
                        `Timed out connecting to mpv IPC socket: ${this.ipcPath}`,
                    ),
                );
            }, 5000);

            const attempt = () => {
                if (settled) {
                    return;
                }

                const socket = net.createConnection(this.ipcPath);
                currentSocket = socket;

                socket.once('connect', () => {
                    this.socket = socket;

                    socket.on('data', (data: Buffer) => {
                        this.handleSocketData(data.toString('utf8'));
                    });

                    socket.on('error', (error) => {
                        this.rejectPendingCommands(error);
                        this.logger.warn(
                            `mpv IPC error: ${error.message}`,
                        );
                    });

                    socket.on('close', () => {
                        if (this.socket === socket) {
                            this.socket = undefined;
                        }
                    });

                    finish();
                });

                socket.once('error', () => {
                    socket.destroy();

                    if (settled) {
                        return;
                    }

                    if (Date.now() >= deadline) {
                        finish(
                            new Error(
                                `Timed out connecting to mpv IPC socket: ${this.ipcPath}`,
                            ),
                        );
                        return;
                    }

                    retryTimer = setTimeout(attempt, 100);
                });
            };

            attempt();
        });
    }

    private handleSocketData(data: string): void {
        this.buffer += data;

        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            let message: MpvMessage;

            try {
                message = JSON.parse(line) as MpvMessage;
            } catch {
                this.logger.warn(
                    'Ignoring invalid JSON received from mpv IPC',
                );
                continue;
            }

            if (message.request_id !== undefined) {
                const pending = this.pendingCommands.get(
                    message.request_id,
                );

                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingCommands.delete(message.request_id);

                    if (message.error === 'success') {
                        pending.resolve();
                    } else {
                        pending.reject(
                            new Error(
                                `mpv command failed: ${message.error}`,
                            ),
                        );
                    }
                }
            }

            if (
                message.event === 'end-file' &&
                message.reason === 'eof' &&
                !this.isRadio &&
                this.activeRequestId
            ) {
                const requestId = this.activeRequestId;
                this.activeRequestId = undefined;

                for (const listener of this.trackEndedListeners) {
                    listener(requestId);
                }
            }
        }
    }

    private sendCommand(command: string[]): Promise<void> {
        const socket = this.socket;

        if (!socket || socket.destroyed) {
            return Promise.reject(
                new Error('mpv IPC is not connected'),
            );
        }

        const id = ++this.requestId;

        return new Promise((resolveCommand, rejectCommand) => {
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(id);

                rejectCommand(
                    new Error(
                        `mpv command timed out: ${command[0]}`,
                    ),
                );
            }, 5000);

            this.pendingCommands.set(id, {
                resolve: resolveCommand,
                reject: rejectCommand,
                timeout,
            });

            socket.write(
                `${JSON.stringify({
                    command,
                    request_id: id,
                })}\n`,
                (error) => {
                    if (!error) {
                        return;
                    }

                    const pending = this.pendingCommands.get(id);

                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingCommands.delete(id);
                        pending.reject(error);
                    }
                },
            );
        });
    }

    private rejectPendingCommands(error: Error): void {
        for (const [id, pending] of this.pendingCommands) {
            clearTimeout(pending.timeout);
            pending.reject(error);
            this.pendingCommands.delete(id);
        }
    }
}