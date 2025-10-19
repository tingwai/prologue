export interface PRContext {
  url: string;
  commit: string;
  content: string;
  agentId: string;
  timestamp: number;
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
