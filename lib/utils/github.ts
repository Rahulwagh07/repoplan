export const GITHUB_REPO_URL_REGEX =
  /^(?:https?:\/\/)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/

export const GITHUB_VALID_REPO_REGEX =
  /^(?:https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/

export const GITHUB_URL_PREFIX_REGEX = /^https?:\/\/github\.com\//

export const GITHUB_ISSUE_URL_REGEX =
  /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/

export function isValidGithubUrl(url: string): boolean {
  return GITHUB_VALID_REPO_REGEX.test(url.trim())
}

export function parseGithubUrl(url: string): { owner: string; name: string } | null {
  const match = url.trim().match(GITHUB_REPO_URL_REGEX)
  if (!match) return null
  return { owner: match[1], name: match[2] }
}

export function getShortRepoName(url: string): string {
  return url.replace(GITHUB_URL_PREFIX_REGEX, "")
}

export function parseGithubIssueUrl(
  url: string
): { owner: string; repo: string; issueNumber: number } | null {
  const match = url.match(GITHUB_ISSUE_URL_REGEX)
  if (!match) return null
  const [, owner, repo, issueNum] = match
  return {
    owner,
    repo,
    issueNumber: parseInt(issueNum, 10),
  }
}
