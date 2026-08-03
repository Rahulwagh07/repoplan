"use client"

import { useState } from "react"
import type { ImplementationPlan, AffectedFile } from "@/types/plan"

interface Props { plan: ImplementationPlan; repoUrl: string }

export default function ImplementationPlanView({ plan, repoUrl }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (p: string) => setOpen(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n })
  const short = repoUrl.replace(/^https?:\/\/github\.com\//, "")

  return (
    <div className="u-fade-in flex flex-col gap-2.5">
      <div className="card p-[26px_30px]">
        <div className="flex items-center gap-2 mb-4">
          <span className="mono text-[0.68rem] text-[var(--text-4)] tracking-[0.06em] uppercase">
            Implementation Plan
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[var(--300)]" />
          <span className="mono text-[0.7rem] text-[var(--text-4)]">{short}</span>
          <div className="ml-auto flex gap-1.5">
            <Chip>{plan.affectedFiles.length} files</Chip>
            <Chip>{plan.steps.length} steps</Chip>
          </div>
        </div>

        <div className="h-px bg-[var(--border)] mb-[18px]" />

        <p className="text-[1rem] leading-[1.8] text-[var(--text-1)] m-0">
          {plan.summary}
        </p>
      </div>

      {plan.architecture && (
        <Sec label="Architecture">
          <p className="text-[0.875rem] text-[var(--text-2)] leading-[1.85] m-0 whitespace-pre-wrap">
            {plan.architecture}
          </p>
        </Sec>
      )}

      <Sec label="Files" count={plan.affectedFiles.length}>
        <div className="flex flex-col gap-[5px]">
          {plan.affectedFiles.map(f => (
            <FileRow key={f.path} file={f} isOpen={open.has(f.path)} onToggle={() => toggle(f.path)} />
          ))}
        </div>
      </Sec>

      <Sec label="Implementation Order" count={plan.steps.length}>
        {plan.steps.map((step, i) => (
          <div key={step.order} className={`flex gap-3.5 ${i < plan.steps.length - 1 ? "pb-[22px]" : "pb-0"}`}>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-[26px] h-[26px] rounded-full border border-[var(--border-mid)] bg-[var(--bg-raised)] flex items-center justify-center text-[0.68rem] font-bold text-[var(--text-3)] shrink-0">
                {step.order}
              </div>
              {i < plan.steps.length - 1 && (
                <div className="w-px flex-1 bg-[var(--border)] mt-1" />
              )}
            </div>

            <div className="flex-1 pt-1">
              <p className="font-bold text-[0.875rem] text-[var(--text-1)] mb-1">
                {step.title}
              </p>
              <p className={`text-[0.845rem] text-[var(--text-2)] leading-[1.75] m-0 ${step.files.length ? "mb-2.5" : ""}`}>
                {step.description}
              </p>
              {step.files.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {step.files.map(f => (
                    <span key={f} className="mono text-[0.68rem] text-[var(--text-3)] bg-[var(--bg-sunken)] border border-[var(--border)] rounded px-[7px] py-[2px]">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </Sec>

      {plan.tests.length > 0 && (
        <Sec label="Tests" count={plan.tests.length}>
          <div className="flex flex-col gap-1.5">
            {plan.tests.map((t, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-[var(--text-4)] mt-[3px] shrink-0">—</span>
                <span className="text-[0.875rem] text-[var(--text-2)] leading-[1.7]">{t}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {plan.risks.length > 0 && (
        <Sec label="Risks" count={plan.risks.length}>
          <div className="flex flex-col gap-2">
            {plan.risks.map((r, i) => (
              <div key={i} className="p-[13px_15px] rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn-line)]">
                <p className="font-bold text-[0.845rem] text-[var(--warn)] mb-1.5">
                  {r.risk}
                </p>
                <p className="text-[0.82rem] text-[var(--text-3)] leading-[1.65] m-0">
                  Mitigation: {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {plan.uncertainties.length > 0 && (
        <Sec label="Uncertainties" count={plan.uncertainties.length}>
          <div className="flex flex-col gap-[5px]">
            {plan.uncertainties.map((u, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-[var(--text-4)] mt-[3px] shrink-0">?</span>
                <span className="text-[0.875rem] text-[var(--text-2)] leading-[1.7]">{u}</span>
              </div>
            ))}
          </div>
        </Sec>
      )}
    </div>
  )
}

function FileRow({ file, isOpen, onToggle }: { file: AffectedFile; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full border-none cursor-pointer p-[10px_14px] flex items-center gap-[9px] text-left transition-colors duration-150 ${
          isOpen ? "bg-[var(--bg-sunken)]" : "bg-[var(--bg-raised)]"
        }`}
      >
        <span className={`action-label action-${file.action}`}>{file.action}</span>
        <span className="mono flex-1 text-[0.8rem] text-[var(--text-1)]">{file.path}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-[var(--text-4)] shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="u-fade-in border-t border-[var(--border)] p-[15px_16px] flex flex-col gap-3.5">
          <div>
            <p className="text-[0.68rem] font-bold tracking-[0.07em] uppercase text-[var(--text-4)] mb-[7px]">
              Why this file?
            </p>
            <p className="text-[0.875rem] text-[var(--text-2)] leading-[1.75] m-0">{file.reason}</p>
          </div>
          {file.changes.length > 0 && (
            <div>
              <p className="text-[0.68rem] font-bold tracking-[0.07em] uppercase text-[var(--text-4)] mb-2">
                Changes
              </p>
              <div className="flex flex-col gap-[5px]">
                {file.changes.map((c, i) => (
                  <div key={i} className="flex gap-[9px]">
                    <span className="text-[var(--text-4)] shrink-0 mt-[1px]">+</span>
                    <span className="text-[0.845rem] text-[var(--text-2)] leading-[1.65]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Sec({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="card p-[22px_26px]">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="m-0 text-[0.82rem] font-bold tracking-[0.06em] text-[var(--text-1)] flex-1 uppercase">
          {label}
        </h2>
        {count !== undefined && <Chip>{count}</Chip>}
      </div>
      <div className="h-px bg-[var(--border)] mb-4" />
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono text-[0.65rem] text-[var(--text-4)] bg-[var(--bg-sunken)] border border-[var(--border)] rounded-full px-[9px] py-[2px]">
      {children}
    </span>
  )
}
