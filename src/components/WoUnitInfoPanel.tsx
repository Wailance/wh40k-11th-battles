import { UnitDatasheet } from './UnitDatasheet'
import type { CuratedUnit } from '../types/faction-data'
import { copy } from '../lib/copy'
import { canAddUnit, displayUnitPoints } from '../lib/list-engine'
import { maxCopiesForUnit } from '../lib/unit-buckets'
import type { ArmyRoster } from '../types/roster'

export function WoUnitInfoPanel({
  unit,
  roster,
  rosterCount,
  enhancementNames,
  onAdd,
}: {
  unit: CuratedUnit | null
  roster: ArmyRoster
  rosterCount: number
  enhancementNames: readonly string[]
  onAdd: () => void
}) {
  if (!unit) {
    return (
      <div className="wo-unit-info-empty">
        <p className="wo-unit-info-empty-title">{copy.armyLists.catalogStep}</p>
        <p className="wo-unit-info-empty-body">{copy.armyLists.selectUnitHint}</p>
      </div>
    )
  }

  const atMax = rosterCount >= maxCopiesForUnit(unit)
  const canAdd = canAddUnit(roster, unit)

  return (
    <div className="wo-unit-info-panel">
      <div className="wo-unit-info-hero">
        <div className="min-w-0 flex-1">
          <p className="wo-unit-info-kicker">{copy.armyLists.panelCatalog}</p>
          <h2 className="wo-unit-info-name">{unit.name}</h2>
          <p className="wo-unit-info-pts tabular-nums">{displayUnitPoints(unit)} pts</p>
        </div>
        <button
          type="button"
          className="wo-unit-info-add"
          disabled={!canAdd || atMax}
          onClick={onAdd}
        >
          +
        </button>
      </div>
      <div className="wo-unit-info-scroll">
        <UnitDatasheet
          unit={unit}
          showAdd={false}
          enhancementNames={enhancementNames}
        />
        {rosterCount > 0 && (
          <p className="mt-3 text-center text-caption text-muted">
            {copy.armyLists.unitInArmy(rosterCount, maxCopiesForUnit(unit))}
          </p>
        )}
      </div>
    </div>
  )
}
