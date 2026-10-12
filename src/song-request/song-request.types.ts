
export type SongRequestStatus = 'resolving' | 'ready' | 'failed';

export interface ResolvedYouTubeTrack {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
}

export interface SongRequest {
  id: string;
  query: string;
  requester: {
    id: string;
    login: string;
    displayName: string;
  };
  requestedAt: string;
  status: SongRequestStatus;
  track?: ResolvedYouTubeTrack;
  error?: string;
}

export interface SongQueueSnapshot {
  current: SongRequest | null;
  pending: SongRequest[];
  limit: number;
}
