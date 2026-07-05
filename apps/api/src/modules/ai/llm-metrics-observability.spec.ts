import { describe, expect, it } from "vitest";
import { MetricsService } from "../../observability/metrics.service";
import { StructuredLogger } from "../../observability/structured-logger";
import { LlmMetricsObservability } from "./llm-metrics-observability";

describe("LlmMetricsObservability", () => {
  it("records a successful LLM call in the metrics service", () => {
    const metrics = new MetricsService();
    const observability = new LlmMetricsObservability(metrics, new StructuredLogger(() => undefined));

    observability.recordCall({
      durationMs: 120,
      model: "gpt-4o-mini",
      outcome: "success",
      provider: "openai"
    });

    const snapshot = metrics.snapshot();
    expect(snapshot).toEqual([
      expect.objectContaining({
        errorCount: 0,
        operation: "llm openai/gpt-4o-mini",
        successCount: 1,
        totalDurationMs: 120
      })
    ]);
  });

  it("records a failed LLM call in the metrics service", () => {
    const metrics = new MetricsService();
    const observability = new LlmMetricsObservability(metrics, new StructuredLogger(() => undefined));

    observability.recordCall({
      durationMs: 50,
      model: "llama3.2",
      outcome: "error",
      provider: "ollama"
    });

    const snapshot = metrics.snapshot();
    expect(snapshot).toEqual([
      expect.objectContaining({ errorCount: 1, operation: "llm ollama/llama3.2", successCount: 0 })
    ]);
  });

  it("logs a structured line for every call", () => {
    const metrics = new MetricsService();
    const lines: string[] = [];
    const observability = new LlmMetricsObservability(metrics, new StructuredLogger((line) => lines.push(line)));

    observability.recordCall({
      durationMs: 10,
      model: "gpt-4o-mini",
      outcome: "success",
      provider: "openai"
    });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      context: "LlmObservability",
      level: "log"
    });
  });
});
