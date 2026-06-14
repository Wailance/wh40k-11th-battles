import { useState } from 'react'
import { Link } from 'react-router-dom'

type Section = 'sequence' | 'guidance' | 'campaign' | 'terminology'

export function FormatSequenceList({
  steps,
}: {
  steps: readonly {
    step: number
    title: string
    when: string
    body: string
    sub?: readonly string[]
  }[]
}) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.step} className="app-panel p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-display text-caption text-accent">
              {step.step}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-body tracking-wide text-bone">{step.title}</p>
              <p className="mt-0.5 text-micro uppercase tracking-wider text-muted">{step.when}</p>
              <p className="mt-2 text-caption leading-relaxed text-muted">{step.body}</p>
              {step.sub && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-caption leading-relaxed text-muted">
                  {step.sub.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function FormatSectionTabs({
  sections,
  section,
  onSection,
}: {
  sections: { id: Section; label: string }[]
  section: Section
  onSection: (s: Section) => void
}) {
  return (
    <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSection(s.id)}
          data-active={section === s.id}
          className="app-filter-pill shrink-0"
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

export function FormatStartBattleLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="app-btn flex w-full py-3.5 text-body">
      {label}
    </Link>
  )
}

export function FormatPdfLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="app-btn-ghost inline-flex py-2 text-caption">
      {label} ↗
    </a>
  )
}

export function useFormatSection(defaultSection: Section = 'sequence') {
  return useState<Section>(defaultSection)
}
