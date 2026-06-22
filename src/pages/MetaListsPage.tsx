import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLoading } from '../components/PageLoading'
import { copy } from '../lib/copy'
import {
  formatTournamentDate,
  formatTournamentResult,
  loadTournamentMetaLists,
  uniqueFactions,
} from '../lib/tournament-lists-loader'
import type { TournamentMetaList } from '../types/tournament-list'

const PAGE_SIZE = 25

function TournamentListRow({ entry }: { entry: TournamentMetaList }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const result = formatTournamentResult(entry.wins, entry.losses, entry.draws)

  async function handleCopy() {
    const text = entry.listText
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }

  return (
    <div className={`meta-list-row${open ? ' is-open' : ''}`}>
      <div className="meta-list-row-head">
        <button
          type="button"
          className={`meta-list-chevron${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-label={open ? copy.tournamentLists.collapse : copy.tournamentLists.expand}
          onClick={() => setOpen((v) => !v)}
        />
        <div className="meta-list-main">
          <p className="meta-list-player">{entry.playerName}</p>
          <p className="meta-list-faction">
            {entry.faction}
            {entry.detachment && <span className="meta-list-detachment">{entry.detachment}</span>}
          </p>
        </div>
        <div className="meta-list-event">
          <a href={entry.eventLink} target="_blank" rel="noreferrer" className="meta-list-event-link">
            {entry.eventName}
          </a>
          <p className="meta-list-event-meta">
            {entry.numberOfPlayers} {copy.tournamentLists.players}
          </p>
        </div>
        <div className="meta-list-result-col">
          <span className="meta-list-date">{formatTournamentDate(entry.startDate)}</span>
          <span className="meta-list-result">{result}</span>
        </div>
      </div>

      {open && (
        <div className="meta-list-panel">
          <div className="meta-list-panel-actions">
            {entry.listText && (
              <button type="button" className="app-btn-muted px-3 py-1.5 text-caption" onClick={() => void handleCopy()}>
                {copied ? copy.tournamentLists.copied : copy.tournamentLists.copyList}
              </button>
            )}
          </div>
          {entry.listText ? (
            <pre className="meta-list-text">{entry.listText}</pre>
          ) : (
            <p className="text-body text-muted">{copy.tournamentLists.listUnavailable}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function MetaListsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lists, setLists] = useState<TournamentMetaList[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [fetchedAt, setFetchedAt] = useState('')
  const [faction, setFaction] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadTournamentMetaLists()
      .then((data) => {
        if (cancelled) return
        setLists(data.lists)
        setTotalCount(data.totalCount)
        setFetchedAt(data.fetchedAt)
      })
      .catch(() => {
        if (!cancelled) setError(copy.tournamentLists.loadError)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const factions = useMemo(() => uniqueFactions(lists), [lists])

  const filtered = useMemo(() => {
    if (!faction) return lists
    return lists.filter((l) => l.faction === faction)
  }, [lists, faction])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [faction])

  if (loading) return <PageLoading label={copy.tournamentLists.loading} />

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/lists" className="text-caption text-muted hover:text-bone">
          ← {copy.armyLists.back}
        </Link>
        <p className="app-panel p-6 text-center text-body text-muted">{error}</p>
      </div>
    )
  }

  const updatedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : ''

  return (
    <div className="motion-stagger space-y-4">
      <div>
        <Link to="/lists" className="text-caption text-muted hover:text-bone">
          ← {copy.armyLists.back}
        </Link>
        <h1 className="app-page-title mt-2">{copy.tournamentLists.title}</h1>
        <p className="mt-1 text-body text-muted">{copy.tournamentLists.subtitle}</p>
        {updatedLabel && (
          <p className="mt-1 text-caption text-muted">
            {copy.tournamentLists.updated(updatedLabel)} · {lists.length}/{totalCount}{' '}
            {copy.tournamentLists.listsShown}
          </p>
        )}
      </div>

      <div className="meta-list-filters">
        <label className="meta-list-filter-label" htmlFor="meta-faction-filter">
          {copy.tournamentLists.filterFaction}
        </label>
        <select
          id="meta-faction-filter"
          className="meta-list-filter-select"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        >
          <option value="">{copy.tournamentLists.allFactions}</option>
          {factions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="meta-list-table">
        <div className="meta-list-table-head">
          <span>{copy.tournamentLists.colName}</span>
          <span>{copy.tournamentLists.colFaction}</span>
          <span>{copy.tournamentLists.colEvent}</span>
          <span>{copy.tournamentLists.colResult}</span>
        </div>

        {pageItems.length === 0 ? (
          <p className="meta-list-empty">{copy.tournamentLists.empty}</p>
        ) : (
          pageItems.map((entry) => <TournamentListRow key={entry.listId} entry={entry} />)
        )}
      </div>

      {pageCount > 1 && (
        <div className="meta-list-pager">
          <button
            type="button"
            className="app-btn-ghost px-3 py-2 text-caption"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            {copy.tournamentLists.prev}
          </button>
          <span className="text-caption text-muted">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="app-btn-ghost px-3 py-2 text-caption"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            {copy.tournamentLists.next}
          </button>
        </div>
      )}
    </div>
  )
}
