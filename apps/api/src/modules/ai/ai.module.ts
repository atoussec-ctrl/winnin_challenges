import { Module } from "@nestjs/common";
import { OrchestratorAgent } from "@desafio/ai-agent";
import { MetricsService } from "../../observability/metrics.service";
import { StructuredLogger } from "../../observability/structured-logger";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { buildOrchestrator } from "./orchestrator.factory";

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      inject: [MetricsService, StructuredLogger],
      provide: OrchestratorAgent,
      useFactory: (metrics: MetricsService, logger: StructuredLogger) =>
        buildOrchestrator(process.env, metrics, logger)
    }
  ]
})
export class AiModule {}

