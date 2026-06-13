import type { CuratedUnit } from '../types/faction-data'
import { copy } from '../lib/copy'

export function UnitDatasheet({
  unit,
  onAdd,
  showAdd = true,
}: {
  unit: CuratedUnit
  onAdd?: () => void
  showAdd?: boolean
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base tracking-wide text-accent">{unit.name}</h3>
          <p className="text-xs text-muted">{unit.points} pts</p>
        </div>
        {showAdd && onAdd && (
          <button type="button" onClick={onAdd} className="app-btn shrink-0 px-3 py-1.5 text-xs">
            {copy.armyLists.addUnit}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {unit.keywords.map((k) => (
          <span
            key={k}
            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted"
          >
            {k}
          </span>
        ))}
      </div>

      {Object.keys(unit.stats).length > 0 && (
        <div className="grid grid-cols-3 gap-1 text-[11px] sm:grid-cols-6">
          {Object.entries(unit.stats).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/8 bg-black/20 px-2 py-1 text-center">
              <div className="text-[9px] uppercase text-muted">{k}</div>
              <div className="font-medium text-bone">{v}</div>
            </div>
          ))}
        </div>
      )}

      {unit.rangedWeapons.length > 0 && (
        <WeaponBlock title={copy.armyLists.ranged} weapons={unit.rangedWeapons} />
      )}
      {unit.meleeWeapons.length > 0 && (
        <WeaponBlock title={copy.armyLists.melee} weapons={unit.meleeWeapons} />
      )}

      {unit.abilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.armyLists.abilities}</p>
          {unit.abilities.map((a) => (
            <div key={a.name} className="rounded-lg border border-white/8 bg-black/20 p-2.5">
              <p className="text-xs font-medium text-bone">{a.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted whitespace-pre-wrap">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeaponBlock({
  title,
  weapons,
}: {
  title: string
  weapons: CuratedUnit['rangedWeapons']
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-1.5">
        {weapons.map((w) => (
          <div key={w.name} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2 text-[11px]">
            <p className="font-medium text-bone">{w.name}</p>
            <p className="mt-0.5 text-muted">
              {[w.range, w.A && `A${w.A}`, w.BS && `BS${w.BS}`, w.WS && `WS${w.WS}`, `S${w.S}`, `AP${w.AP}`, `D${w.D}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {w.keywords.length > 0 && (
              <p className="mt-1 text-[10px] text-accent-dim">{w.keywords.join(', ')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
