import { UnitDatasheet } from './UnitDatasheet'
import type { CuratedUnit } from '../types/faction-data'
import { AppSheet } from './AppSheet'

export function UnitDetailSheet({
  unit,
  open,
  onClose,
  onAdd,
  inRoster,
}: {
  unit: CuratedUnit | null
  open: boolean
  onClose: () => void
  onAdd: () => void
  inRoster?: number
}) {
  if (!open || !unit) return null

  return (
    <AppSheet open={open} onClose={onClose} className="app-sheet-gold">
      <div className="app-sheet-scroll px-4 pb-8 pt-1">
        <UnitDatasheet unit={unit} onAdd={onAdd} showAdd />
        {inRoster !== undefined && inRoster > 0 && (
          <p className="mt-3 text-center text-caption text-[var(--color-gw-gold)]">
            {inRoster} in army
          </p>
        )}
      </div>
    </AppSheet>
  )
}
