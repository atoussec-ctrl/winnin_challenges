import { describe, expect, it } from "vitest";
import type { AnalysisModelPort } from "../tools/analysis-tools";
import { createStarterOrchestrator } from "./create-starter-orchestrator";

describe("createStarterOrchestrator", () => {
  it("creates a placeholder orchestrator for retrieval", async () => {
    const answer = await createStarterOrchestrator().answer({
      content: "O que e attention?",
      history: []
    });

    expect(answer).toEqual({
      content: "No relevant context was found for this question.",
      sources: []
    });
  });

  it("creates a placeholder orchestrator for analysis", async () => {
    const answer = await createStarterOrchestrator().answer({
      content: "Compare os papers",
      history: []
    });

    expect(answer).toEqual({
      content: "Analysis model is not configured yet.",
      sources: []
    });
  });

  it("uses a real analysis model when one is provided", async () => {
    const analysis: AnalysisModelPort = {
      comparePapers: () =>
        Promise.resolve({ content: "Real comparison.", paperIds: ["1706.03762"] }),
      rankPapers: () => Promise.resolve({ content: "Real ranking.", paperIds: ["1706.03762"] }),
      summarize: () => Promise.resolve({ content: "Real summary.", paperIds: ["1706.03762"] })
    };

    const answer = await createStarterOrchestrator({ analysis }).answer({
      content: "Compare os papers",
      history: []
    });

    expect(answer.content).toBe("Real comparison.");
  });
});

