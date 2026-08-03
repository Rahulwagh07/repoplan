"use client"

import { useState, useCallback, useRef } from "react"
import RepositoryForm from "@/components/RepositoryForm"
import AnalysisProgress from "@/components/AnalysisProgress"
import ImplementationPlanView from "@/components/ImplementationPlanView"
import type { ImplementationPlan, ProgressEvent } from "@/types/plan"
import { getShortRepoName } from "@/lib/utils/github"

type StateType = "idle" | "analyzing" | "complete" | "error"

export default function Home() {
  const [state, setState] = useState<StateType>("idle")
  const [events, setEvents] = useState<string[]>([])
  const [plan, setPlan] = useState<ImplementationPlan | null>(null)
  const [error, setError] = useState("")
  const [repo, setRepo] = useState("")
  const ref = useRef<StateType>("idle")

  const analyze = useCallback(async (repoUrl: string, task: string) => {
    ref.current = "analyzing"
    setState("analyzing")
    setEvents([])
    setPlan(null)
    setError("")
    setRepo(repoUrl)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, task }),
      })
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(e.error ?? "Request failed")
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data: "))
          if (!line) continue
          try {
            const ev: ProgressEvent = JSON.parse(line.slice(6))
            if (ev.type === "progress") setEvents((x) => [...x, ev.message])
            else if (ev.type === "complete") {
              setPlan(ev.plan)
              setEvents((x) => [...x, "✓ Plan ready"])
              ref.current = "complete"
              setState("complete")
            } else if (ev.type === "error") {
              setError(ev.message)
              setEvents((x) => [...x, `✗ ${ev.message}`])
              ref.current = "error"
              setState("error")
            }
          } catch {}
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error"
      setError(msg)
      setEvents((x) => [...x, `✗ ${msg}`])
      ref.current = "error"
      setState("error")
    }
  }, [])

  const reset = useCallback(() => {
    ref.current = "idle"
    setState("idle")
    setEvents([])
    setPlan(null)
    setError("")
    setRepo("")
  }, [])

  const shortRepo = getShortRepoName(repo)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[rgba(250,250,249,0.92)] backdrop-blur-[14px] border-b border-[var(--border)] h-[54px]">
        <div className="max-w-[1180px] mx-auto px-7 h-full flex items-center justify-between">
          <div className="flex items-center gap-[9px]">
            <div className="w-[26px] h-[26px] bg-[var(--black)] rounded-[7px] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2v8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-[0.92rem] tracking-[-0.02em] text-[var(--text-1)]">
              RepoPlan
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(state === "complete" || state === "error") && (
              <button
                type="button"
                className="btn btn-outline text-[0.78rem] px-[15px] py-[6px]"
                onClick={reset}
              >
                ← New analysis
              </button>
            )}
            <span className="pill">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
              GPT-4o · LangGraph
            </span>
          </div>
        </div>
      </nav>

      <main>
        {state === "idle" && (
          <>
            <section className="relative overflow-hidden bg-[var(--white)] border-b border-[var(--border)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 860 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute -right-5 top-1/2 -translate-y-1/2 w-[52%] max-w-[580px] opacity-[0.055] pointer-events-none select-none"
              >
                <defs>
                  <marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0 0L6 3L0 6z" fill="#0a0908"/>
                  </marker>
                </defs>
                <circle cx="40" cy="200" r="6" fill="#0a0908"/>
                <rect x="70" y="176" width="110" height="48" rx="6" stroke="#0a0908" strokeWidth="1.8"/>
                <text x="125" y="195" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">understand</text>
                <text x="125" y="208" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_task</text>
                <rect x="250" y="58" width="120" height="48" rx="6" stroke="#0a0908" strokeWidth="1.8"/>
                <text x="310" y="77" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">explore</text>
                <text x="310" y="90" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_repository</text>
                <rect x="250" y="176" width="120" height="48" rx="6" stroke="#0a0908" strokeWidth="1.8"/>
                <text x="310" y="195" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">analyze</text>
                <text x="310" y="208" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_context</text>
                <rect x="450" y="176" width="110" height="48" rx="6" stroke="#0a0908" strokeWidth="1.8"/>
                <text x="505" y="195" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">generate</text>
                <text x="505" y="208" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_plan</text>
                <rect x="640" y="176" width="110" height="48" rx="6" stroke="#0a0908" strokeWidth="1.8"/>
                <text x="695" y="195" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">critique</text>
                <text x="695" y="208" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_plan</text>
                <rect x="640" y="300" width="110" height="48" rx="6" stroke="#0a0908" strokeWidth="2.4"/>
                <text x="695" y="319" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">finalize</text>
                <text x="695" y="332" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#0a0908">_plan</text>
                <circle cx="814" cy="324" r="7" stroke="#0a0908" strokeWidth="1.8"/>
                <circle cx="814" cy="324" r="3.5" fill="#0a0908"/>
                <path d="M46 200H70" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M180 196Q215 196 215 82H250" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M310 106V176" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M370 200H450" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M560 200H640" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M695 224V300" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <text x="700" y="265" fontSize="7.5" fontFamily="monospace" fill="#0a0908">approved</text>
                <path d="M750 324H807" stroke="#0a0908" strokeWidth="1.2" markerEnd="url(#ah)"/>
                <path d="M640 212Q575 212 575 340Q575 382 310 382Q242 382 242 106"
                  stroke="#0a0908" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#ah)"/>
                <text x="400" y="372" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#0a0908">needs more context</text>
              </svg>

              <div className="max-w-[1120px] mx-auto py-20 px-10 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-[72px] items-center relative z-10">
                <div>
                  <p className="u-fade-up mono text-[0.68rem] text-[var(--text-4)] tracking-[0.1em] uppercase mb-[22px] [animation-delay:0ms]">
                    LangGraph · GitHub API · GPT-4o
                  </p>

                  <h1 className="u-fade-up font-extrabold tracking-[-0.04em] leading-[1.04] text-[var(--text-1)] mb-1.5 text-[clamp(2.6rem,4.5vw,4rem)] [animation-delay:40ms]">
                    GitHub issue to
                  </h1>
                  <h2 className="u-fade-up serif font-normal italic tracking-[-0.02em] leading-[1.1] text-[var(--text-3)] mb-[30px] text-[clamp(2.6rem,4.5vw,4rem)] [animation-delay:70ms]">
                    implementation plan
                  </h2>

                  <p className="u-fade-up text-[0.975rem] text-[var(--text-3)] leading-[1.8] mb-11 max-w-[400px] [animation-delay:110ms]">
                    An agent navigates your repo file-by-file, critiques its own plan,
                    and delivers an implementation guide grounded in code it actually read.
                  </p>

                  <div className="u-fade-up flex flex-col gap-[13px] [animation-delay:150ms]">
                    {[
                      { n: "01", t: "Explore",   d: "Reads files, searches code, navigates dirs via GitHub API tools." },
                      { n: "02", t: "Plan",       d: "Writes a structured plan grounded in what it actually found." },
                      { n: "03", t: "Critique",   d: "Rejects weak plans and loops back for more evidence." },
                    ].map(s => (
                      <div key={s.n} className="flex gap-4 items-start">
                        <span className="mono text-[0.62rem] text-[var(--text-4)] tracking-[0.06em] pt-1 shrink-0 w-5">
                          {s.n}
                        </span>
                        <p className="text-[0.875rem] text-[var(--text-2)] leading-[1.65] m-0">
                          <strong className="text-[var(--text-1)] font-semibold">{s.t} — </strong>{s.d}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="u-fade-up card-float p-[28px_30px] [animation-delay:190ms]">
                  <RepositoryForm onAnalyze={analyze} isLoading={false} />
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[var(--200)] via-20% to-transparent to-100% bg-[length:100%_1px] bg-no-repeat" />

              <div className="relative overflow-hidden py-[13px] bg-[var(--50)]">
                <div className="flex gap-[52px] animate-[marquee_30s_linear_infinite] w-max whitespace-nowrap">
                  {[
                    "expressjs/express","vercel/next.js","facebook/react","prisma/prisma",
                    "trpc/trpc","shadcn-ui/ui","supabase/supabase","lucia-auth/lucia",
                    "payloadcms/payload","withastro/astro","calcom/cal.com","t3-oss/create-t3-app",
                    "expressjs/express","vercel/next.js","facebook/react","prisma/prisma",
                    "trpc/trpc","shadcn-ui/ui","supabase/supabase","lucia-auth/lucia",
                  ].map((r, i) => (
                    <span key={i} className="mono text-[0.7rem] text-[var(--text-4)]">{r}</span>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--50)] from-0% via-transparent via-[8%] via-transparent via-[92%] to-[var(--50)] to-100% pointer-events-none" />
              </div>
            </section>
          </>
        )}

        {state !== "idle" && (
          <div className="max-w-[740px] mx-auto py-10 px-6 pb-20">
            <div className="u-fade-up mb-7 flex items-center gap-3">
              <span className={`w-[9px] h-[9px] rounded-full shrink-0 ${
                state === "error" ? "bg-[var(--fail)]" : state === "complete" ? "bg-[var(--ok)]" : "bg-[var(--black)]"
              } ${state === "analyzing" ? "u-blink" : ""}`} />
              <div>
                <h1 className="text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-1)]">
                  {state === "analyzing" && "Analyzing repository…"}
                  {state === "complete"  && "Implementation plan ready"}
                  {state === "error"     && "Analysis failed"}
                </h1>
                {shortRepo && (
                  <p className="mono text-[0.75rem] text-[var(--text-4)] mt-0.5">
                    {shortRepo}
                  </p>
                )}
              </div>
            </div>

            {state === "analyzing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                <div className="card-float p-[26px_30px]">
                  <RepositoryForm onAnalyze={analyze} isLoading={true} />
                </div>
                <AnalysisProgress events={events} isComplete={false} hasError={false} />
              </div>
            )}

            {state === "complete" && (
              <div className="flex flex-col gap-3">
                <AnalysisProgress events={events} isComplete={true} hasError={false} />
                {plan && <ImplementationPlanView plan={plan} repoUrl={repo} />}
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col gap-3">
                <AnalysisProgress events={events} isComplete={false} hasError={true} />
                {error && (
                  <div className="card p-[16px_20px] border-[var(--fail-line)] bg-[var(--fail-bg)]">
                    <p className="text-[0.875rem] text-[var(--fail)] m-0">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--white)]">
        <div className="max-w-[1180px] mx-auto py-2.5 px-7 flex justify-between text-[0.72rem] text-[var(--text-4)]">
          <span>RepoPlan — read-only codebase analysis</span>
          <span>Never modifies your repository</span>
        </div>
      </footer>
    </>
  )
}
