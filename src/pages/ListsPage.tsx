import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NoticeDialog } from '../components/NoticeDialog'
import { copy } from '../lib/copy'
import { deleteRoster, importRoster, loadRosters } from '../lib/roster-storage'

export function ListsPage() {
  const [rosters, setRosters] = useState(() => loadRosters())
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importError, setImportError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const listsRef = useRef<HTMLElement>(null)

  function refresh() {
    setRosters(loadRosters())
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importRoster(String(reader.result))
        refresh()
        scrollToLists()
      } catch {
        setImportError(true)
      }
    }
    reader.readAsText(file)
  }

  function scrollToLists() {
    listsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rosters
    return rosters.filter(
      (r) => r.name.toLowerCase().includes(q) || r.army.toLowerCase().includes(q),
    )
  }, [rosters, query])

  return (
    <div className="wo-home motion-stagger">
      <header className="wo-home-header">
        <h1 className="wo-home-title">{copy.armyLists.title}</h1>
        <p className="wo-home-subtitle">{copy.armyLists.subtitle}</p>
      </header>

      <div className="wo-home-toolbar">
        <div className="wo-home-primary-row">
          <Link to="/lists/new" className="wo-home-primary wo-home-primary--half">
            <span className="wo-home-primary-icon" aria-hidden>
              +
            </span>
            {copy.armyLists.newList}
          </Link>
          <button type="button" className="wo-home-my-lists" onClick={scrollToLists}>
            {copy.armyLists.myLists}
            {rosters.length > 0 && (
              <span className="wo-home-my-lists-count">{rosters.length}</span>
            )}
          </button>
        </div>

        <div className="wo-home-secondary">
          <button
            type="button"
            className="wo-home-secondary-btn"
            onClick={() => fileRef.current?.click()}
          >
            {copy.armyLists.importList}
          </button>
          <Link to="/lists/meta" className="wo-home-secondary-btn">
            {copy.tournamentLists.button}
          </Link>
        </div>
      </div>

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

      <section
        ref={listsRef}
        id="wo-saved-lists"
        className="wo-home-lists scroll-mt-3"
        aria-label={copy.armyLists.myLists}
      >
        <div className="wo-home-lists-head">
          <h2 className="wo-home-section-label">
            {copy.armyLists.myLists}
            {rosters.length > 0 && ` · ${filtered.length}`}
          </h2>
          <label className="wo-home-search">
            <span className="wo-home-search-icon" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.armyLists.searchLists}
              className="wo-home-search-field"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="wo-home-empty">
            <span className="wo-home-empty-icon" aria-hidden>
              ◇
            </span>
            <p className="wo-home-empty-text">
              {query ? copy.common.noResults : copy.armyLists.empty}
            </p>
            {!query && (
              <Link to="/lists/new" className="wo-home-empty-cta">
                {copy.armyLists.newList}
              </Link>
            )}
          </div>
        ) : (
          <ul className="wo-home-list">
            {filtered.map((r) => (
              <li key={r.id} className="wo-home-list-item">
                <Link to={`/lists/${r.id}`} className="wo-home-list-link">
                  <span className="wo-home-list-body">
                    <span className="wo-home-list-name">{r.name}</span>
                    <span className="wo-home-list-meta">
                      {r.army} · {r.pointsTotal.toLocaleString()}/{r.battleSize.toLocaleString()} pts
                      · {r.units.length} {r.units.length === 1 ? 'unit' : 'units'}
                    </span>
                  </span>
                  <span className="wo-home-list-chevron" aria-hidden />
                </Link>
                <Link
                  to={`/new?roster=${r.id}&player=1`}
                  className="wo-home-list-play"
                  title={copy.armyLists.playWithListHint}
                  aria-label={copy.armyLists.playWithList}
                >
                  ▶
                </Link>
                <button
                  type="button"
                  className="wo-home-list-delete"
                  aria-label={copy.history.delete}
                  onClick={() => setDeleteId(r.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
