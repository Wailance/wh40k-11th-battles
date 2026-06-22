import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BATTLEFIELD_SETUP_STEPS } from '../lib/battlefield'
import { copy } from '../lib/copy'
import {
  DESIGNER_NOTES,
  EVENT_COMPANION_PDF,
  MISSION_ERRATA,
  MISSION_FAQ,
  MISSION_SEQUENCE,
} from '../data/event-companion'
import battlefieldData from '../data/battlefield-layouts.json'

type Section = 'sequence' | 'errata' | 'faq' | 'notes' | 'terrain'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'sequence', label: 'Sequence' },
  { id: 'errata', label: 'Errata' },
  { id: 'faq', label: 'FAQ' },
  { id: 'notes', label: 'Notes' },
  { id: 'terrain', label: 'Terrain' },
]

export function MissionSequencePage() {
  const [section, setSection] = useState<Section>('sequence')

  return (
    <div className="motion-stagger space-y-4 pb-2" data-allow-select>
      <div>
        <h1 className="app-page-title">{copy.missionSequence.title}</h1>
        <p className="mt-1 text-body text-muted">{copy.missionSequence.subtitle}</p>
        <a
          href={EVENT_COMPANION_PDF}
          target="_blank"
          rel="noreferrer"
          className="app-btn-ghost mt-3 inline-flex py-2 text-caption"
        >
          {copy.missionSequence.pdfLink} ↗
        </a>
      </div>

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            data-active={section === s.id}
            className="app-filter-pill shrink-0"
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'sequence' && (
        <ol className="space-y-2">
          {MISSION_SEQUENCE.map((step) => (
            <li key={step.step} className="app-panel p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-display text-caption text-accent">
                  {step.step}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-body tracking-wide text-bone">{step.title}</p>
                  <p className="mt-0.5 text-micro uppercase tracking-wider text-muted">{step.when}</p>
                  <p className="mt-2 text-caption leading-relaxed text-muted">{step.body}</p>
                  {'sub' in step && step.sub && (
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
      )}

      {section === 'errata' && (
        <div className="space-y-2">
          {MISSION_ERRATA.map((e) => (
            <article key={e.title} className="app-panel p-4">
              <h2 className="text-body font-semibold text-bone">{e.title}</h2>
              <p className="mt-2 text-caption leading-relaxed text-muted">{e.body}</p>
            </article>
          ))}
        </div>
      )}

      {section === 'faq' && (
        <div className="space-y-2">
          {MISSION_FAQ.map((f) => (
            <article key={f.q} className="app-panel p-4">
              <h2 className="text-body font-semibold text-accent">{f.q}</h2>
              <p className="mt-2 text-caption leading-relaxed text-muted">{f.a}</p>
            </article>
          ))}
        </div>
      )}

      {section === 'notes' && (
        <div className="space-y-2">
          {DESIGNER_NOTES.map((n) => (
            <article key={n.title} className="app-panel p-4">
              <h2 className="text-body font-semibold text-bone">{n.title}</h2>
              <p className="mt-2 text-caption leading-relaxed text-muted">{n.body}</p>
            </article>
          ))}
        </div>
      )}

      {section === 'terrain' && (
        <div className="space-y-3">
          <section className="app-panel p-4">
            <h2 className="text-body font-semibold text-bone">{copy.missionSequence.terrainTitle}</h2>
            <p className="mt-1 text-caption text-muted">{copy.missionSequence.terrainHint}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-caption text-muted">
              {BATTLEFIELD_SETUP_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
          <section className="app-panel p-4">
            <h2 className="text-body font-semibold text-bone">{copy.missionSequence.footprintsTitle}</h2>
            <ul className="mt-2 space-y-1 text-caption text-muted">
              {(battlefieldData.terrainFootprints as { size: string; qty: number }[]).map((f) => (
                <li key={f.size}>
                  {f.qty}× {f.size}
                </li>
              ))}
            </ul>
          </section>
          <p className="text-center text-caption text-muted">
            <Link to="/new" className="text-accent underline-offset-2 hover:underline">
              {copy.missionSequence.terrainCta}
            </Link>
            {' · '}
            <Link to="/teams" className="text-accent underline-offset-2 hover:underline">
              {copy.missionSequence.teamsLink}
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
