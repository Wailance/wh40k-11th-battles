import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import { findArmy } from '../lib/army-allegiance'
import type { ArmyRoster } from '../types/roster'
import { AppSheet } from './AppSheet'

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
    <AppSheet open={open} onClose={onClose} titleId="detachment-sheet-title">
      <div className="app-sheet-scroll px-4 pb-8 pt-1">
        <h2 id="detachment-sheet-title" className="font-display text-title tracking-wide text-accent">
          {copy.armyLists.changeDetachment}
        </h2>
        <p className="mt-1 text-body text-muted">{roster.army}</p>
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
        <button type="button" onClick={onClose} className="app-btn-ghost mt-4 w-full py-3 text-body">
          {copy.common.done}
        </button>
      </div>
    </AppSheet>
  )
}
