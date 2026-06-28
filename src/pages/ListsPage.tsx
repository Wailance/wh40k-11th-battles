import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NoticeDialog } from '../components/NoticeDialog'
import { copy } from '../lib/copy'
import { loadFactionCatalog } from '../lib/faction-loader'
import { BATTLE_SIZE_LIMITS, refreshRoster } from '../lib/list-engine'
import { loadWarOrganBuilderBundle } from '../lib/warorgan-loader'
import { convertWoArmyListToRoster, parseImportedListJson } from '../lib/warorgan-import-export'
import { deleteRoster, importRoster, loadRosters, saveRoster } from '../lib/roster-storage'
import type { ArmyRoster } from '../types/roster'

export function ListsPage() {
  const navigate = useNavigate()
  const [rosters, setRosters] = useState(() => loadRosters())
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importError, setImportError] = useState(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function refresh() {
    setRosters(loadRosters())
  }

  async function handleImport(file: File) {
    const text = await file.text()
    try {
      const parsed = parseImportedListJson(text)
      if (!parsed) throw new Error('invalid')

      if ('Units' in parsed) {
        if (!parsed.FactionName) throw new Error('no faction')
        const armyName = parsed.FactionName
        const [bundle, data] = await Promise.all([
          loadWarOrganBuilderBundle(armyName),
          loadFactionCatalog(armyName),
        ])
        if (!bundle) throw new Error('no bundle')
        const converted = convertWoArmyListToRoster(parsed, bundle)
        if (!converted) throw new Error('convert failed')
        const roster = refreshRoster(
          converted.roster,
          data.units,
          bundle.unitDefs,
          data.enhancements,
        )
        saveRoster(roster)
        refresh()
        navigate(`/lists/${roster.id}`)
        return
      }

      const roster = importRoster(text)
      refresh()
      navigate(`/lists/${roster.id}`)
    } catch {
      setImportError(true)
    }
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

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.armyLists.searchLists}
          className="app-input w-full px-4 py-3 pr-11 text-body"
          aria-label={copy.armyLists.searchListsLabel}
        />
        {query && (
          <button
            type="button"
            className="app-input-clear"
            aria-label={copy.common.clearFilters}
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="app-panel flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-faint bg-black/30 font-display text-title text-muted">
            ◇
          </span>
          <p className="max-w-xs text-caption leading-relaxed text-muted">
            {query ? copy.common.noResults : copy.armyLists.empty}
          </p>
          {query ? (
            <button
              type="button"
              className="app-btn-ghost mt-1 px-6 py-2.5 text-caption"
              onClick={() => setQuery('')}
            >
              {copy.common.clearFilters}
            </button>
          ) : (
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
          if (f) void handleImport(f)
          e.target.value = ''
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={copy.armyLists.deleteConfirm}
        body={copy.armyLists.deleteConfirm}
        confirmLabel={copy.armyLists.deleteList}
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

      <NoticeDialog
        open={Boolean(importNotice)}
        title={copy.armyLists.importSuccess}
        body={importNotice ?? ''}
        onClose={() => setImportNotice(null)}
      />
    </div>
  )
}

function SavedListRow({ roster: r, onDelete }: { roster: ArmyRoster; onDelete: () => void }) {
  const limit = BATTLE_SIZE_LIMITS[r.battleSize]
  return (
    <li className="ab-list-card app-panel motion-card overflow-hidden">
      <Link to={`/lists/${r.id}`} className="ab-list-card-main">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-body tracking-wide text-bone">{r.name}</span>
          <span className="mt-0.5 block truncate text-caption text-muted">
            {r.army} · {copy.armyLists.listPointsSummary(r.pointsTotal, limit)} ·{' '}
            {copy.armyLists.unitCount(r.units.length)}
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
          {copy.armyLists.deleteList}
        </button>
      </div>
    </li>
  )
}
