import { copy } from '../lib/copy'

export function WoBuilderTabs({
  active,
  onUnits,
  onEnhancements,
}: {
  active: 'units' | 'enhancements'
  onUnits: () => void
  onEnhancements: () => void
}) {
  return (
    <div className="wo-builder-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'units'}
        className={`wo-builder-tab${active === 'units' ? ' is-active' : ''}`}
        onClick={onUnits}
      >
        {copy.armyLists.tabUnits}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'enhancements'}
        className={`wo-builder-tab${active === 'enhancements' ? ' is-active' : ''}`}
        onClick={onEnhancements}
      >
        {copy.armyLists.tabEnhancements}
      </button>
    </div>
  )
}

export function WoBuilderMobileDock({
  active,
  armyCount,
  pointsTotal,
  limit,
  overLimit,
  issueCount,
  toast,
  onCatalog,
  onArmy,
  onToggleIssues,
}: {
  active: 'catalog' | 'army'
  armyCount: number
  pointsTotal: number
  limit: number
  overLimit: boolean
  issueCount: number
  toast: { message: string; kind: 'ok' | 'err' } | null
  onCatalog: () => void
  onArmy: () => void
  onToggleIssues?: () => void
}) {
  return (
    <div className="wo-builder-dock" role="navigation" aria-label={copy.armyLists.currentList}>
      {toast && (
        <p
          className={`wo-builder-toast${toast.kind === 'err' ? ' is-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </p>
      )}
      <div className="wo-builder-dock-row">
        <div className="wo-builder-dock-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={active === 'catalog'}
            className={`wo-builder-dock-tab${active === 'catalog' ? ' is-active' : ''}`}
            onClick={onCatalog}
          >
            {copy.armyLists.tabCatalogue}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={active === 'army'}
            className={`wo-builder-dock-tab${active === 'army' ? ' is-active' : ''}`}
            onClick={onArmy}
          >
            {copy.armyLists.tabArmy}
            {armyCount > 0 && <span className="wo-builder-dock-count">{armyCount}</span>}
          </button>
        </div>
        <div className="wo-builder-dock-meta">
          {issueCount > 0 && onToggleIssues && (
            <button type="button" className="wo-builder-dock-issues" onClick={onToggleIssues}>
              {issueCount}
            </button>
          )}
          <p className={`wo-builder-dock-pts tabular-nums${overLimit ? ' is-over' : ''}`}>
            {copy.armyLists.mobileDockSummary(armyCount, pointsTotal, limit)}
          </p>
        </div>
      </div>
    </div>
  )
}
