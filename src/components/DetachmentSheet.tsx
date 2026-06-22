import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import type { Army } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import type { WarOrganBuilderBundle } from '../types/warorgan'
import { stratagemsForDetachments, detachmentRuleFor } from '../lib/warorgan-loader'
import { AppSheet } from './AppSheet'

export function DetachmentSheet({
  roster,
  armyEntry,
  woBundle,
  dpUsed,
  open,
  onClose,
  onPersist,
}: {
  roster: ArmyRoster
  armyEntry?: Army
  woBundle?: WarOrganBuilderBundle | null
  dpUsed: number
  open: boolean
  onClose: () => void
  onPersist: (r: ArmyRoster) => void
}) {
  if (!open || !armyEntry) return null

  const detNames = roster.detachments.map((d) => d.name)
  const stratagems = woBundle ? stratagemsForDetachments(woBundle, detNames) : []

  return (
    <AppSheet open={open} onClose={onClose} titleId="detachment-sheet-title" className="wo-detachment-sheet">
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

        {woBundle && roster.detachments.length > 0 && (
          <div className="mt-6 space-y-4">
            {roster.detachments.map((det) => {
              const rule = detachmentRuleFor(woBundle, det.name)
              if (!rule) return null
              return (
                <section key={det.name} className="wo-det-rule">
                  <h3 className="text-micro font-semibold uppercase tracking-widest text-muted">
                    {det.name}
                  </h3>
                  {rule.Title && (
                    <p className="mt-1 text-caption font-medium text-bone">{rule.Title}</p>
                  )}
                  {rule.Text && (
                    <p className="mt-1 whitespace-pre-wrap text-caption text-muted">{rule.Text}</p>
                  )}
                  {rule.Restrictions && (
                    <p className="mt-2 whitespace-pre-wrap text-micro text-muted">{rule.Restrictions}</p>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {woBundle && woBundle.armyRules.length > 0 && (
          <section className="mt-6">
            <h3 className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.armyRules}
            </h3>
            {woBundle.armyRules.map((rule) => (
              <div key={rule.Title} className="mt-3">
                <p className="text-caption font-medium text-bone">{rule.Title}</p>
                <p className="mt-1 whitespace-pre-wrap text-caption text-muted">{rule.Text}</p>
              </div>
            ))}
          </section>
        )}

        {stratagems.length > 0 && (
          <section className="mt-6">
            <h3 className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.stratagems}
            </h3>
            <div className="mt-2 space-y-2">
              {stratagems.map((s) => (
                <details key={s.Name} className="wo-stratagem">
                  <summary className="cursor-pointer text-caption font-medium text-bone">
                    {s.Name}
                    <span className="ml-2 text-micro text-accent-dim">{s.CPCost} CP</span>
                  </summary>
                  <div className="mt-1 space-y-1 pl-2 text-micro text-muted">
                    {s.Phase && <p>Phase: {s.Phase}</p>}
                    {s.When && <p>When: {s.When}</p>}
                    {s.Target && <p>Target: {s.Target}</p>}
                    {s.Effect && <p>Effect: {s.Effect}</p>}
                    {s.Restrictions && <p>{s.Restrictions}</p>}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        <button type="button" onClick={onClose} className="app-btn-ghost mt-4 w-full py-3 text-body">
          {copy.common.done}
        </button>
      </div>
    </AppSheet>
  )
}
