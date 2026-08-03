import { StateGraph, START, END } from "@langchain/langgraph"
import { RepoPlanAnnotation, type RepoPlanState } from "./state"
import { understandTask } from "./nodes/understandTask"
import { exploreRepository } from "./nodes/exploreRepository"
import { analyzeContext } from "./nodes/analyzeContext"
import { generatePlan } from "./nodes/generatePlan"
import { critiquePlan } from "./nodes/critiquePlan"
import { finalizePlan } from "./nodes/finalizePlan"

const MAX_ITERATIONS = 3

function routeAfterCritique(
  state: RepoPlanState
): "finalize_plan" | "explore_repository" {
  const { critique, iteration } = state

  if (!critique || critique.approved || iteration >= MAX_ITERATIONS) {
    return "finalize_plan"
  }

  return "explore_repository"
}

export function buildGraph() {
  const graph = new StateGraph(RepoPlanAnnotation)
    .addNode("understand_task", understandTask)
    .addNode("explore_repository", exploreRepository)
    .addNode("analyze_context", analyzeContext)
    .addNode("generate_plan", generatePlan)
    .addNode("critique_plan", critiquePlan)
    .addNode("finalize_plan", finalizePlan)
    .addEdge(START, "understand_task")
    .addEdge("understand_task", "explore_repository")
    .addEdge("explore_repository", "analyze_context")
    .addEdge("analyze_context", "generate_plan")
    .addEdge("generate_plan", "critique_plan")
    .addConditionalEdges("critique_plan", routeAfterCritique, {
      finalize_plan: "finalize_plan",
      explore_repository: "explore_repository",
    })
    .addEdge("finalize_plan", END)

  return graph.compile()
}

let _graph: ReturnType<typeof buildGraph> | null = null

export function getGraph() {
  if (!_graph) {
    _graph = buildGraph()
  }
  return _graph
}
