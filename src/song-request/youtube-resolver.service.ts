
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface YtDlpEntry {
  id?: string;
  title?: string;
  webpage_url?: string;
  original_url?: string;
  duration?: number | null;
  thumbnail?: string | null;
  thumbnails?: Array<{ url?: string }> | null;
  uploader?: string | null;
  entries?: Array<YtDlpEntry | null> | null;
}

export interface ResolvedYouTubeTrack {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
}

@Injectable()
export class YouTubeResolverService {
  private readonly executable: string;
  private readonly resolveTimeoutMs: number;
  private readonly maxOutputBytes = 4 * 1024 * 1024;

  constructor(private readonly config: ConfigService) {
    this.executable = this.config.getOrThrow<string>(
      'playback.ytDlpPath',
    );

    this.resolveTimeoutMs =
      this.config.getOrThrow<number>(
        'playback.ytDlpResolveTimeoutMs',
      );
  }

  async resolve(input: string): Promise<ResolvedYouTubeTrack> {
    const query = input.trim();

    if (!query) {
      throw new Error(
        'A YouTube URL or search query is required',
      );
    }

    const target = this.normalizeInput(query);

    // URLs and video IDs should resolve directly, without fallback search.
    if (!target.startsWith('ytsearch1:')) {
      const track = await this.resolveDirect(target);
      return this.toResolvedTrack(track);
    }

    const originalQuery = target.slice('ytsearch1:'.length);
    const searchQueries = this.buildSearchQueries(originalQuery);

    for (let index = 0; index < searchQueries.length; index++) {
      const searchQuery = searchQueries[index];
      const track = await this.search(searchQuery);

      if (!track) {
        continue;
      }

      // The original query's first result is accepted as before.
      // Fallback results must match at least one original keyword.
      if (
        index === 0 ||
        this.matchesOriginalQuery(
          track.title!,
          originalQuery,
        )
      ) {
        return this.toResolvedTrack(track);
      }
    }

    throw new Error(
      'YouTube search returned no matching results',
    );
  }

  private buildSearchQueries(input: string): string[] {
    const normalized = input
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[()[\]{}"'`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(' ').filter(Boolean);

    return [
      ...new Set([
        normalized,
        words.slice(0, 2).join(' '),
        words[0] ?? '',
      ]),
    ].filter(Boolean);
  }

  private normalizeSearchText(value: string): string[] {
    return value
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  private matchesOriginalQuery(
    title: string,
    originalQuery: string,
  ): boolean {
    const keywords = this.normalizeSearchText(originalQuery);
    const titleWords = new Set(this.normalizeSearchText(title));

    return keywords.some((keyword) => titleWords.has(keyword));
  }

  private async search(
    query: string,
  ): Promise<YtDlpEntry | undefined> {
    const args = [
      '--no-warnings',
      '--js-runtimes',
      'node',
      '--flat-playlist',
      '--dump-json',
      '--skip-download',
      `ytsearch1:${query}`,
    ];

    const stdout = await this.execute(args);
    const entries = this.parseJsonLines(stdout);

    return entries.find(
      (entry) => Boolean(entry.id && entry.title),
    );
  }

  private async resolveDirect(
    target: string,
  ): Promise<YtDlpEntry> {
    const args = [
      '--no-warnings',
      '--js-runtimes',
      'node',
      '--no-playlist',
      '--dump-single-json',
      '--skip-download',
      target,
    ];

    const stdout = await this.execute(args);

    let track: YtDlpEntry;

    try {
      track = JSON.parse(stdout) as YtDlpEntry;
    } catch {
      throw new Error(
        'yt-dlp returned invalid JSON',
      );
    }

    if (!track.id || !track.title) {
      throw new Error(
        'YouTube returned no usable video metadata',
      );
    }

    return track;
  }

  private async execute(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        this.executable,
        args,
        {
          encoding: 'utf8',
          timeout: this.resolveTimeoutMs,
          maxBuffer: this.maxOutputBytes,
          windowsHide: true,
        },
      );

      return stdout;
    } catch (error: unknown) {
      const failure = error as NodeJS.ErrnoException & {
        stderr?: string;
        killed?: boolean;
      };

      if (
        failure.killed ||
        failure.code === 'ETIMEDOUT'
      ) {
        throw new Error(
          'YouTube resolution timed out',
        );
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
  }

  private parseJsonLines(stdout: string): YtDlpEntry[] {
    const entries: YtDlpEntry[] = [];

    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }

      try {
        entries.push(JSON.parse(line) as YtDlpEntry);
      } catch {
        throw new Error(
          'yt-dlp returned invalid JSON',
        );
      }
    }

    return entries;
  }

  private toResolvedTrack(
    track: YtDlpEntry,
  ): ResolvedYouTubeTrack {
    if (!track.id || !track.title) {
      throw new Error(
        'YouTube returned incomplete track metadata',
      );
    }

    return {
      id: track.id,
      title: track.title,
      url:
        track.webpage_url ??
        track.original_url ??
        `https://www.youtube.com/watch?v=${track.id}`,
      duration:
        typeof track.duration === 'number'
          ? track.duration
          : null,
      thumbnail:
        track.thumbnail ??
        track.thumbnails?.find((thumbnail) => thumbnail.url)?.url ??
        null,
      uploader: track.uploader ?? null,
    };
  }

  private normalizeInput(input: string): string {
    if (/^[\w-]{11}$/.test(input)) {
      return `https://www.youtube.com/watch?v=${input}`;
    }

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
        throw new Error(
          'Only YouTube URLs are supported',
        );
      }

      return url.toString();
    }

    return `ytsearch1:${input}`;
  }
}
