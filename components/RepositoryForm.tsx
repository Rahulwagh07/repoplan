"use client"

import { useState } from "react"

interface Props {
  onAnalyze: (repoUrl: string, task: string) => void
  isLoading: boolean
}

export default function RepositoryForm({ onAnalyze, isLoading }: Props) {
  const [url, setUrl] = useState("")
  const [task, setTask] = useState("")
  const [err, setErr] = useState("")

  const valid = (s: string) =>
    /^(https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/.test(s.trim())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!valid(url)) { setErr("Needs a valid GitHub URL — github.com/owner/repo"); return }
    if (!task.trim()) return
    onAnalyze(url.trim(), task.trim())
  }

  const labelClass = "block text-[0.7rem] font-bold tracking-[0.07em] uppercase text-[var(--text-4)] mb-[7px]"

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="repo" className={labelClass}>Repository</label>
        <input
          id="repo"
          className="input"
          type="text"
          placeholder="https://github.com/expressjs/express"
          value={url}
          onChange={e => { setUrl(e.target.value); setErr("") }}
          disabled={isLoading}
          autoComplete="off"
          spellCheck={false}
        />
        {err && <p className="mt-1.5 text-[0.78rem] text-[var(--fail)]">{err}</p>}
      </div>

      <div>
        <label htmlFor="task-input" className={labelClass}>Task / Issue</label>
        <textarea
          id="task-input"
          className="input resize-y leading-[1.7]"
          placeholder={"Describe the feature, or paste a GitHub issue URL.\n\nE.g. Add Redis-backed rate limiting to the login and signup endpoints."}
          value={task}
          onChange={e => setTask(e.target.value)}
          disabled={isLoading}
          rows={5}
        />
      </div>

      <div className="flex items-center gap-3">
        <p className="flex-1 text-[0.73rem] text-[var(--text-4)] leading-[1.55]">
          Set{" "}
          <code className="mono bg-[var(--150)] rounded-[3px] py-[1px] px-[5px]">
            GITHUB_TOKEN
          </code>{" "}
          in <code className="mono">.env.local</code> for code search to work.
        </p>

        <button
          id="analyze-btn"
          type="submit"
          className="btn btn-dark shrink-0"
          disabled={isLoading || !url.trim() || !task.trim()}
        >
          {isLoading
            ? <><span className="spin" /> Analyzing</>
            : <>Analyze →</>
          }
        </button>
      </div>
    </form>
  )
}
