import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { noopLlmObservability, type LlmObservabilityPort } from "./llm-observability.port";
import type { ChatMessage, LlmCompletion, LlmCompletionInput, LlmPort } from "./llm.port";
import { withResilience, type ResilienceOptions } from "./resilience";

// Interface minima que este adapter realmente precisa de um BaseChatModel do
// LangChain - evita acoplar a assinatura publica deste modulo aos demais
// membros abstratos da classe (DIP: dependemos so do que usamos).
export type InvokableChatModel = Pick<BaseChatModel, "invoke">;

export interface LangChainChatModelAdapterOptions {
  readonly provider: string;
  readonly model: string;
  readonly observability?: LlmObservabilityPort;
  readonly resilience?: ResilienceOptions;
}

function toLangChainMessage(message: ChatMessage): BaseMessage {
  switch (message.role) {
    case "system":
      return new SystemMessage(message.content);
    case "assistant":
      return new AIMessage(message.content);
    default:
      return new HumanMessage(message.content);
  }
}

function extractContent(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

// Adapta qualquer BaseChatModel do LangChain (ChatOpenAI para OpenAI/OpenRouter,
// ChatOllama) para o LlmPort do dominio de IA, mantendo o pacote ai-agent
// independente da biblioteca concreta usada por cada provider.
export class LangChainChatModelAdapter implements LlmPort {
  private readonly observability: LlmObservabilityPort;

  public constructor(
    private readonly chatModel: InvokableChatModel,
    public readonly options: LangChainChatModelAdapterOptions
  ) {
    this.observability = options.observability ?? noopLlmObservability;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletion> {
    const startedAt = Date.now();

    try {
      const result = await withResilience(
        () => this.chatModel.invoke(input.messages.map(toLangChainMessage)),
        this.options.resilience
      );
      this.recordCall(startedAt, "success");

      const usage = result.usage_metadata;

      return {
        content: extractContent(result.content),
        tokenUsage: usage
          ? {
              completionTokens: usage.output_tokens,
              promptTokens: usage.input_tokens,
              totalTokens: usage.total_tokens
            }
          : undefined
      };
    } catch (error) {
      this.recordCall(startedAt, "error");
      throw error;
    }
  }

  private recordCall(startedAt: number, outcome: "success" | "error"): void {
    this.observability.recordCall({
      durationMs: Date.now() - startedAt,
      model: this.options.model,
      outcome,
      provider: this.options.provider
    });
  }
}
