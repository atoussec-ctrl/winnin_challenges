export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface LlmCompletion {
  readonly content: string;
  readonly tokenUsage?: TokenUsage;
}

export interface LlmCompletionInput {
  readonly messages: readonly ChatMessage[];
}

// Porta unica atras da qual qualquer provedor de LLM (OpenAI, OpenRouter,
// HuggingFace Inference API, Ollama) e consumido pelo dominio de IA - troca de
// provider e so troca de implementacao (ver llm-provider.factory.ts), sem
// tocar em AnalystAgent/RAGAgent/AiService.
export interface LlmPort {
  readonly complete: (input: LlmCompletionInput) => Promise<LlmCompletion>;
}
