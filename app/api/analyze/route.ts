import { getGraph } from "@/lib/agent/graph"
import { getRepoMetadata } from "@/lib/github/repository"
import { GitHubError } from "@/lib/github/repository"
import type { ProgressEvent } from "@/types/plan"
import { parseGithubUrl } from "@/lib/utils/github"

export const runtime = "nodejs"
export const maxDuration = 300

function encodeSSE(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(req: Request) {
  const { repoUrl, task } = (await req.json()) as { repoUrl: string; task: string }

  if (!repoUrl || !task) {
    return new Response(
      JSON.stringify({ error: "repoUrl and task are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const parsed = parseGithubUrl(repoUrl)
  if (!parsed) {
    return new Response(
      JSON.stringify({ error: "Invalid GitHub repository URL. Expected: https://github.com/owner/repo" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const write = async (event: ProgressEvent) => {
    await writer.write(encoder.encode(encodeSSE(event)))
  }

  ;(async () => {
    try {
      let defaultBranch: string | undefined

      await write({ type: "progress", message: "Connecting to GitHub..." })

      try {
        const meta = await getRepoMetadata(parsed.owner, parsed.name)
        if (meta) {
          defaultBranch = meta.defaultBranch
          await write({
            type: "progress",
            message: `✓ Repository found: ${parsed.owner}/${parsed.name} (${meta.language || "unknown language"})`,
          })
        }
      } catch (err) {
        if (err instanceof GitHubError) {
          await write({ type: "error", message: err.message })
          await writer.close()
          return
        }
        throw err
      }

      const graph = getGraph()

      const initialState = {
        repo: {
          owner: parsed.owner,
          name: parsed.name,
          defaultBranch,
        },
        task,
      }

      const stream = await graph.stream(initialState, {
        streamMode: "updates",
      })

      type NodeUpdate = {
        progressEvents?: string[]
        finalPlan?: import("@/types/plan").ImplementationPlan
      }

      let finalPlan: import("@/types/plan").ImplementationPlan | undefined

      for await (const update of stream) {
        const updateRecord = update as Record<string, NodeUpdate>
        const nodeName = Object.keys(updateRecord)[0]
        const nodeUpdate = updateRecord[nodeName] as NodeUpdate

        if (nodeName === "finalize_plan" && nodeUpdate?.finalPlan) {
          finalPlan = nodeUpdate.finalPlan
        }

        if (nodeUpdate?.progressEvents?.length) {
          for (const msg of nodeUpdate.progressEvents) {
            await write({ type: "progress", message: msg })
          }
        }

        const nodeMessages: Record<string, string> = {
          understand_task: "Understanding task requirements...",
          explore_repository: "Exploring repository...",
          analyze_context: "Analyzing codebase architecture...",
          generate_plan: "Generating implementation plan...",
          critique_plan: "Reviewing plan quality...",
          finalize_plan: "Finalizing plan...",
        }
        if (nodeMessages[nodeName]) {
          await write({ type: "progress", message: nodeMessages[nodeName] })
        }
      }

      if (finalPlan) {
        await write({ type: "complete", plan: finalPlan })
      } else {
        await write({ type: "error", message: "No plan was generated. Please try again." })
      }
    } catch (err) {
      const message =
        err instanceof GitHubError
          ? err.message
          : err instanceof Error
          ? `Unexpected error: ${err.message}`
          : "An unknown error occurred"

      await write({ type: "error", message })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
