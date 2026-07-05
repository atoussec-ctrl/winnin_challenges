import { Injectable } from "@nestjs/common";
import type { LlmCallEvent, LlmObservabilityPort } from "@desafio/ai-agent";
import { MetricsService } from "../../observability/metrics.service";
import { StructuredLogger } from "../../observability/structured-logger";

// Liga o LlmObservabilityPort (definido em @desafio/ai-agent, sem dependencia
// de Nest) aos logs estruturados e as metricas Prometheus ja existentes -
// mesmo padrao usado pelo LoggingInterceptor para chamadas HTTP/GraphQL.
@Injectable()
export class LlmMetricsObservability implements LlmObservabilityPort {
  public constructor(
    private readonly metrics: MetricsService,
    private readonly logger: StructuredLogger
  ) {}

  public recordCall(event: LlmCallEvent): void {
    const operation = `llm ${event.provider}/${event.model}`;
    this.metrics.recordRequest({ durationMs: event.durationMs, operation, outcome: event.outcome });

    if (event.outcome === "success") {
      this.logger.log(`${operation} completed in ${event.durationMs}ms`, "LlmObservability");
      return;
    }

    this.logger.error(`${operation} failed in ${event.durationMs}ms`, "LlmObservability");
  }
}
