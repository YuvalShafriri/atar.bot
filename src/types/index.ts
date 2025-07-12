export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface AppConfig {
  geminiProxyUrl: string;
  maxTokens: number;
  temperature: number;
}

export interface UIState {
  isLoading: boolean;
  error: string | null;
}

export interface Node {
  id: string;
  label: string;
  type: string;
  title?: string;
}

export interface Edge {
  from: string;
  to: string;
  label?: string;
}
