import { describe, expect, it } from "vitest";
import { ComparePapersTool, RankPapersTool, SummarizeTool, type AnalysisModelPort } from "../tools/analysis-tools";
import { ExtractSectionTool, type PaperSectionPort } from "../tools/extract-section.tool";
import { SearchDocumentsTool, type VectorSearchPort } from "../tools/search-documents.tool";
import { AnalystAgent } from "./analyst-agent";
import { OrchestratorAgent } from "./orchestrator-agent";
import { RAGAgent } from "./rag-agent";

class FakeVectorSearch implements VectorSearchPort {
  public search() {
    return Promise.resolve([
      {
        chunkId: "chunk-1",
        content: "RAG combines retrieval with generation.",
        paperId: "2005.11401" as const,
        score: 0.9,
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
      }
    ]);
  }
}

class FakeSections implements PaperSectionPort {
  public extractSection() {
    return Promise.resolve({
      content: "Introduction",
      paperId: "1706.03762" as const,
      sectionName: "introduction"
    });
  }
}

class FakeAnalysis implements AnalysisModelPort {
  public comparePapers() {
    return Promise.resolve({
      content: "ReAct reasons and acts; Toolformer learns tool calls.",
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
      content: "ReAct is most relevant.",
      paperIds: ["2210.03629"] as const
    });
  }
}

function createAgent(): OrchestratorAgent {
  const analysis = new FakeAnalysis();

  return new OrchestratorAgent(
    new RAGAgent(new SearchDocumentsTool(new FakeVectorSearch()), new ExtractSectionTool(new FakeSections())),
    new AnalystAgent(
      new ComparePapersTool(analysis),
      new SummarizeTool(analysis),
      new RankPapersTool(analysis)
    )
  );
}

describe("OrchestratorAgent", () => {
  it("uses the RAG agent for retrieval questions", async () => {
    const answer = await createAgent().answer({
      content: "O que e RAG?",
      history: []
    });

    expect(answer.content).toContain("RAG combines retrieval");
    expect(answer.sources).toEqual([
      {
        chunkId: "chunk-1",
        paperId: "2005.11401",
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
      }
    ]);
  });

  it("returns tool errors from retrieval questions", async () => {
    const answer = await createAgent().answer({
      content: " ",
      history: []
    });

    expect(answer).toEqual({
      content: "Query must not be empty.",
      sources: []
    });
  });

  it("uses the analyst agent for comparison questions", async () => {
    const answer = await createAgent().answer({
      content: "Compare ReAct e Toolformer",
      history: []
    });

    expect(answer.content).toContain("ReAct reasons");
    expect(answer.sources.map((source) => source.paperId)).toEqual(["2210.03629", "2302.04761"]);
  });

  it("uses ranking for relevance questions", async () => {
    const answer = await createAgent().answer({
      content: "Qual paper e mais relevante para ferramentas externas?",
      history: []
    });

    expect(answer.content).toBe("ReAct is most relevant.");
    expect(answer.sources.map((source) => source.paperId)).toEqual(["2210.03629"]);
  });

  it("returns tool errors from comparison questions without sources", async () => {
    class FailingAnalysis extends FakeAnalysis {
      public override comparePapers(): Promise<never> {
        return Promise.reject(new Error("LLM endpoint timed out"));
      }
    }
    const analysis = new FailingAnalysis();
    const agent = new OrchestratorAgent(
      new RAGAgent(new SearchDocumentsTool(new FakeVectorSearch()), new ExtractSectionTool(new FakeSections())),
      new AnalystAgent(
        new ComparePapersTool(analysis),
        new SummarizeTool(analysis),
        new RankPapersTool(analysis)
      )
    );

    const answer = await agent.answer({ content: "Compare ReAct e Toolformer", history: [] });

    expect(answer).toEqual({ content: "LLM endpoint timed out", sources: [] });
  });

  it("returns tool errors from ranking questions without sources", async () => {
    class FailingAnalysis extends FakeAnalysis {
      public override rankPapers(): Promise<never> {
        return Promise.reject(new Error("LLM endpoint timed out"));
      }
    }
    const analysis = new FailingAnalysis();
    const agent = new OrchestratorAgent(
      new RAGAgent(new SearchDocumentsTool(new FakeVectorSearch()), new ExtractSectionTool(new FakeSections())),
      new AnalystAgent(
        new ComparePapersTool(analysis),
        new SummarizeTool(analysis),
        new RankPapersTool(analysis)
      )
    );

    const answer = await agent.answer({
      content: "Qual paper e mais relevante para ferramentas externas?",
      history: []
    });

    expect(answer).toEqual({ content: "LLM endpoint timed out", sources: [] });
  });
});
