import { z } from "zod"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getStructuredLLM } from "@/lib/llm/client"
import type { RepoPlanState } from "../state"

const AffectedFileSchema = z.object({
  path: z.string(),
  action: z.enum(["modify", "create", "delete"]),
  reason: z.string().describe("Why this file is affected, referencing actual content found"),
  changes: z.array(z.string()).describe("Specific changes to make in this file"),
})

const ImplementationStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  files: z.array(z.string()),
})

const RiskSchema = z.object({
  risk: z.string(),
  mitigation: z.string(),
})

const ImplementationPlanSchema = z.object({
  summary: z.string().describe("2-3 sentence summary of what will be implemented"),
  architecture: z
    .string()
    .describe(
      "Description of the existing architecture relevant to this change, " +
      "grounded in actual files found"
    ),
  affectedFiles: z.array(AffectedFileSchema),
  steps: z.array(ImplementationStepSchema),
  tests: z.array(z.string()).describe("Test cases that should be written or updated"),
  risks: z.array(RiskSchema),
  uncertainties: z
    .array(z.string())
    .describe("Things that could not be verified from the codebase"),
})

export async function generatePlan(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { taskAnalysis, findings, inspectedFiles, searches, repo, task } = state

  const filesSummary = inspectedFiles
    .map((f) => `File: ${f.path}\n${f.content.slice(0, 2000)}`)
    .join("\n\n---\n\n")

  const searchSummary = searches
    .map(
      (s) =>
        `"${s.query}": ${s.results.map((r) => r.path).join(", ") || "no results"}`
    )
    .join("\n")

  const findingsSummary = findings.join("\n")

  const llm = getStructuredLLM(ImplementationPlanSchema)

  const result = await llm.invoke([
    new SystemMessage(
      "You are a senior software engineer creating a detailed implementation plan. " +
      "Every claim in your plan must be backed by files you have actually read. " +
      "Do not invent file paths, functions, or patterns that were not found in the codebase. " +
      "If something is uncertain, put it in the uncertainties field."
    ),
    new HumanMessage(
      [
        `Repository: ${repo.owner}/${repo.name}`,
        `Task: ${task}`,
        `Objective: ${taskAnalysis?.objective ?? task}`,
        "",
        "=== Architectural Findings ===",
        findingsSummary || "No findings yet",
        "",
        "=== Search Results ===",
        searchSummary || "No searches",
        "",
        "=== Files Inspected ===",
        filesSummary || "No files inspected",
        "",
        "Generate a detailed, actionable implementation plan.",
        "For each affected file, explain WHY it needs to change based on what you found.",
        "Order the steps logically (dependencies first).",
        "Include specific test cases.",
        "Be honest about uncertainties.",
      ].join("\n")
    ),
  ])

  return {
    draftPlan: result,
    progressEvents: [
      `✓ Implementation plan generated (${result.affectedFiles.length} files affected)`,
    ],
  }
}
