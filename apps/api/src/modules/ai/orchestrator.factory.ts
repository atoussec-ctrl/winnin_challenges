import {
  createChatModel,
  createStarterOrchestrator,
  LlmAnalysisModel,
  type LlmClientEnv,
  type OrchestratorAgent
} from "@desafio/ai-agent";
import type { MetricsService } from "../../observability/metrics.service";
import type { StructuredLogger } from "../../observability/structured-logger";
import { LlmMetricsObservability } from "./llm-metrics-observability";

// LLM_PROVIDER ausente (default local/CI): orquestrador com o modelo de
// analise placeholder, sem exigir nenhuma credencial. LLM_PROVIDER definido:
// AnalysisModelPort real, via qualquer um dos 4 provedores suportados
// (createChatModel, ver @desafio/ai-agent/llm/llm-provider.factory.ts).
export function buildOrchestrator(
  env: LlmClientEnv,
  metrics: MetricsService,
  logger: StructuredLogger
): OrchestratorAgent {
  if (!env.LLM_PROVIDER) {
    return createStarterOrchestrator();
  }

  const observability = new LlmMetricsObservability(metrics, logger);
  const chatModel = createChatModel(env, observability);
  return createStarterOrchestrator({ analysis: new LlmAnalysisModel(chatModel) });
}
