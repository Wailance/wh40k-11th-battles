import { useMemo, useState } from 'react'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { copy } from '../lib/copy'
import {
  FIXED_SECONDARIES,
  PRIMARY_DECKS,
  TACTICAL_SECONDARIES,
} from '../lib/mission-reference'
import { FD_ORDER } from '../lib/game-utils'
import type { ForceDisposition } from '../types/game'

type Tab = 'primary' | 'tactical' | 'fixed'

export function MissionsPage() {
  const [tab, setTab] = useState<Tab>('primary')
  const [deck, setDeck] = useState<ForceDisposition>('DISRUPTION')
  const [query, setQuery] = useState('')

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list: string[] =
      tab === 'primary'
        ? PRIMARY_DECKS[deck]
        : tab === 'tactical'
          ? [...TACTICAL_SECONDARIES]
          : [...FIXED_SECONDARIES]
    if (q) list = list.filter((n) => n.toLowerCase().includes(q))
    return list
  }, [tab, deck, query])

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <h1 className="app-page-title">{copy.reference.missionsTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.missionsSubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <div className="flex gap-2">
        {(['primary', 'tactical', 'fixed'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="app-filter-pill flex-1 capitalize"
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === 'primary'
              ? copy.reference.missionsPrimary
              : t === 'tactical'
                ? copy.reference.missionsTactical
                : copy.reference.missionsFixed}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.reference.missionsSearch}
        className="app-input w-full px-4 py-3 text-body"
      />

      {tab === 'primary' && (
        <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
          {FD_ORDER.map((fd) => (
            <button
              key={fd}
              type="button"
              data-active={deck === fd}
              className="app-filter-pill shrink-0"
              onClick={() => setDeck(fd)}
            >
              <ForceDispositionBadge fd={fd} short />
            </button>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <p className="py-8 text-center text-caption text-muted">{copy.common.noResults}</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((name) => (
            <li key={name} className="app-panel p-3">
              <MissionNameButton name={name} className="text-body font-medium" showIcon />
            </li>
          ))}
        </ul>
      )}

      {tab === 'tactical' && (
        <p className="text-caption text-muted">{copy.reference.missionsTacticalHint}</p>
      )}
    </div>
  )
}
