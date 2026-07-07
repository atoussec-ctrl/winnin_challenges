import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrchestratorAgent } from "@desafio/ai-agent";
import type { AppEnv } from "../../config/env.schema";
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
      inject: [ConfigService, MetricsService, StructuredLogger],
      provide: OrchestratorAgent,
      useFactory: (
        config: ConfigService<AppEnv, true>,
        metrics: MetricsService,
        logger: StructuredLogger
      ) =>
        buildOrchestrator(
          {
            HUGGINGFACE_API_KEY: config.get("HUGGINGFACE_API_KEY", { infer: true }),
            LLM_MODEL: config.get("LLM_MODEL", { infer: true }),
            LLM_PROVIDER: config.get("LLM_PROVIDER", { infer: true }),
            OLLAMA_BASE_URL: config.get("OLLAMA_BASE_URL", { infer: true }),
            OPENAI_API_KEY: config.get("OPENAI_API_KEY", { infer: true }),
            OPENROUTER_API_KEY: config.get("OPENROUTER_API_KEY", { infer: true })
          },
          metrics,
          logger
        )
    }
  ]
})
export class AiModule {}

