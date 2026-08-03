import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages"
import type { BaseMessage } from "@langchain/core/messages"
import type { StructuredToolInterface } from "@langchain/core/tools"
import { getLLM } from "@/lib/llm/client"
import { createGithubTools } from "@/lib/github/tools"
import type { RepoPlanState } from "../state"
import type { SearchEntry, InspectedFile } from "@/types/plan"

const MAX_TOOL_CALLS = 15

export async function exploreRepository(
  state: RepoPlanState
): Promise<Partial<RepoPlanState>> {
  const { repo, taskAnalysis, critique, iteration } = state

  const tools = createGithubTools(repo.owner, repo.name, repo.defaultBranch)
  const llm = getLLM().bindTools(tools)
  const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
    tools.map((t) => [t.name, t])
  )

  const newSearches: SearchEntry[] = []
  const newInspectedFiles: InspectedFile[] = []
  const progressEvents: string[] = []

  const systemPrompt = [
    "You are a senior software engineer exploring an unfamiliar codebase to plan a feature implementation.",
    "Use the available tools to navigate the repository. Be systematic and purposeful.",
    "For every file you read, you must have a clear reason.",
    "Typical exploration strategy:",
    "  1. Get the repository tree to understand the structure",
    "  2. Search for keywords related to the task",
    "  3. Read the most relevant files (routes, controllers, services)",
    "  4. Check dependencies (package.json)",
    "  5. Look for existing tests",
    "  6. Follow imports to understand the architecture",
    "",
    "Track what you learn. Stop when you have enough context to plan the implementation.",
    `You can make at most ${MAX_TOOL_CALLS} tool calls.`,
  ].join("\n")

  const userPromptParts = [
    `Repository: ${repo.owner}/${repo.name}`,
    `\nTask: ${taskAnalysis?.objective ?? state.task}`,
  ]

  if (taskAnalysis?.keywords.length) {
    userPromptParts.push(`\nSearch keywords: ${taskAnalysis.keywords.join(", ")}`)
  }

  if (critique && !critique.approved && iteration > 0) {
    userPromptParts.push(
      "\n\n--- PREVIOUS EXPLORATION WAS INSUFFICIENT ---",
      "Reviewer feedback: " + critique.feedback,
      "Missing information to find:",
      ...critique.missingInformation.map((m) => `  - ${m}`)
    )
  }

  if (state.inspectedFiles.length > 0) {
    userPromptParts.push(
      `\nAlready inspected: ${state.inspectedFiles.map((f) => f.path).join(", ")}`
    )
  }

  userPromptParts.push("\n\nBegin exploring the repository now.")

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPromptParts.join("\n")),
  ]

  let toolCallCount = 0

  while (toolCallCount < MAX_TOOL_CALLS) {
    const response = await llm.invoke(messages)
    messages.push(response as AIMessage)

    if (!response.tool_calls || response.tool_calls.length === 0) {
      break
    }

    for (const toolCall of response.tool_calls) {
      toolCallCount++

      const tool = toolsByName[toolCall.name]
      if (!tool) continue

      const progressMsg = buildProgressMessage(toolCall.name, toolCall.args)
      progressEvents.push(progressMsg)

      let toolResult: string
      try {
        const res = await tool.invoke(toolCall.args)
        toolResult = typeof res === "string" ? res : JSON.stringify(res)
      } catch (err) {
        toolResult = `Error: ${err instanceof Error ? err.message : String(err)}`
      }

      messages.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id ?? toolCall.name,
        })
      )

      if (toolCall.name === "search_code") {
        const query = toolCall.args.query as string
        const results = parseSearchResults(toolResult)
        newSearches.push({ query, results })
        if (results.length > 0) {
          progressEvents.push(`  Found ${results.length} result(s) for "${query}"`)
        }
      } else if (toolCall.name === "read_file") {
        const path = toolCall.args.path as string
        if (!toolResult.startsWith("File not found")) {
          const reason = extractReasonFromMessages(messages)
          newInspectedFiles.push({
            path,
            content: toolResult,
            reason,
          })
        }
      }

      if (toolCallCount >= MAX_TOOL_CALLS) break
    }
  }

  progressEvents.push(
    `✓ Repository exploration complete (${toolCallCount} tool calls, ${newInspectedFiles.length} files read)`
  )

  return {
    searches: newSearches,
    inspectedFiles: newInspectedFiles,
    iteration: iteration + 1,
    progressEvents,
  }
}

function buildProgressMessage(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "get_repository_tree":
      return args.dirPath
        ? `  Exploring directory: ${args.dirPath}`
        : "  Mapping repository structure..."
    case "read_file":
      return `  Reading ${args.path}`
    case "search_code":
      return `  Searching for "${args.query}"...`
    case "get_package_info":
      return "  Reading package manifest..."
    case "get_issue":
      return `  Fetching issue #${args.issueNumber}...`
    default:
      return `  Running ${toolName}...`
  }
}

function parseSearchResults(
  toolResult: string
): Array<{ path: string; snippet: string }> {
  const lines = toolResult.split("\n")
  const results: Array<{ path: string; snippet: string }> = []
  let currentPath = ""
  let currentSnippet = ""

  for (const line of lines) {
    if (line.startsWith("📄 ")) {
      if (currentPath) results.push({ path: currentPath, snippet: currentSnippet.trim() })
      currentPath = line.slice(3).trim()
      currentSnippet = ""
    } else if (line.startsWith("   ") && currentPath) {
      currentSnippet += line.trim() + " "
    }
  }
  if (currentPath) results.push({ path: currentPath, snippet: currentSnippet.trim() })

  return results
}

function extractReasonFromMessages(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg instanceof AIMessage && typeof msg.content === "string" && msg.content.trim()) {
      return msg.content.slice(0, 200)
    }
  }
  return "Identified as relevant during exploration"
}
