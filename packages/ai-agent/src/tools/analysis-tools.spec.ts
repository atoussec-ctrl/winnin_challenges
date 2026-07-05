import { describe, expect, it } from "vitest";
import {
  ComparePapersTool,
  RankPapersTool,
  SummarizeTool,
  type AnalysisModelPort
} from "./analysis-tools";

class FakeAnalysis implements AnalysisModelPort {
  public comparePapers() {
    return Promise.resolve({
      content: "Comparison",
      paperIds: ["2210.03629", "2302.04761"] as const
    });
  }

  public summarize() {
    return Promise.resolve({
      content: "Summary",
      paperIds: ["1706.03762"] as const
    });
  }

  public rankPapers() {
    return Promise.resolve({
      content: "Ranking",
      paperIds: ["2210.03629"] as const
    });
  }
}

describe("analysis tools", () => {
  it("compares at least two papers", async () => {
    const result = await new ComparePapersTool(new FakeAnalysis()).execute({
      aspect: "tool use",
      paperIds: ["2210.03629", "2302.04761"]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content).toBe("Comparison");
    }
  });

  it("rejects comparisons with fewer than two papers", async () => {
    const result = await new ComparePapersTool(new FakeAnalysis()).execute({
      aspect: "tool use",
      paperIds: ["2210.03629"]
    });

    expect(result.ok).toBe(false);
  });

  it("summarizes a paper with a valid bullet count", async () => {
    const result = await new SummarizeTool(new FakeAnalysis()).execute({
      maxBulletPoints: 5,
      paperId: "1706.03762"
    });

    expect(result.ok).toBe(true);
  });

  it("rejects summaries with too many bullets", async () => {
    const result = await new SummarizeTool(new FakeAnalysis()).execute({
      maxBulletPoints: 6,
      paperId: "1706.03762"
    });

    expect(result.ok).toBe(false);
  });

  it("ranks papers by a criterion", async () => {
    const result = await new RankPapersTool(new FakeAnalysis()).execute({
      criterion: "external tool use",
      paperIds: ["2210.03629", "2302.04761"]
    });

    expect(result.ok).toBe(true);
  });

  it("rejects empty ranking criteria", async () => {
    const result = await new RankPapersTool(new FakeAnalysis()).execute({
      criterion: " ",
      paperIds: ["2210.03629"]
    });

    expect(result.ok).toBe(false);
  });

  it("turns a rejected analysis port call into a ToolResult error instead of throwing", async () => {
    const failure = new Error("LLM endpoint timed out");
    const brokenAnalysis: AnalysisModelPort = {
      comparePapers: () => Promise.reject(failure),
      rankPapers: () => Promise.reject(failure),
      summarize: () => Promise.reject(failure)
    };

    const result = await new ComparePapersTool(brokenAnalysis).execute({
      aspect: "tool use",
      paperIds: ["2210.03629", "2302.04761"]
    });

    expect(result).toEqual({
      error: { code: "TOOL_EXECUTION_FAILED", message: "LLM endpoint timed out" },
      ok: false
    });
  });
});

