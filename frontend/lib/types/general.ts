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

// Assessment types
export type AssessmentType = "code-editor" | "notebook";

export type BaseAssessment = {
  id: string;
  type: AssessmentType;
  title: string;
  description: string;
  open_assessment: boolean;
};

export type CodingAssessment = BaseAssessment & {
  type: "code-editor";
  languages?: string[];
  starterCode?: Record<string, string>;
};

export type NotebookAssessment = BaseAssessment & {
  type: "notebook";
  language: "python"; // JupyterLite only supports Python via Pyodide
  initialCells?: NotebookCell[];
};

export type NotebookCell = {
  id: string;
  type: "code" | "markdown";
  content: string;
  outputs?: any[];
};

export type Assessment = CodingAssessment | NotebookAssessment;
