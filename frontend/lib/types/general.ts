export type TSource = {
  id?: number;
  chunk_id: string;
  metadata: {
    type: string;
    title?: string;
    link?: string;
    summary?: string;
    category?: string;
  };
  content: string;
  score?: number;
};

export type Message = {
  content: string;
  role: "user" | "assistant" | "system";
};

export type TConnectionStatus =
  | "initializing"
  | "audio_connected"
  | "service_connected"
  | "bot_connected"
  | "disconnected";
