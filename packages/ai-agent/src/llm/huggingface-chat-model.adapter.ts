import type { ChatCompletionInput, ChatCompletionOutput } from "@huggingface/tasks";
import { noopLlmObservability, type LlmObservabilityPort } from "./llm-observability.port";
import type { LlmCompletion, LlmCompletionInput, LlmPort } from "./llm.port";
import { withResilience, type ResilienceOptions } from "./resilience";

// Interface minima usada do InferenceClient (@huggingface/inference) - o
// endpoint de chat completion e compativel com o formato OpenAI.
export interface HuggingFaceInferenceClient {
  readonly chatCompletion: (input: ChatCompletionInput) => Promise<ChatCompletionOutput>;
}

export interface HuggingFaceChatModelAdapterOptions {
  readonly model: string;
  readonly observability?: LlmObservabilityPort;
  readonly resilience?: ResilienceOptions;
}

// A HuggingFace Inference API nao e um BaseChatModel do LangChain, entao nao
// reaproveita o LangChainChatModelAdapter - mas implementa o mesmo LlmPort,
// tornando os dois adapters intercambiaveis para quem os consome.
export class HuggingFaceChatModelAdapter implements LlmPort {
  private readonly observability: LlmObservabilityPort;

  public constructor(
    private readonly client: HuggingFaceInferenceClient,
    public readonly options: HuggingFaceChatModelAdapterOptions
  ) {
    this.observability = options.observability ?? noopLlmObservability;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletion> {
    const startedAt = Date.now();

    try {
      const output = await withResilience(
        () =>
          this.client.chatCompletion({
            messages: input.messages.map((message) => ({
              content: message.content,
              role: message.role
            })),
            model: this.options.model
          }),
        this.options.resilience
      );
      this.recordCall(startedAt, "success");

      return {
        content: output.choices[0]?.message.content ?? "",
        tokenUsage: output.usage
          ? {
              completionTokens: output.usage.completion_tokens,
              promptTokens: output.usage.prompt_tokens,
              totalTokens: output.usage.total_tokens
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
      provider: "huggingface"
    });
  }
}
