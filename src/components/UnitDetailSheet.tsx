import { UnitDatasheet } from './UnitDatasheet'
import type { CuratedUnit } from '../types/faction-data'
import { copy } from '../lib/copy'

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
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={copy.common.close}
        onClick={onClose}
      />
      <div className="bf-sheet relative max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-gw-gold)]/30 bg-[var(--color-void-raised)] px-4 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div>
          <UnitDatasheet unit={unit} onAdd={onAdd} showAdd />
        </div>
        {inRoster !== undefined && inRoster > 0 && (
          <p className="mt-3 text-center text-xs text-[var(--color-gw-gold)]">
            {inRoster} in army
          </p>
        )}
      </div>
    </div>
  )
}
