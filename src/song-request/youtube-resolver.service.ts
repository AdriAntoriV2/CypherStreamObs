
import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const RESOLVE_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

export interface ResolvedYouTubeTrack {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
}

interface YtDlpEntry {
  id?: string;
  title?: string;
  webpage_url?: string;
  original_url?: string;
  duration?: number | null;
  thumbnail?: string | null;
  uploader?: string | null;
  entries?: Array<YtDlpEntry | null> | null;
}

@Injectable()
export class YouTubeResolverService {
  private readonly executable =
    process.env.YT_DLP_PATH?.trim() || 'yt-dlp';

  async resolve(input: string): Promise<ResolvedYouTubeTrack> {
    const query = input.trim();

    if (!query) {
      throw new Error('A YouTube URL or search query is required');
    }

    const target = this.normalizeInput(query);
    const isSearch = target.startsWith('ytsearch1:');

    const args = [
      '--ignore-config',
      '--no-warnings',
      '--js-runtimes',
      'node',
      '--dump-single-json',
      '--skip-download',
    ];

    if (!isSearch) {
      args.push('--no-playlist');
    }

    args.push(target);

    let stdout: string;

    try {
      ({ stdout } = await execFileAsync(this.executable, args, {
        encoding: 'utf8',
        timeout: RESOLVE_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      }));
    } catch (error: unknown) {
      const failure = error as NodeJS.ErrnoException & {
        stderr?: string;
        killed?: boolean;
      };

      if (
        failure.killed ||
        failure.code === 'ETIMEDOUT'
      ) {
        throw new Error('YouTube resolution timed out');
      }

      if (failure.code === 'ENOENT') {
        throw new Error(
          `yt-dlp was not found: ${this.executable}`,
        );
      }

      const details = failure.stderr?.trim();
      throw new Error(
        details
          ? `YouTube resolution failed: ${details.slice(-500)}`
          : `YouTube resolution failed: ${failure.message}`,
      );
    }

    let result: YtDlpEntry;

    try {
      result = JSON.parse(stdout) as YtDlpEntry;
    } catch {
      throw new Error('yt-dlp returned invalid JSON');
    }

    // Search results are represented as a playlist containing entries.
    const track = isSearch
      ? result.entries?.find(
          (entry): entry is YtDlpEntry => entry !== null,
        )
      : result;

    if (!track) {
      throw new Error('No matching YouTube video was found');
    }

    if (!track.id || !track.title) {
      throw new Error('YouTube returned incomplete track metadata');
    }

    const url =
      track.webpage_url ??
      track.original_url ??
      `https://www.youtube.com/watch?v=${track.id}`;

    return {
      id: track.id,
      title: track.title,
      url,
      duration:
        typeof track.duration === 'number'
          ? track.duration
          : null,
      thumbnail: track.thumbnail ?? null,
      uploader: track.uploader ?? null,
    };
  }

  private normalizeInput(input: string): string {
    // A bare YouTube video ID.
    if (/^[\w-]{11}$/.test(input)) {
      return `https://www.youtube.com/watch?v=${input}`;
    }

    // Treat explicit URLs as URLs, not search queries.
    if (/^https?:\/\//i.test(input)) {
      let url: URL;

      try {
        url = new URL(input);
      } catch {
        throw new Error('Invalid URL');
      }

      const hostname = url.hostname.toLowerCase();
      const isYouTube =
        hostname === 'youtu.be' ||
        hostname === 'youtube.com' ||
        hostname.endsWith('.youtube.com');

      if (!isYouTube) {
        throw new Error('Only YouTube URLs are supported');
      }

      return url.toString();
    }

    // All other input is a search query. Unicode is preserved.
    return `ytsearch1:${input}`;
  }
}
