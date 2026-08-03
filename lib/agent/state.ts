import { Annotation } from "@langchain/langgraph"
import type {
  TaskAnalysis,
  SearchEntry,
  InspectedFile,
  ImplementationPlan,
  Critique,
  RepoInfo,
} from "@/types/plan"

export const RepoPlanAnnotation = Annotation.Root({
  repo: Annotation<RepoInfo>(),
  task: Annotation<string>(),

  taskAnalysis: Annotation<TaskAnalysis | undefined>({
    reducer: (_, b) => b,
    default: () => undefined,
  }),

  searches: Annotation<SearchEntry[]>({
    reducer: (existing, updates) => [...existing, ...updates],
    default: () => [],
  }),

  inspectedFiles: Annotation<InspectedFile[]>({
    reducer: (existing, updates) => {
      const map = new Map(existing.map((f) => [f.path, f]))
      for (const f of updates) map.set(f.path, f)
      return Array.from(map.values())
    },
    default: () => [],
  }),

  findings: Annotation<string[]>({
    reducer: (existing, updates) => [...existing, ...updates],
    default: () => [],
  }),

  draftPlan: Annotation<ImplementationPlan | undefined>({
    reducer: (_, b) => b,
    default: () => undefined,
  }),

  critique: Annotation<Critique | undefined>({
    reducer: (_, b) => b,
    default: () => undefined,
  }),

  iteration: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  finalPlan: Annotation<ImplementationPlan | undefined>({
    reducer: (_, b) => b,
    default: () => undefined,
  }),

  progressEvents: Annotation<string[]>({
    reducer: (existing, updates) => [...existing, ...updates],
    default: () => [],
  }),
})

export type RepoPlanState = typeof RepoPlanAnnotation.State
