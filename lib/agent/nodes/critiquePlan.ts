import { z } from "zod"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getStructuredLLM } from "@/lib/llm/client"
import type { RepoPlanState } from "../state"
import { MAX_ITERATIONS } from "../constants"

const CritiqueSchema = z.object({
  approved: z
    .boolean()
    .describe("True only if the plan is sufficiently grounded and complete"),
  missingInformation: z
    .array(z.string())
    .describe(
      "Specific things to look up in the repository if not approved. " +
      "Be precise — what exact file, function, or pattern needs to be verified?"
    ),
  feedback: z
    .string()
    .describe("Concise explanation of why the plan was or was not approved"),
})

export async function critiquePlan(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { draftPlan, inspectedFiles, task, iteration } = state

  if (!draftPlan) {
    return {
      critique: {
        approved: false,
        missingInformation: ["No plan was generated yet — need to explore the repository first"],
        feedback: "No draft plan exists",
      },
      progressEvents: ["✗ No plan to critique"],
    }
  }

  if (iteration >= MAX_ITERATIONS) {
    return {
      critique: {
        approved: true,
        missingInformation: [],
        feedback:
          "Maximum exploration iterations reached. Approving best available plan.",
      },
      progressEvents: [
        "⚠ Maximum iterations reached — approving best available plan",
      ],
    }
  }

  const inspectedPaths = inspectedFiles.map((f) => f.path)
  const referencedPaths = draftPlan.affectedFiles.map((f) => f.path)

  const llm = getStructuredLLM(CritiqueSchema)

  const result = await llm.invoke([
    new SystemMessage(
      "You are a strict senior code reviewer evaluating an AI-generated implementation plan. " +
      "Your job is to verify the plan is grounded in actual codebase evidence. " +
      "Be critical. Reject plans that make assumptions without evidence."
    ),
    new HumanMessage(
      [
        `Task: ${task}`,
        "",
        "=== Draft Implementation Plan ===",
        `Summary: ${draftPlan.summary}`,
        "",
        "Affected files:",
        draftPlan.affectedFiles
          .map((f) => `  ${f.action.toUpperCase()} ${f.path}: ${f.reason}`)
          .join("\n"),
        "",
        `Uncertainties listed: ${draftPlan.uncertainties.length}`,
        draftPlan.uncertainties.map((u) => `  - ${u}`).join("\n"),
        "",
        "=== Evidence Available ===",
        `Files actually inspected: ${inspectedPaths.join(", ") || "none"}`,
        `Files referenced in plan: ${referencedPaths.join(", ") || "none"}`,
        "",
        "=== Evaluation Checklist ===",
        "1. Are all referenced EXISTING files that are being MODIFIED actually in the inspected list?",
        "2. Does the plan match what was found in the codebase?",
        "3. Are important dependencies or integrations verified?",
        "4. Are tests considered in the plan?",
        "5. Are there unsupported assumptions about architecture?",
        "6. Is each proposed change clearly justified by evidence?",
        "",
        "If any existing file that the plan proposes to MODIFY was NOT inspected, reject the plan.",
        "If the plan invents files or functions not found, reject the plan.",
        "If tests are not considered, request test file inspection.",
      ].join("\n")
    ),
  ])

  const eventMsg = result.approved
    ? "✓ Plan approved by reviewer"
    : `✗ Reviewer requested more context: ${result.missingInformation.length} items`

  return {
    critique: result,
    progressEvents: [eventMsg],
  }
}
