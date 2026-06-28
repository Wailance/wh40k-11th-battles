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

export function BuilderToast({ toast }: { toast: { message: string; kind: 'ok' | 'err' } | null }) {
  if (!toast) return null
  return (
    <div className="wo-builder-toast-host" aria-live="polite">
      <p className={`wo-builder-toast${toast.kind === 'err' ? ' is-error' : ''}`} role="status">
        {toast.message}
      </p>
    </div>
  )
}

export function WoBuilderMobileDock({
  active,
  armyCount,
  onCatalog,
  onArmy,
}: {
  active: 'catalog' | 'army'
  armyCount: number
  onCatalog: () => void
  onArmy: () => void
}) {
  return (
    <div className="wo-builder-dock" role="navigation" aria-label={copy.armyLists.currentList}>
      <div className="wo-builder-dock-tabs" role="group" aria-label={copy.armyLists.panelCatalog}>
        <button
          type="button"
          aria-pressed={active === 'catalog'}
          className={`wo-builder-dock-tab${active === 'catalog' ? ' is-active' : ''}`}
          onClick={onCatalog}
        >
          {copy.armyLists.tabCatalogue}
        </button>
        <button
          type="button"
          aria-pressed={active === 'army'}
          className={`wo-builder-dock-tab${active === 'army' ? ' is-active' : ''}`}
          onClick={onArmy}
        >
          {copy.armyLists.tabArmy}
          {armyCount > 0 && <span className="wo-builder-dock-count">{armyCount}</span>}
        </button>
      </div>
    </div>
  )
}
