import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { deleteRoster, importRoster, loadRosters } from '../lib/roster-storage'
import { loadWarOrganMeta } from '../lib/warorgan-theme'

export function ListsPage() {
  const [rosters, setRosters] = useState(() => loadRosters())
  const [query, setQuery] = useState('')
  const [datasetLabel, setDatasetLabel] = useState('Warhammer 40k 11th')
  const [versionLabel, setVersionLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadWarOrganMeta().then((meta) => {
      if (meta.Id) setDatasetLabel(meta.Id)
      if (meta.Version) {
        const date = meta.PublishDate ? new Date(meta.PublishDate).toLocaleDateString() : ''
        setVersionLabel(date ? `${meta.Version} (${date})` : meta.Version)
      }
    })
  }, [])

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
        alert(copy.armyLists.importError)
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
    <div className="wo-home motion-stagger min-h-full">
      <header className="wo-home-header">
        <div>
          <h1 className="wo-home-title">{copy.armyLists.title}</h1>
          <p className="wo-home-meta">DATASET: {datasetLabel}</p>
          {versionLabel && <p className="wo-home-meta">VERSION: {versionLabel}</p>}
        </div>
      </header>

      <div className="wo-home-actions">
        <div className="wo-home-tile-wrap">
          <Link to="/lists/new" className="wo-home-tile" aria-label={copy.armyLists.newList}>
            <span className="wo-home-tile-icon" aria-hidden>
              +
            </span>
          </Link>
          <button
            type="button"
            className="wo-home-tile-menu"
            aria-label={copy.armyLists.import}
            onClick={() => fileRef.current?.click()}
          >
            ···
          </button>
        </div>
        <label className="wo-home-tile wo-home-tile--search">
          <span className="wo-home-tile-icon" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.armyLists.searchLists}
            className="wo-home-search-input"
          />
        </label>
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

      <div className="wo-home-links">
        <Link to="/lists/meta" className="text-caption text-muted hover:text-bone">
          {copy.tournamentLists.button}
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="wo-home-empty">{query ? copy.common.noResults : copy.armyLists.empty}</p>
      ) : (
        <ul className="wo-home-grid">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link to={`/lists/${r.id}`} className="wo-home-list-card">
                <p className="wo-home-list-name">{r.name}</p>
                <p className="wo-home-list-meta">
                  {r.army} · {r.pointsTotal}/{r.battleSize} pts
                </p>
                <p className="wo-home-list-meta">{r.units.length} units</p>
              </Link>
              <button
                type="button"
                className="wo-home-list-delete"
                onClick={() => {
                  if (confirm(copy.armyLists.deleteConfirm)) {
                    deleteRoster(r.id)
                    refresh()
                  }
                }}
              >
                {copy.history.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
