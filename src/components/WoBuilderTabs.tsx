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
        Units
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'enhancements'}
        className={`wo-builder-tab${active === 'enhancements' ? ' is-active' : ''}`}
        onClick={onEnhancements}
      >
        Enhancements
      </button>
    </div>
  )
}

export function WoPaneTabs({
  active,
  onCatalog,
  onArmy,
  armyCount,
}: {
  active: 'catalog' | 'army'
  onCatalog: () => void
  onArmy: () => void
  armyCount: number
}) {
  return (
    <div className="wo-pane-tabs" role="tablist">
      <button
        type="button"
        className={`wo-pane-tab${active === 'catalog' ? ' is-active' : ''}`}
        onClick={onCatalog}
      >
        Catalogue
      </button>
      <button
        type="button"
        className={`wo-pane-tab${active === 'army' ? ' is-active' : ''}`}
        onClick={onArmy}
      >
        Your army ({armyCount})
      </button>
    </div>
  )
}
