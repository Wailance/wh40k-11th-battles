import { DpCost } from './DpDisplay'
import { ForceDispositionBadge } from './ForceDispositionBadge'
import { copy } from '../lib/copy'
import { formatWoDisplayName, woNamesMatch } from '../lib/warorgan-names'
import {
  detachmentPointBudget,
  isDetachmentBudgetLegal,
  wouldDetachmentTagConflict,
} from '../lib/army-construction'
import { toggleDetachment } from '../lib/list-engine'
import type { Enhancement } from '../types/faction-data'
import type { Army, ForceDisposition, SelectedDetachment } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import type { WoDetachment } from '../types/warorgan'

export function DetachmentPicker({
  roster,
  armyEntry,
  dpUsed,
  onPersist,
  battleSize,
  onBattleSize,
  showBattleSize = true,
  detachmentsRaw,
  catalogEnhancements,
}: {
  roster: ArmyRoster
  armyEntry: Army
  dpUsed: number
  onPersist: (r: ArmyRoster) => void
  battleSize?: ArmyRoster['battleSize']
  onBattleSize?: (size: ArmyRoster['battleSize']) => void
  showBattleSize?: boolean
  detachmentsRaw?: WoDetachment[]
  catalogEnhancements?: Enhancement[]
}) {
  const size = battleSize ?? roster.battleSize
  const dpBudget = detachmentPointBudget(size)
  const dpLeft = dpBudget - dpUsed

  return (
    <div className="space-y-3">
      {showBattleSize && onBattleSize && battleSize !== undefined && (
        <div>
          <p className="mb-1.5 text-micro uppercase tracking-widest text-muted">
            {copy.armyLists.battleSizeLabel}
          </p>
          <select
            value={battleSize}
            onChange={(e) => onBattleSize(Number(e.target.value) as ArmyRoster['battleSize'])}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-body text-bone"
          >
            <option value={1000}>{copy.armyLists.battleSizeIncursion}</option>
            <option value={2000}>{copy.armyLists.battleSizeStrike}</option>
          </select>
        </div>
      )}

      <p className="text-caption text-muted">
        {copy.armyLists.detachmentsHint(dpBudget)} · {copy.dp.remaining(dpLeft)} ({dpBudget} DP max)
      </p>

      <div className="space-y-2">
        {armyEntry.detachments.map((d) => {
          const selected = roster.detachments.some((x) => woNamesMatch(x.name, d.name))
          const det: SelectedDetachment = {
            name: d.name,
            dp: d.dp,
            note: d.note,
            forceDisposition: d.forceDisposition as ForceDisposition,
          }
          const nextDetachments = selected
            ? roster.detachments.filter((x) => x.name !== d.name)
            : [...roster.detachments, det]
          const budgetOk = selected || isDetachmentBudgetLegal(nextDetachments, roster.battleSize)
          const tagOk =
            selected ||
            !detachmentsRaw ||
            !wouldDetachmentTagConflict(detachmentsRaw, roster.detachments, d.name)
          const canToggle = budgetOk && tagOk
          return (
            <button
              key={d.name}
              type="button"
              disabled={!canToggle}
              onClick={() =>
                onPersist(
                  toggleDetachment(roster, det, { detachmentsRaw, catalogEnhancements }),
                )
              }
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? 'border-crimson/35 bg-crimson-soft ring-1 ring-crimson/20'
                  : 'border-white/8 hover:border-white/15'
              } disabled:opacity-40`}
            >
              <DpCost dp={d.dp} />
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-bone">{formatWoDisplayName(d.name)}</p>
                {d.note && <p className="mt-0.5 text-caption text-muted">{d.note}</p>}
                <ForceDispositionBadge fd={d.forceDisposition as ForceDisposition} short />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
