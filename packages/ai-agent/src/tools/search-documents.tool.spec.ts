import { describe, expect, it } from "vitest";
import type { DocumentChunk } from "../contracts/paper";
import { SearchDocumentsTool, type VectorSearchPort } from "./search-documents.tool";

class FakeVectorSearch implements VectorSearchPort {
  public lastQuery: string | null = null;

  public search(input: Parameters<VectorSearchPort["search"]>[0]): Promise<readonly DocumentChunk[]> {
    this.lastQuery = input.query;
    return Promise.resolve([
      {
        chunkId: "chunk-1",
        content: "Attention replaces recurrence with self-attention.",
        paperId: "1706.03762",
        score: 0.92,
        title: "Attention Is All You Need"
      }
    ]);
  }
}

describe("SearchDocumentsTool", () => {
  it("delegates semantic search to the vector port", async () => {
    const vectorSearch = new FakeVectorSearch();
    const tool = new SearchDocumentsTool(vectorSearch);

    const result = await tool.execute({ query: "attention mechanism" });

    expect(result.ok).toBe(true);
    expect(vectorSearch.lastQuery).toBe("attention mechanism");
    if (result.ok) {
      expect(result.data.matches).toHaveLength(1);
      expect(result.metadata?.count).toBe(1);
    }
  });

  it("rejects empty queries before calling the vector port", async () => {
    const vectorSearch = new FakeVectorSearch();
    const tool = new SearchDocumentsTool(vectorSearch);

    const result = await tool.execute({ query: "   " });

    expect(result.ok).toBe(false);
    expect(vectorSearch.lastQuery).toBeNull();
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_QUERY");
    }
  });

  it("turns a rejected vector search call into a ToolResult error instead of throwing", async () => {
    const failure = new Error("vector store is unreachable");
    const brokenSearch: VectorSearchPort = { search: () => Promise.reject(failure) };
    const tool = new SearchDocumentsTool(brokenSearch);

    const result = await tool.execute({ query: "attention mechanism" });

    expect(result).toEqual({
      error: { code: "TOOL_EXECUTION_FAILED", message: "vector store is unreachable" },
      ok: false
    });
  });
});
