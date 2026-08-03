import { z } from "zod"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getStructuredLLM } from "@/lib/llm/client"
import { getIssue } from "@/lib/github/repository"
import type { RepoPlanState } from "../state"
import { parseGithubIssueUrl } from "@/lib/utils/github"

const TaskAnalysisSchema = z.object({
  objective: z.string().describe("Clear one-sentence objective of the task"),
  requirements: z
    .array(z.string())
    .describe("List of specific requirements to investigate in the codebase"),
  keywords: z
    .array(z.string())
    .describe("Search keywords to find relevant files (function names, modules, patterns)"),
})

export async function understandTask(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { task, repo } = state
  let resolvedTask = task

  const parsedIssue = parseGithubIssueUrl(task)
  if (parsedIssue) {
    const issue = await getIssue(
      parsedIssue.owner,
      parsedIssue.repo,
      parsedIssue.issueNumber
    )
    if (issue) {
      resolvedTask = `Issue #${parsedIssue.issueNumber}: ${issue.title}\n\n${issue.body}`
    }
  }

  const llm = getStructuredLLM(TaskAnalysisSchema)

  const result = await llm.invoke([
    new SystemMessage(
      "You are a senior software engineer analyzing a task or feature request. " +
      "Break down the task into a structured analysis to guide codebase exploration. " +
      "Be specific about what to search for in the codebase."
    ),
    new HumanMessage(
      `Repository: ${repo.owner}/${repo.name}\n\n` +
      `Task:\n${resolvedTask}\n\n` +
      "Provide a structured analysis with:\n" +
      "- objective: what needs to be built/changed\n" +
      "- requirements: what aspects of the codebase to investigate\n" +
      "- keywords: specific terms to search for in code (function names, module names, patterns)"
    ),
  ])

  return {
    taskAnalysis: result,
    progressEvents: ["✓ Task understood and structured"],
  }
}
