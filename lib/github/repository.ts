import { getOctokit } from "./client"
import type { SearchResult } from "@/types/plan"

const MAX_FILE_SIZE_BYTES = 50 * 1024
const MAX_TREE_ENTRIES = 200
const MAX_SEARCH_RESULTS = 10

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "PRIVATE_REPO"
      | "RATE_LIMITED"
      | "TOO_LARGE"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

function handleOctokitError(err: unknown, context: string): never {
  const e = err as { status?: number; message?: string }
  if (e.status === 404) throw new GitHubError(`${context}: not found`, "NOT_FOUND")
  if (e.status === 403) {
    const msg = e.message ?? ""
    if (msg.includes("rate limit"))
      throw new GitHubError("GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limit.", "RATE_LIMITED")
    throw new GitHubError(`${context}: access denied (repository may be private)`, "PRIVATE_REPO")
  }
  if (e.status === 422) throw new GitHubError(`${context}: repository too large or query invalid`, "TOO_LARGE")
  throw new GitHubError(`${context}: ${e.message ?? "unknown error"}`, "UNKNOWN")
}

export interface TreeEntry {
  path: string
  type: "blob" | "tree"
  size?: number
}

export async function getRepositoryTree(
  owner: string,
  repo: string,
  branch?: string,
  dirPath?: string
): Promise<TreeEntry[]> {
  const octokit = getOctokit()

  try {
    let ref = branch
    if (!ref) {
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      ref = repoData.default_branch
    }

    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${ref}`,
    })

    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: "true",
    })

    let entries = (treeData.tree as TreeEntry[]).filter(
      (e) => e.path && (e.type === "blob" || e.type === "tree")
    )

    if (dirPath) {
      const prefix = dirPath.endsWith("/") ? dirPath : dirPath + "/"
      entries = entries.filter(
        (e) => e.path === dirPath || e.path?.startsWith(prefix)
      )
    } else {
      entries = entries.slice(0, MAX_TREE_ENTRIES)
    }

    return entries
  } catch (err) {
    handleOctokitError(err, `getRepositoryTree(${owner}/${repo})`)
  }
}

export async function readFile(
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<string | null> {
  const octokit = getOctokit()

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    if (Array.isArray(data)) {
      return null
    }

    const file = data as { type: string; size: number; content?: string; encoding?: string }

    if (file.type !== "file") return null
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `[File too large to display: ${file.size} bytes — max ${MAX_FILE_SIZE_BYTES} bytes]`
    }

    if (file.content && file.encoding === "base64") {
      return Buffer.from(file.content, "base64").toString("utf-8")
    }

    return null
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) return null
    handleOctokitError(err, `readFile(${path})`)
  }
}

export async function searchCode(
  owner: string,
  repo: string,
  query: string
): Promise<SearchResult[]> {
  const octokit = getOctokit()

  try {
    const { data } = await octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
      per_page: MAX_SEARCH_RESULTS,
    })

    return data.items.map((item) => ({
      path: item.path,
      snippet: item.text_matches?.[0]?.fragment ?? "",
    }))
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status === 403 || e.status === 422) {
      return []
    }
    handleOctokitError(err, `searchCode("${query}")`)
  }
}

const PACKAGE_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
]

export async function getPackageInfo(
  owner: string,
  repo: string,
  branch?: string
): Promise<{ filename: string; content: string } | null> {
  for (const filename of PACKAGE_FILES) {
    const content = await readFile(owner, repo, filename, branch)
    if (content) {
      return { filename, content }
    }
  }
  return null
}

export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{ title: string; body: string; labels: string[]; state: string } | null> {
  const octokit = getOctokit()

  try {
    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })

    return {
      title: data.title,
      body: data.body ?? "",
      labels: data.labels
        .map((l) => (typeof l === "string" ? l : l.name ?? ""))
        .filter(Boolean),
      state: data.state,
    }
  } catch (err) {
    const e = err as { status?: number }
    if (e.status === 404) return null
    handleOctokitError(err, `getIssue(${owner}/${repo}#${issueNumber})`)
  }
}

export async function getRepoMetadata(
  owner: string,
  repo: string
): Promise<{ defaultBranch: string; description: string; language: string } | null> {
  const octokit = getOctokit()

  try {
    const { data } = await octokit.repos.get({ owner, repo })
    return {
      defaultBranch: data.default_branch,
      description: data.description ?? "",
      language: data.language ?? "",
    }
  } catch (err) {
    handleOctokitError(err, `getRepoMetadata(${owner}/${repo})`)
  }
}
