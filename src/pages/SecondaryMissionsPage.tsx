import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MissionBrowseCard } from '../components/MissionBrowseCard'
import { copy } from '../lib/copy'
import { FIXED_SECONDARIES, TACTICAL_SECONDARIES } from '../lib/mission-reference'

type Tab = 'tactical' | 'fixed'

export function SecondaryMissionsPage() {
  const [tab, setTab] = useState<Tab>('tactical')
  const [query, setQuery] = useState('')

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tab === 'tactical' ? [...TACTICAL_SECONDARIES] : [...FIXED_SECONDARIES]
    if (q) list = list.filter((n) => n.toLowerCase().includes(q))
    return list
  }, [tab, query])

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <p className="text-micro font-semibold uppercase tracking-widest text-accent-dim">
          {copy.reference.sectionSecondary}
        </p>
        <h1 className="app-page-title">{copy.reference.secondaryTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.secondarySubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="app-filter-pill flex-1"
          data-active={tab === 'tactical'}
          onClick={() => setTab('tactical')}
        >
          {copy.reference.secondaryTactical}
        </button>
        <button
          type="button"
          className="app-filter-pill flex-1"
          data-active={tab === 'fixed'}
          onClick={() => setTab('fixed')}
        >
          {copy.reference.secondaryFixed}
        </button>
      </div>

      <div className="app-panel p-4">
        <p className="text-body font-medium text-bone">
          {tab === 'tactical' ? copy.reference.secondaryTacticalTitle : copy.reference.secondaryFixedTitle}
        </p>
        <p className="mt-1 text-caption leading-relaxed text-muted">
          {tab === 'tactical' ? copy.reference.secondaryTacticalHint : copy.reference.secondaryFixedHint}
        </p>
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
        <Link to="/missions/primary" className="text-accent hover:underline">
          {copy.reference.primaryTitle}
        </Link>
        {' · '}
        <Link to="/reference" className="text-accent hover:underline">
          {copy.reference.hubTitle}
        </Link>
      </p>
    </div>
  )
}
