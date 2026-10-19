export enum MessageSender {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum LlmProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
}

export interface IChunkCitation {
  chunkId: string;
  documentId: string;
  title: string;
  pageNumber?: number;
  snippet: string;
  relevanceScore: number;
}

export interface ITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface IMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  citations?: IChunkCitation[];
  tokensUsed?: ITokenUsage;
  latencyMs?: number;
  modelProvider?: LlmProvider;
  modelName?: string;
  createdAt: string;
}

export interface IConversation {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'archived' | 'deleted';
  selectedModelProvider: LlmProvider;
  selectedModelName: string;
  systemPromptOverride?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Server-Sent Event (SSE) Stream Messages emitted during LLM response generation
 */
export type SSEEventType = 'token' | 'citations' | 'metadata' | 'error' | 'done';

export interface ISSETokenEvent {
  type: 'token';
  delta: string;
}

export interface ISSECitationsEvent {
  type: 'citations';
  citations: IChunkCitation[];
}

export interface ISSEMetadataEvent {
  type: 'metadata';
  messageId: string;
  latencyMs: number;
  tokensUsed: ITokenUsage;
  modelProvider: string;
  modelName: string;
}

export interface ISSEErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

export interface ISSEDoneEvent {
  type: 'done';
}

export type ISSEPayload =
  | ISSETokenEvent
  | ISSECitationsEvent
  | ISSEMetadataEvent
  | ISSEErrorEvent
  | ISSEDoneEvent;
