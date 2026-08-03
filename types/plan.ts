export interface TaskAnalysis {
  objective: string
  requirements: string[]
  keywords: string[]
}

export interface SearchResult {
  path: string
  snippet: string
}

export interface SearchEntry {
  query: string
  results: SearchResult[]
}

export interface InspectedFile {
  path: string
  content: string
  reason: string
}

export interface AffectedFile {
  path: string
  action: "modify" | "create" | "delete"
  reason: string
  changes: string[]
}

export interface ImplementationStep {
  order: number
  title: string
  description: string
  files: string[]
}

export interface Risk {
  risk: string
  mitigation: string
}

export interface ImplementationPlan {
  summary: string
  architecture: string
  affectedFiles: AffectedFile[]
  steps: ImplementationStep[]
  tests: string[]
  risks: Risk[]
  uncertainties: string[]
}

export interface Critique {
  approved: boolean
  missingInformation: string[]
  feedback: string
}

export interface RepoInfo {
  owner: string
  name: string
  defaultBranch?: string
}

export type ProgressEvent =
  | { type: "progress"; message: string }
  | { type: "complete"; plan: ImplementationPlan }
  | { type: "error"; message: string }
