import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import { findArmy } from '../lib/army-allegiance'
import type { ArmyRoster } from '../types/roster'

export function DetachmentSheet({
  roster,
  dpUsed,
  open,
  onClose,
  onPersist,
}: {
  roster: ArmyRoster
  dpUsed: number
  open: boolean
  onClose: () => void
  onPersist: (r: ArmyRoster) => void
}) {
  const armyEntry = findArmy(roster.army)
  if (!open || !armyEntry) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={copy.common.close}
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-gw-gold)]/30 bg-[var(--color-void-raised)] px-4 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="font-display text-base tracking-wide text-[var(--color-gw-gold)]">
          {copy.armyLists.changeDetachment}
        </h2>
        <p className="mt-1 text-sm text-muted">{roster.army}</p>
        <div className="mt-4">
          <DetachmentPicker
            roster={roster}
            armyEntry={armyEntry}
            dpUsed={dpUsed}
            onPersist={onPersist}
            battleSize={roster.battleSize}
            onBattleSize={(size) => onPersist({ ...roster, battleSize: size })}
          />
        </div>
        <button type="button" onClick={onClose} className="app-btn mt-4 w-full py-3 text-sm">
          {copy.common.done}
        </button>
      </div>
    </div>
  )
}
