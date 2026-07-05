import { objectSchema } from "../contracts/json-schema";
import type { PaperId } from "../contracts/paper";
import { toolError, toolOk, type ToolResult } from "../contracts/tool-result";
import { runTool, type AgentTool } from "./base-tool";

export interface ExtractSectionInput {
  readonly paperId: PaperId;
  readonly sectionName: string;
}

export interface ExtractSectionOutput {
  readonly paperId: PaperId;
  readonly sectionName: string;
  readonly content: string;
}

export interface PaperSectionPort {
  extractSection(input: ExtractSectionInput): Promise<ExtractSectionOutput | null>;
}

export class ExtractSectionTool
  implements AgentTool<ExtractSectionInput, ExtractSectionOutput>
{
  public readonly name = "extract_section";
  public readonly description = "Extrai uma secao especifica de um paper.";
  public readonly inputSchema = objectSchema(
    {
      paperId: { type: "string" },
      sectionName: { minLength: 1, type: "string" }
    },
    ["paperId", "sectionName"]
  );

  public constructor(private readonly sections: PaperSectionPort) {}

  public async execute(input: ExtractSectionInput): Promise<ToolResult<ExtractSectionOutput>> {
    if (input.sectionName.trim().length === 0) {
      return toolError("INVALID_SECTION", "Section name must not be empty.");
    }

    const result = await runTool(() => this.sections.extractSection(input));

    if (!result.ok) {
      return result;
    }

    if (!result.data) {
      return toolError("SECTION_NOT_FOUND", "Requested section was not found.");
    }

    return toolOk(result.data);
  }
}

