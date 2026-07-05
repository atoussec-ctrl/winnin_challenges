import { objectSchema } from "../contracts/json-schema";
import type { PaperId } from "../contracts/paper";
import { toolError, type ToolResult } from "../contracts/tool-result";
import { runTool, type AgentTool } from "./base-tool";

export interface ComparePapersInput {
  readonly paperIds: readonly PaperId[];
  readonly aspect: string;
}

export interface SummarizeInput {
  readonly paperId: PaperId;
  readonly maxBulletPoints: number;
}

export interface RankPapersInput {
  readonly paperIds: readonly PaperId[];
  readonly criterion: string;
}

export interface StructuredAnalysis {
  readonly content: string;
  readonly paperIds: readonly PaperId[];
}

export interface AnalysisModelPort {
  comparePapers(input: ComparePapersInput): Promise<StructuredAnalysis>;
  summarize(input: SummarizeInput): Promise<StructuredAnalysis>;
  rankPapers(input: RankPapersInput): Promise<StructuredAnalysis>;
}

export class ComparePapersTool
  implements AgentTool<ComparePapersInput, StructuredAnalysis>
{
  public readonly name = "compare_papers";
  public readonly description = "Compara papers segundo um aspecto fornecido.";
  public readonly inputSchema = objectSchema(
    {
      aspect: { minLength: 1, type: "string" },
      paperIds: { items: { type: "string" }, minItems: 2, type: "array" }
    },
    ["paperIds", "aspect"]
  );

  public constructor(private readonly analysis: AnalysisModelPort) {}

  public async execute(input: ComparePapersInput): Promise<ToolResult<StructuredAnalysis>> {
    if (input.paperIds.length < 2) {
      return toolError("INVALID_COMPARISON", "At least two papers are required.");
    }

    return runTool(() => this.analysis.comparePapers(input));
  }
}

export class SummarizeTool implements AgentTool<SummarizeInput, StructuredAnalysis> {
  public readonly name = "summarize";
  public readonly description = "Gera resumo estruturado de um paper especifico.";
  public readonly inputSchema = objectSchema(
    {
      maxBulletPoints: { maximum: 5, minimum: 1, type: "integer" },
      paperId: { type: "string" }
    },
    ["paperId", "maxBulletPoints"]
  );

  public constructor(private readonly analysis: AnalysisModelPort) {}

  public async execute(input: SummarizeInput): Promise<ToolResult<StructuredAnalysis>> {
    if (input.maxBulletPoints < 1 || input.maxBulletPoints > 5) {
      return toolError("INVALID_SUMMARY_SIZE", "Summary must contain between 1 and 5 bullets.");
    }

    return runTool(() => this.analysis.summarize(input));
  }
}

export class RankPapersTool implements AgentTool<RankPapersInput, StructuredAnalysis> {
  public readonly name = "rank_papers";
  public readonly description = "Ranqueia papers segundo um criterio fornecido.";
  public readonly inputSchema = objectSchema(
    {
      criterion: { minLength: 1, type: "string" },
      paperIds: { items: { type: "string" }, minItems: 1, type: "array" }
    },
    ["paperIds", "criterion"]
  );

  public constructor(private readonly analysis: AnalysisModelPort) {}

  public async execute(input: RankPapersInput): Promise<ToolResult<StructuredAnalysis>> {
    if (input.criterion.trim().length === 0) {
      return toolError("INVALID_RANKING", "Ranking criterion must not be empty.");
    }

    return runTool(() => this.analysis.rankPapers(input));
  }
}

