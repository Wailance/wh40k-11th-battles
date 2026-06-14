import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArmyDataBanner } from '../components/ArmyDataBanner'
import { ArmyBuilderWipBanner } from '../components/ArmyBuilderWipBanner'
import { copy } from '../lib/copy'
import { deleteRoster, importRoster, loadRosters } from '../lib/roster-storage'

export function ListsPage() {
  const [rosters, setRosters] = useState(() => loadRosters())
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
        alert(copy.armyLists.importError)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="app-page-title">{copy.armyLists.title}</h1>
        <p className="mt-1 text-body text-muted">{copy.armyLists.subtitle}</p>
      </div>

      <ArmyBuilderWipBanner />
      <ArmyDataBanner />

      <div className="flex flex-wrap gap-2">
        <Link to="/lists/new" className="app-btn-muted px-4 py-2.5 text-body">
          {copy.armyLists.newList}
          <span className="app-btn-badge">{copy.armyLists.wipBadge}</span>
        </Link>
        <button
          type="button"
          className="app-btn-ghost px-4 py-2.5 text-body"
          onClick={() => fileRef.current?.click()}
        >
          {copy.armyLists.import}
        </button>
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
      </div>

      {rosters.length === 0 ? (
        <p className="app-panel p-6 text-center text-body text-muted">{copy.armyLists.empty}</p>
      ) : (
        <ul className="space-y-2">
          {rosters.map((r) => (
            <li key={r.id} className="app-panel flex items-center gap-3 p-4">
              <Link to={`/lists/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-bone">{r.name}</p>
                <p className="mt-0.5 text-caption text-muted">
                  {r.army} · {r.pointsTotal}/{r.battleSize} pts · {r.units.length} units
                </p>
              </Link>
              <button
                type="button"
                className="text-caption text-red-400"
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

      <p className="text-center text-caption text-muted">
        {copy.armyLists.externalBuilder}{' '}
        <a
          href="https://warorgan.com/"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline-offset-2 hover:underline"
        >
          War Organ
        </a>
      </p>
    </div>
  )
}
