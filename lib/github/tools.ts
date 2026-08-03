import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import {
  getRepositoryTree,
  readFile,
  searchCode,
  getPackageInfo,
  getIssue,
} from "./repository"

export function createGithubTools(owner: string, repo: string, branch?: string) {
  const getRepositoryTreeTool = new DynamicStructuredTool({
    name: "get_repository_tree",
    description:
      "Get the file and directory structure of the repository. " +
      "Optionally specify a directory path to see only that subtree. " +
      "Use this first to understand the project layout.",
    schema: z.object({
      dirPath: z
        .string()
        .optional()
        .describe(
          "Optional directory path to explore (e.g. 'src/routes'). " +
          "Leave empty for the full top-level tree."
        ),
    }),
    func: async ({ dirPath }) => {
      const entries = await getRepositoryTree(owner, repo, branch, dirPath)
      if (!entries.length) return "No files found at that path."
      return entries
        .map((e) => `${e.type === "tree" ? "📁" : "📄"} ${e.path}`)
        .join("\n")
    },
  })

  const readFileTool = new DynamicStructuredTool({
    name: "read_file",
    description:
      "Read the full contents of a specific file in the repository. " +
      "Use this after you have identified a relevant file path.",
    schema: z.object({
      path: z.string().describe("The file path relative to the repository root, e.g. 'src/routes/auth.ts'"),
    }),
    func: async ({ path }) => {
      const content = await readFile(owner, repo, path, branch)
      if (!content) return `File not found: ${path}`
      return `=== ${path} ===\n${content}`
    },
  })

  const searchCodeTool = new DynamicStructuredTool({
    name: "search_code",
    description:
      "Search for a keyword or phrase in the repository source code. " +
      "Returns matching file paths and short snippets. " +
      "Use this to locate files relevant to the task.",
    schema: z.object({
      query: z
        .string()
        .describe("The keyword or phrase to search for, e.g. 'login', 'redis', 'middleware'"),
    }),
    func: async ({ query }) => {
      const results = await searchCode(owner, repo, query)
      if (!results.length) return `No results found for: "${query}"`
      return results
        .map((r) => `📄 ${r.path}${r.snippet ? `\n   ${r.snippet.slice(0, 200)}` : ""}`)
        .join("\n\n")
    },
  })

  const getPackageInfoTool = new DynamicStructuredTool({
    name: "get_package_info",
    description:
      "Read the project's dependency manifest (package.json, requirements.txt, Cargo.toml, etc.). " +
      "Use this to understand what libraries are already installed.",
    schema: z.object({}),
    func: async () => {
      const info = await getPackageInfo(owner, repo, branch)
      if (!info) return "No package manifest found in this repository."
      return `=== ${info.filename} ===\n${info.content}`
    },
  })

  const getIssueTool = new DynamicStructuredTool({
    name: "get_issue",
    description:
      "Fetch a GitHub issue by its number to get the full title and description.",
    schema: z.object({
      issueNumber: z.number().describe("The GitHub issue number, e.g. 42"),
    }),
    func: async ({ issueNumber }) => {
      const issue = await getIssue(owner, repo, issueNumber)
      if (!issue) return `Issue #${issueNumber} not found.`
      return [
        `Title: ${issue.title}`,
        `State: ${issue.state}`,
        `Labels: ${issue.labels.join(", ") || "none"}`,
        `\n${issue.body}`,
      ].join("\n")
    },
  })

  return [
    getRepositoryTreeTool,
    readFileTool,
    searchCodeTool,
    getPackageInfoTool,
    getIssueTool,
  ]
}
