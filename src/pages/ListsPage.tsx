import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NoticeDialog } from '../components/NoticeDialog'
import { copy } from '../lib/copy'
import { deleteRoster, importRoster, loadRosters } from '../lib/roster-storage'
import type { ArmyRoster } from '../types/roster'

export function ListsPage() {
  const [rosters, setRosters] = useState(() => loadRosters())
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importError, setImportError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function refresh() {
    setRosters(loadRosters())
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importRoster(String(reader.result))
        refresh()
      } catch {
        setImportError(true)
      }
    }
    reader.readAsText(file)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rosters
    return rosters.filter(
      (r) => r.name.toLowerCase().includes(q) || r.army.toLowerCase().includes(q),
    )
  }, [rosters, query])

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <header>
        <p className="text-micro font-semibold uppercase tracking-widest text-accent-dim">
          {copy.armyLists.title}
        </p>
        <h1 className="app-page-title">{copy.armyLists.myListsTitle}</h1>
        <p className="mt-1 text-body text-muted">
          {rosters.length === 0
            ? copy.armyLists.listsHomeEmptyHint
            : copy.armyLists.listsHomeHint(rosters.length)}
        </p>
        <div className="app-divider mt-4" />
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.armyLists.searchLists}
        className="app-input w-full px-4 py-3 text-body"
        aria-label={copy.armyLists.searchListsLabel}
      />

      {filtered.length === 0 ? (
        <div className="app-panel flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-faint bg-black/30 font-display text-title text-muted">
            ◇
          </span>
          <p className="max-w-xs text-caption leading-relaxed text-muted">
            {query ? copy.common.noResults : copy.armyLists.empty}
          </p>
          {!query && (
            <Link to="/lists/new" className="app-btn mt-1 px-6 py-2.5 text-caption">
              {copy.armyLists.newList}
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <SavedListRow key={r.id} roster={r} onDelete={() => setDeleteId(r.id)} />
          ))}
        </ul>
      )}

      <section className="space-y-2 pt-1" aria-label={copy.armyLists.listsActionsLabel}>
        <Link to="/lists/new" className="app-btn flex w-full items-center justify-center gap-2 py-3">
          <span aria-hidden className="text-body leading-none">
            +
          </span>
          {copy.armyLists.newList}
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="app-btn-ghost min-h-[2.75rem] py-2.5 text-caption"
            onClick={() => fileRef.current?.click()}
          >
            {copy.armyLists.importList}
          </button>
          <Link to="/lists/meta" className="app-btn-ghost min-h-[2.75rem] py-2.5 text-center text-caption">
            {copy.tournamentLists.button}
          </Link>
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleImport(f)
          e.target.value = ''
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={copy.armyLists.deleteConfirm}
        body={copy.armyLists.deleteConfirm}
        confirmLabel={copy.armyLists.deleteUnit}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteRoster(deleteId)
          setDeleteId(null)
          refresh()
        }}
      />

      <NoticeDialog
        open={importError}
        title={copy.armyLists.importError}
        body={copy.armyLists.importError}
        onClose={() => setImportError(false)}
      />
    </div>
  )
}

function SavedListRow({ roster: r, onDelete }: { roster: ArmyRoster; onDelete: () => void }) {
  return (
    <li className="ab-list-card app-panel motion-card overflow-hidden">
      <Link to={`/lists/${r.id}`} className="ab-list-card-main">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-body tracking-wide text-bone">{r.name}</span>
          <span className="mt-0.5 block truncate text-caption text-muted">
            {r.army} · {r.pointsTotal.toLocaleString()}/{r.battleSize.toLocaleString()} pts · {r.units.length}{' '}
            {r.units.length === 1 ? 'unit' : 'units'}
          </span>
        </span>
        <span className="ab-list-card-chevron" aria-hidden />
      </Link>
      <div className="ab-list-card-actions">
        <Link
          to={`/new?roster=${r.id}&player=1`}
          className="ab-list-card-action ab-list-card-action--play"
          title={copy.armyLists.playWithListHint}
        >
          {copy.armyLists.playWithList}
        </Link>
        <button type="button" className="ab-list-card-action ab-list-card-action--delete" onClick={onDelete}>
          {copy.armyLists.deleteUnit}
        </button>
      </div>
    </li>
  )
}
