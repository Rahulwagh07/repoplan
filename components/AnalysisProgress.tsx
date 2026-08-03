"use client"

import { useEffect, useRef } from "react"

interface Props { events: string[]; isComplete: boolean; hasError: boolean }

export default function AnalysisProgress({ events, isComplete, hasError }: Props) {
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [events.length])

  if (!events.length) return null

  return (
    <div className="card overflow-hidden">
      <div className="px-[18px] py-[11px] bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-[7px] h-[7px] rounded-full ${
              hasError ? "bg-[var(--fail)]" : isComplete ? "bg-[var(--ok)]" : "bg-[var(--black)]"
            } ${(!isComplete && !hasError) ? "u-blink" : ""}`}
          />
          <span className="mono text-[0.72rem] text-[var(--text-3)] tracking-[0.04em]">
            agent log
          </span>
        </div>
        <span
          className={`mono text-[0.65rem] tracking-[0.05em] uppercase ${
            hasError ? "text-[var(--fail)]" : isComplete ? "text-[var(--ok)]" : "text-[var(--text-4)]"
          }`}
        >
          {hasError ? "failed" : isComplete ? "done" : "running"}
        </span>
      </div>

      <div className="max-h-[290px] overflow-y-auto py-2.5 flex flex-col gap-0">
        {events.map((ev, i) => {
          const done    = ev.startsWith("✓")
          const fail    = ev.startsWith("✗")
          const warn    = ev.startsWith("⚠")
          const sub     = ev.startsWith("  ")
          const active  = i === events.length - 1 && !isComplete && !hasError
          const text    = (done || fail || warn) ? ev.slice(2).trim() : ev.trimStart()

          const textColor = fail ? "text-[var(--fail)]"
            : done ? "text-[var(--text-1)]"
            : warn ? "text-[var(--warn)]"
            : active ? "text-[var(--text-1)]"
            : sub ? "text-[var(--text-4)]"
            : "text-[var(--text-3)]"

          const dotColor = fail ? "bg-[var(--fail)]"
            : done ? "bg-[var(--ok)]"
            : active ? "bg-[var(--black)]"
            : "bg-[var(--300)]"

          return (
            <div
              key={i}
              className={`flex items-baseline gap-[9px] opacity-0 animate-[row-in_0.2s_ease_both] ${
                sub ? "px-[18px] py-[1px] pl-[38px]" : "px-[18px] py-[2px]"
              }`}
              style={{ animationDelay: `${Math.min(i * 12, 160)}ms` }}
            >
              {!sub && (
                <span
                  className={`w-[5px] h-[5px] rounded-full shrink-0 mt-[5px] ${dotColor} ${active ? "u-blink" : ""}`}
                />
              )}
              <span className={`mono text-[0.78rem] leading-[1.7] ${textColor} ${
                (done || active) ? "font-medium" : "font-normal"
              }`}>
                {text}
              </span>
            </div>
          )
        })}
        <div ref={end} />
      </div>
    </div>
  )
}
