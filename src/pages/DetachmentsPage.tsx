import { useMemo, useState } from 'react'
import { DpCost } from '../components/DpDisplay'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { copy } from '../lib/copy'
import { armies, FD_SHORT } from '../lib/game-utils'
import type { ArmyCategory, ForceDisposition } from '../types/game'

const CATEGORIES: { id: ArmyCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'imperium', label: 'Imperium' },
  { id: 'space-marines', label: 'Space Marines' },
  { id: 'chaos', label: 'Chaos' },
  { id: 'xenos', label: 'Xenos' },
]

const FD_FILTER: (ForceDisposition | 'all')[] = [
  'all', 'PURGE THE FOE', 'TAKE AND HOLD', 'PRIORITY ASSETS', 'RECONNAISSANCE', 'DISRUPTION',
]

export function DetachmentsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ArmyCategory | 'all'>('all')
  const [fd, setFd] = useState<ForceDisposition | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return armies.filter((a) => {
      if (category !== 'all' && a.category !== category) return false
      if (fd !== 'all' && !a.detachments.some((d) => d.forceDisposition === fd)) return false
      if (q && !a.army.toLowerCase().includes(q) && !a.detachments.some((d) => d.name.toLowerCase().includes(q)))
        return false
      return true
    })
  }, [search, category, fd])

  const totalDets = filtered.reduce((n, a) => n + a.detachments.length, 0)

  return (
    <div className="motion-stagger space-y-4">
      <div>
        <h1 className="app-page-title">{copy.lists.title}</h1>
        <p className="mt-1 text-body text-muted">
          {filtered.length} armies · {totalDets} detachments
        </p>
        <p className="mt-1 text-caption text-muted">{copy.lists.dpHint}</p>
        <div className="app-divider mt-4" />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={copy.lists.search}
        className="app-input w-full px-4 py-3 text-body"
      />

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            data-active={category === c.id}
            className="app-filter-pill shrink-0"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        {FD_FILTER.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFd(f)}
            data-active={fd === f}
            className="app-filter-pill shrink-0"
          >
            {f === 'all' ? 'Any FD' : FD_SHORT[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="app-panel p-6 text-center text-body text-muted">
          <p>{copy.common.noResults}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategory('all')
              setFd('all')
            }}
            className="app-btn-ghost mt-3 px-4 py-2 text-caption"
          >
            {copy.common.clearFilters}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((army) => (
          <div key={army.army} className="app-panel overflow-hidden !rounded-xl">
            <button
              type="button"
              onClick={() => setExpanded(expanded === army.army ? null : army.army)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-semibold">{army.army}</p>
                <p className="text-caption text-muted">{army.detachments.length} detachments</p>
              </div>
              <span className="text-muted">{expanded === army.army ? '▲' : '▼'}</span>
            </button>
            {expanded === army.army && (
              <div className="border-t border-white/[0.06] px-4 pb-4">
                {army.factionPackUrl && (
                  <a
                    href={army.factionPackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 mt-3 block text-caption text-accent"
                  >
                    Faction Pack PDF →
                  </a>
                )}
                <div className="space-y-2">
                  {army.detachments
                    .filter((d) => fd === 'all' || d.forceDisposition === fd)
                    .map((d) => (
                      <div
                        key={d.name}
                        className="rounded-xl border border-white/[0.06] bg-void p-3 text-body"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{d.name}</span>
                          <DpCost dp={d.dp} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <ForceDispositionBadge fd={d.forceDisposition as ForceDisposition} short />
                          {d.note && <span className="text-caption text-muted">{d.note}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
