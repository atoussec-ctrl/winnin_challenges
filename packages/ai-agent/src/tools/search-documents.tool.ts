import { objectSchema } from "../contracts/json-schema";
import type { DocumentChunk, PaperId } from "../contracts/paper";
import { toolError, type ToolResult } from "../contracts/tool-result";
import { runTool, type AgentTool } from "./base-tool";

export interface SearchDocumentsInput {
  readonly query: string;
  readonly limit?: number;
  readonly paperIds?: readonly PaperId[];
}

export interface SearchDocumentsOutput {
  readonly matches: readonly DocumentChunk[];
}

export interface VectorSearchPort {
  search(input: Required<Pick<SearchDocumentsInput, "limit" | "query">> & Pick<SearchDocumentsInput, "paperIds">): Promise<readonly DocumentChunk[]>;
}

export class SearchDocumentsTool
  implements AgentTool<SearchDocumentsInput, SearchDocumentsOutput>
{
  public readonly name = "search_documents";
  public readonly description =
    "Busca semantica na base vetorial pelos chunks mais relevantes dado uma query.";
  public readonly inputSchema = objectSchema(
    {
      limit: { minimum: 1, type: "integer" },
      paperIds: { items: { type: "string" }, type: "array" },
      query: { minLength: 1, type: "string" }
    },
    ["query"]
  );

  public constructor(private readonly vectorSearch: VectorSearchPort) {}

  public async execute(input: SearchDocumentsInput): Promise<ToolResult<SearchDocumentsOutput>> {
    if (input.query.trim().length === 0) {
      return toolError("INVALID_QUERY", "Query must not be empty.");
    }

    return runTool(
      async () => ({
        matches: await this.vectorSearch.search({
          limit: input.limit ?? 5,
          paperIds: input.paperIds,
          query: input.query
        })
      }),
      (output) => ({ count: output.matches.length })
    );
  }
}

