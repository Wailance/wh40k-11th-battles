import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionBrowseCard } from '../components/MissionBrowseCard'
import { copy } from '../lib/copy'
import { forceDispositionInfo } from '../lib/force-disposition-reference'
import { PRIMARY_DECKS } from '../lib/mission-reference'
import { FD_COLORS, FD_ORDER, isForceDisposition } from '../lib/game-utils'
import type { ForceDisposition } from '../types/game'
import type { CSSProperties } from 'react'

export function PrimaryMissionsPage() {
  const [searchParams] = useSearchParams()
  const deckParam = searchParams.get('deck')
  const initialDeck =
    deckParam && isForceDisposition(deckParam) ? deckParam : ('DISRUPTION' as ForceDisposition)
  const [deck, setDeck] = useState<ForceDisposition>(initialDeck)
  const [query, setQuery] = useState('')

  const info = forceDispositionInfo(deck)

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...PRIMARY_DECKS[deck]]
    if (q) list = list.filter((n) => n.toLowerCase().includes(q))
    return list
  }, [deck, query])

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <p className="text-micro font-semibold uppercase tracking-widest text-accent-dim">
          {copy.reference.sectionPrimary}
        </p>
        <h1 className="app-page-title">{copy.reference.primaryTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.primarySubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <div className="ref-fd-deck-grid">
        {FD_ORDER.map((fd) => {
          const active = fd === deck
          return (
            <button
              key={fd}
              type="button"
              className={`ref-fd-deck-btn${active ? ' is-active' : ''}`}
              style={
                {
                  '--fd-tone': `var(--color-fd-${FD_COLORS[fd] ?? 'red'})`,
                } as CSSProperties
              }
              onClick={() => setDeck(fd)}
            >
              <ForceDispositionBadge fd={fd} short size="md" />
              <span className="ref-fd-deck-count">{PRIMARY_DECKS[fd].length} cards</span>
            </button>
          )
        })}
      </div>

      <div
        className="ref-fd-deck-banner app-panel p-4"
        style={
          {
            '--fd-tone': `var(--color-fd-${info.colorKey ?? 'red'})`,
          } as CSSProperties
        }
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ForceDispositionBadge fd={deck} size="md" />
          <Link to={`/dispositions#${deck}`} className="text-micro text-accent hover:underline">
            {copy.reference.viewDisposition} →
          </Link>
        </div>
        <p className="text-body leading-relaxed text-bone">{info.summary}</p>
        <p className="mt-2 text-caption text-muted">{info.deckFocus}</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.reference.missionsSearch}
        className="app-input w-full px-4 py-3 text-body"
      />

      {cards.length === 0 ? (
        <p className="py-8 text-center text-caption text-muted">{copy.common.noResults}</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((name) => (
            <MissionBrowseCard key={name} name={name} />
          ))}
        </ul>
      )}

      <p className="text-center text-micro text-muted">
        <Link to="/matrix" className="text-accent hover:underline">
          {copy.reference.matrixTitle}
        </Link>
        {' · '}
        <Link to="/reference" className="text-accent hover:underline">
          {copy.reference.hubTitle}
        </Link>
      </p>
    </div>
  )
}
