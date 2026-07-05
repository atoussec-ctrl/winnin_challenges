export type LlmCallOutcome = "success" | "error";

export interface LlmCallEvent {
  readonly provider: string;
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: LlmCallOutcome;
}

// Porta consumida pelos adapters de LLM para reportar cada chamada; a
// implementacao real (apps/api) liga isto aos logs estruturados e as metricas
// Prometheus ja existentes, mantendo o pacote ai-agent livre do Nest.
export interface LlmObservabilityPort {
  recordCall(event: LlmCallEvent): void;
}

export const noopLlmObservability: LlmObservabilityPort = {
  recordCall: () => undefined
};
