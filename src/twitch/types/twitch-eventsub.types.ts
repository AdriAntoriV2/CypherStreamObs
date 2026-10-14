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


export interface TwitchShoutoutInfo {
  displayName: string;
  login: string;
  category: string;
  title: string;
  isLive: boolean;
}

export interface TwitchTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string[];
    token_type: string;
}

export interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
}