import { z } from "zod"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getStructuredLLM } from "@/lib/llm/client"
import type { RepoPlanState } from "../state"

const AnalysisResultSchema = z.object({
  findings: z
    .array(z.string())
    .describe(
      "List of specific findings grounded in actual file contents. " +
      "Each finding should reference a specific file. " +
      "Mark anything not directly verified as UNCERTAIN."
    ),
})

export async function analyzeContext(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { taskAnalysis, inspectedFiles, searches, repo } = state

  const filesSummary = inspectedFiles
    .map(
      (f) =>
        `### ${f.path}\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? "\n...(truncated)" : ""}`
    )
    .join("\n\n")

  const searchSummary = searches
    .map(
      (s) =>
        `Search: "${s.query}" → ${
          s.results.length > 0
            ? s.results.map((r) => r.path).join(", ")
            : "no results"
        }`
    )
    .join("\n")

  const llm = getStructuredLLM(AnalysisResultSchema)

  const result = await llm.invoke([
    new SystemMessage(
      "You are a senior software engineer analyzing a codebase. " +
      "Based ONLY on the files you have actually read, identify concrete architectural patterns, " +
      "data flows, module relationships, and conventions relevant to the task. " +
      "Do NOT invent or assume anything not present in the provided files. " +
      "Mark any assumption as UNCERTAIN."
    ),
    new HumanMessage(
      [
        `Repository: ${repo.owner}/${repo.name}`,
        `Task: ${taskAnalysis?.objective ?? "See original task"}`,
        "",
        "=== Search Results ===",
        searchSummary || "No searches performed",
        "",
        "=== Inspected Files ===",
        filesSummary || "No files inspected",
        "",
        "Based on the above, provide specific findings about:",
        "- Existing architecture relevant to the task",
        "- Relevant modules, routes, controllers, services",
        "- Data flow and request handling patterns",
        "- Existing dependencies that can be reused",
        "- Code conventions (error handling, middleware patterns, etc.)",
        "- Files that will likely need modification",
        "- Tests that exist and will need updating",
        "- Any gaps or uncertainties",
      ].join("\n")
    ),
  ])

  return {
    findings: result.findings,
    progressEvents: [
      `✓ Architecture analyzed — ${result.findings.length} findings`,
    ],
  }
}
