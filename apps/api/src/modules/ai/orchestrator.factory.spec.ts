import { OrchestratorAgent } from "@desafio/ai-agent";
import { describe, expect, it } from "vitest";
import { MetricsService } from "../../observability/metrics.service";
import { StructuredLogger } from "../../observability/structured-logger";
import { buildOrchestrator } from "./orchestrator.factory";

describe("buildOrchestrator", () => {
  it("builds the placeholder orchestrator when LLM_PROVIDER is unset", async () => {
    const orchestrator = buildOrchestrator(
      {},
      new MetricsService(),
      new StructuredLogger(() => undefined)
    );

    expect(orchestrator).toBeInstanceOf(OrchestratorAgent);
    const answer = await orchestrator.answer({ content: "Compare os papers", history: [] });
    expect(answer.content).toBe("Analysis model is not configured yet.");
  });

  it("builds a real LLM-backed orchestrator when LLM_PROVIDER is set", () => {
    const orchestrator = buildOrchestrator(
      { LLM_PROVIDER: "ollama" },
      new MetricsService(),
      new StructuredLogger(() => undefined)
    );

    expect(orchestrator).toBeInstanceOf(OrchestratorAgent);
  });

  it("propagates the factory's validation error for an unknown provider", () => {
    expect(() =>
      buildOrchestrator(
        { LLM_PROVIDER: "gemini" },
        new MetricsService(),
        new StructuredLogger(() => undefined)
      )
    ).toThrowError(/LLM_PROVIDER must be set to one of/);
  });
});
