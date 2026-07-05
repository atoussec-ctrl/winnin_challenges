import { describe, expect, it, vi } from "vitest";
import type { LlmPort } from "./llm.port";
import { LlmAnalysisModel } from "./llm-analysis-model";

function fakeLlm(content: string) {
  return { complete: vi.fn<LlmPort["complete"]>().mockResolvedValue({ content }) };
}

describe("LlmAnalysisModel", () => {
  it("asks the LLM to compare papers and echoes the requested paper ids", async () => {
    const llm = fakeLlm("Paper A focuses on X, paper B on Y.");
    const model = new LlmAnalysisModel(llm);

    const result = await model.comparePapers({
      aspect: "training data size",
      paperIds: ["1706.03762", "1810.04805"]
    });

    expect(result).toEqual({
      content: "Paper A focuses on X, paper B on Y.",
      paperIds: ["1706.03762", "1810.04805"]
    });
    expect(llm.complete).toHaveBeenCalledTimes(1);
    const [{ messages }] = llm.complete.mock.calls[0]!;
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[1]?.content).toContain("1706.03762, 1810.04805");
  });

  it("asks the LLM to summarize a single paper", async () => {
    const llm = fakeLlm("- point one\n- point two");
    const model = new LlmAnalysisModel(llm);

    const result = await model.summarize({ maxBulletPoints: 2, paperId: "1706.03762" });

    expect(result).toEqual({ content: "- point one\n- point two", paperIds: ["1706.03762"] });
  });

  it("asks the LLM to rank papers by a given criterion", async () => {
    const llm = fakeLlm("1. paper A\n2. paper B");
    const model = new LlmAnalysisModel(llm);

    const result = await model.rankPapers({
      criterion: "citation count",
      paperIds: ["1706.03762", "1810.04805"]
    });

    expect(result).toEqual({
      content: "1. paper A\n2. paper B",
      paperIds: ["1706.03762", "1810.04805"]
    });
  });
});
