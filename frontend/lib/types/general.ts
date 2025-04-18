export type TSource = {
  metadata: {
    imageFile?: string
    contentType?: string
    filename?: string
    id: string
    pageNumber?: number
    project_id: string
    source?: string
    type?: string
    source_workspace_id?: string
    source_demo_id?: string
    source_demo_url?: string
  }
  id_?: string
  score: number
}

export type Message = {
  content: string
  role: "user" | "assistant" | "system"
}

export type TConnectionStatus =
  | "initializing"
  | "audio_connected"
  | "service_connected"
  | "bot_connected"
  | "disconnected"
