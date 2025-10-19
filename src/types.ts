export interface PRContext {
  url: string;
  commit: string;
  content: string;
  agentId: string;
  timestamp: number;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ContinueAgentResponse {
  id: string;
  status: string;
  [key: string]: any;
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
