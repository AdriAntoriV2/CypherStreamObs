export interface TwitchEventSubMessage {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
  };

  payload: Record<string, unknown>;
}

export interface TwitchSession {
  id: string;
  status: string;
  connected_at: string;
  keepalive_timeout_seconds: number;
  reconnect_url: string | null;
}