import { UnitDatasheet } from './UnitDatasheet'
import type { CuratedUnit } from '../types/faction-data'
import { copy } from '../lib/copy'
import { AppSheet } from './AppSheet'

export function UnitDetailSheet({
  unit,
  open,
  onClose,
  onAdd,
  showAdd = true,
  addDisabled = false,
  enhancementNames,
  inRoster,
  maxCopies,
}: {
  unit: CuratedUnit | null
  open: boolean
  onClose: () => void
  onAdd?: () => void
  showAdd?: boolean
  addDisabled?: boolean
  enhancementNames?: readonly string[]
  inRoster?: number
  maxCopies?: number
}) {
  if (!open || !unit) return null

  return (
    <AppSheet open={open} onClose={onClose}>
      <div className="app-sheet-scroll px-4 pb-8 pt-1">
        <UnitDatasheet
          unit={unit}
          onAdd={onAdd}
          showAdd={showAdd && Boolean(onAdd)}
          addDisabled={addDisabled}
          enhancementNames={enhancementNames}
        />
        {inRoster !== undefined && inRoster > 0 && maxCopies !== undefined && (
          <p className="mt-3 text-center text-caption text-accent-dim">
            {copy.armyLists.unitInArmy(inRoster, maxCopies)}
          </p>
        )}
      </div>
    </AppSheet>
  )
}
