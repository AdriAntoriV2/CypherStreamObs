import type { ResolvedYouTubeTrack } from './song-request.types.js';

export interface PlaybackEngine {
  playTrack(track: ResolvedYouTubeTrack): Promise<void>;
  stopTrack(): Promise<void>;
  startRadio(): Promise<void>;
  onTrackEnded(listener: () => void): () => void;
}

export const PLAYBACK_ENGINE = Symbol('PLAYBACK_ENGINE');