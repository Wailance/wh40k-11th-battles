import type { ReactNode } from 'react'
import type { CuratedUnit } from '../types/faction-data'
import { copy } from '../lib/copy'
import { displayUnitPoints } from '../lib/list-engine'
import { filterDatasheetAbilities } from '../lib/datasheet-abilities'
import { WeaponStatsSection } from './LoadoutWidgets'

export function UnitDatasheet({
  unit,
  onAdd,
  showAdd = true,
  addDisabled = false,
  pointsLabel,
  headerAction,
  enhancementNames,
  children,
}: {
  unit: CuratedUnit
  onAdd?: () => void
  showAdd?: boolean
  addDisabled?: boolean
  pointsLabel?: string
  headerAction?: ReactNode
  enhancementNames?: readonly string[]
  children?: ReactNode
}) {
  const abilities = filterDatasheetAbilities(unit.abilities, enhancementNames)
  return (
    <div className="space-y-3 text-body">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-title tracking-wide text-accent">{unit.name}</h3>
          <p className="text-caption text-muted">{pointsLabel ?? `${displayUnitPoints(unit)} pts`}</p>
        </div>
        {headerAction ??
          (showAdd && onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={addDisabled}
              className="app-btn shrink-0 px-3 py-1.5 text-caption"
            >
              {copy.armyLists.addUnit}
            </button>
          ) : null)}
      </div>

      <div className="flex flex-wrap gap-1">
        {unit.keywords.map((k) => (
          <span
            key={k}
            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-micro text-muted"
          >
            {k}
          </span>
        ))}
      </div>

      {Object.keys(unit.stats).length > 0 && (
        <div className="grid grid-cols-3 gap-1 text-caption sm:grid-cols-6">
          {Object.entries(unit.stats).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/8 bg-black/20 px-2 py-1 text-center">
              <div className="text-micro uppercase text-muted">{k}</div>
              <div className="font-medium text-bone">{v}</div>
            </div>
          ))}
        </div>
      )}

      {children}

      <WeaponStatsSection rangedWeapons={unit.rangedWeapons} meleeWeapons={unit.meleeWeapons} />

      {abilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted">{copy.armyLists.abilities}</p>
          {abilities.map((a) => (
            <div key={a.name} className="rounded-lg border border-white/8 bg-black/20 p-2.5">
              <p className="text-caption font-medium text-bone">{a.name}</p>
              <p className="mt-1 text-caption leading-relaxed text-muted whitespace-pre-wrap">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
