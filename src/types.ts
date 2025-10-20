export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PRContext {
  url: string;
  commit: string;
  content: string;
  agentId: string;
  timestamp: number;
  conversationHistory?: ConversationMessage[];
}

export interface ContinueAgentResponse {
  id: string;
  status: string;
  error?: string;
  message?: string;
}

export interface SelectionRequest {
  selectedText: string;
  prContext: PRContext;
  apiKey: string;
}

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface CachedStorageValue {
  timestamp: number;
  [key: string]: unknown;
}

export interface AnthropicMessageResponse {
  content: Array<{ text: string; type: string }>;
  id: string;
  model: string;
  role: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface PRInfo {
  owner: string;
  repo: string;
  number: string;
}
