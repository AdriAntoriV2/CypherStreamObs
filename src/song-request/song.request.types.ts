
export interface SongRequest {
  id: string;
  query: string;
  requester: {
    id: string;
    login: string;
    displayName: string;
  };
  requestedAt: string;
}

export interface SongQueueSnapshot {
  current: SongRequest | null;
  pending: SongRequest[];
  limit: number;
}
