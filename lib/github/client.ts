import { Octokit } from "@octokit/rest"

let _octokit: Octokit | null = null

export function getOctokit(): Octokit {
  if (!_octokit) {
    _octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: "RepoPlan/1.0.0",
    })
  }
  return _octokit
}

export function hasGithubToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN)
}
