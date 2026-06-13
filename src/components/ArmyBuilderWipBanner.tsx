import { copy } from '../lib/copy'

export function ArmyBuilderWipBanner() {
  return (
    <div className="rounded-xl border border-crimson/30 bg-crimson-soft/50 px-3 py-2.5">
      <p className="font-display text-[11px] uppercase tracking-widest text-crimson-bright">
        {copy.armyLists.wipBadge}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{copy.armyLists.wipBody}</p>
    </div>
  )
}
