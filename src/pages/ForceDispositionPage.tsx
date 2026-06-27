import { Link } from 'react-router-dom'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { copy } from '../lib/copy'
import { allForceDispositions } from '../lib/force-disposition-reference'
import { PRIMARY_DECKS } from '../lib/mission-reference'
import type { CSSProperties } from 'react'

export function ForceDispositionPage() {
  const dispositions = allForceDispositions()

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <p className="text-micro font-semibold uppercase tracking-widest text-accent-dim">
          {copy.reference.sectionDispositions}
        </p>
        <h1 className="app-page-title">{copy.reference.dispositionsTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.dispositionsSubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <ul className="space-y-4">
        {dispositions.map((d) => (
          <li
            key={d.fd}
            id={d.fd}
            className="ref-fd-card app-panel scroll-mt-4 overflow-hidden"
            style={
              {
                '--fd-tone': `var(--color-fd-${d.colorKey ?? 'red'})`,
              } as CSSProperties
            }
          >
            <div className="ref-fd-card-head p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <ForceDispositionBadge fd={d.fd} size="md" />
                <span className="text-micro font-semibold uppercase tracking-widest text-muted">
                  {d.deckSize}-card deck
                </span>
              </div>
              <h2 className="font-display text-title text-bone">{d.title}</h2>
              <p className="mt-2 text-body leading-relaxed text-muted">{d.summary}</p>
              <p className="mt-2 text-caption text-accent-dim">{d.deckFocus}</p>
            </div>

            <div className="border-t border-faint bg-black/20 px-4 py-3">
              <p className="mb-2 text-micro font-semibold uppercase tracking-widest text-muted">
                {copy.reference.primaryDeckCards}
              </p>
              <ul className="space-y-1.5">
                {PRIMARY_DECKS[d.fd].map((name) => (
                  <li key={name}>
                    <MissionNameButton name={name} className="text-caption font-medium" showIcon />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  to={`/missions/primary?deck=${encodeURIComponent(d.fd)}`}
                  className="text-caption font-medium text-accent hover:underline"
                >
                  {copy.reference.browseDeck} →
                </Link>
                <Link to="/matrix" className="text-caption font-medium text-accent hover:underline">
                  {copy.reference.matrixTitle} →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-center text-micro text-muted">
        <Link to="/detachments" className="text-accent hover:underline">
          {copy.reference.detachmentsTitle}
        </Link>
        {' · '}
        <Link to="/reference" className="text-accent hover:underline">
          {copy.reference.hubTitle}
        </Link>
      </p>
    </div>
  )
}
