import { z } from "zod"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getStructuredLLM } from "@/lib/llm/client"
import type { RepoPlanState } from "../state"

const FinalPlanSchema = z.object({
  summary: z.string(),
  architecture: z.string(),
  affectedFiles: z.array(
    z.object({
      path: z.string(),
      action: z.enum(["modify", "create", "delete"]),
      reason: z.string(),
      changes: z.array(z.string()),
    })
  ),
  steps: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      description: z.string(),
      files: z.array(z.string()),
    })
  ),
  tests: z.array(z.string()),
  risks: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string(),
    })
  ),
  uncertainties: z.array(z.string()),
})

export async function finalizePlan(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { draftPlan, critique, inspectedFiles, task } = state

  if (!draftPlan) {
    throw new Error("Cannot finalize: no draft plan exists")
  }

  const maxIterationsReached = state.iteration >= 3

  const llm = getStructuredLLM(FinalPlanSchema)

  const result = await llm.invoke([
    new SystemMessage(
      "You are finalizing an implementation plan. " +
      "Clean up the plan based on evidence from the repository. " +
      "Remove any claims not backed by inspected files. " +
      "Add file evidence where useful. " +
      "Do NOT add new information that wasn't found in the codebase."
    ),
    new HumanMessage(
      [
        `Task: ${task}`,
        "",
        "=== Draft Plan ===",
        JSON.stringify(draftPlan, null, 2),
        "",
        "=== Reviewer Feedback ===",
        critique
          ? [
              `Approved: ${critique.approved}`,
              `Feedback: ${critique.feedback}`,
              critique.missingInformation.length > 0
                ? `Missing info (could not be verified): ${critique.missingInformation.join("; ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : "No review feedback",
        "",
        "=== Evidence (Files Actually Inspected) ===",
        inspectedFiles
          .map((f) => `${f.path}: ${f.reason}`)
          .join("\n"),
        "",
        maxIterationsReached
          ? "NOTE: Maximum exploration iterations were reached. The uncertainties field must include any unresolved items from the reviewer."
          : "Produce the final polished plan.",
        "",
        "Ensure the plan:",
        "1. Only references existing files that were actually inspected",
        "2. Clearly justifies each file change",
        "3. Has a logical implementation order",
        "4. Lists all uncertainties honestly",
        "5. Includes specific test scenarios",
      ].join("\n")
    ),
  ])

  return {
    finalPlan: result,
    progressEvents: ["✓ Implementation plan finalized"],
  }
}
