import { useEffect, useState } from 'react'
import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import type { Army } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import type { WarOrganBuilderBundle, WoStratagem } from '../types/warorgan'
import { detachmentRuleFor } from '../lib/warorgan-loader'
import { findRawDetachment, formatWoDisplayName } from '../lib/warorgan-names'
import { AppSheet } from './AppSheet'

export type DetachmentSheetSection = 'detachments' | 'reference'

function stratagemsByDetachment(
  bundle: WarOrganBuilderBundle,
  detachmentNames: string[],
): { name: string; stratagems: WoStratagem[] }[] {
  return detachmentNames
    .map((name) => ({
      name,
      stratagems: findRawDetachment(bundle, name)?.Stratagems ?? [],
    }))
    .filter((entry) => entry.stratagems.length > 0)
}

export function DetachmentSheet({
  roster,
  armyEntry,
  woBundle,
  dpUsed,
  open,
  section,
  onSectionChange,
  onClose,
  onPersist,
  catalogEnhancements,
}: {
  roster: ArmyRoster
  armyEntry?: Army
  woBundle?: WarOrganBuilderBundle | null
  dpUsed: number
  open: boolean
  section: DetachmentSheetSection
  onSectionChange: (section: DetachmentSheetSection) => void
  onClose: () => void
  onPersist: (r: ArmyRoster) => void
  catalogEnhancements?: import('../types/faction-data').Enhancement[]
}) {
  const [openStratagems, setOpenStratagems] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setOpenStratagems(new Set())
  }, [open, section])

  if (!open || !armyEntry) return null

  const detNames = roster.detachments.map((d) => d.name)
  const stratagemGroups = woBundle ? stratagemsByDetachment(woBundle, detNames) : []
  const sheetTitle =
    roster.detachments.length > 0 ? copy.armyLists.changeDetachment : copy.armyLists.selectDetachment

  function toggleStratagem(name: string) {
    setOpenStratagems((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <AppSheet open={open} onClose={onClose} titleId="detachment-sheet-title" className="wo-detachment-sheet">
      <div className="wo-detachment-tabs shrink-0 px-4 pt-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'detachments'}
          className={`wo-detachment-tab${section === 'detachments' ? ' is-active' : ''}`}
          onClick={() => onSectionChange('detachments')}
        >
          {copy.armyLists.detachmentSheetDetachments}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'reference'}
          className={`wo-detachment-tab${section === 'reference' ? ' is-active' : ''}`}
          onClick={() => onSectionChange('reference')}
          disabled={!woBundle}
        >
          {copy.armyLists.detachmentSheetReference}
        </button>
      </div>

      <div className="app-sheet-scroll px-4 pb-8 pt-2">
        <h2 id="detachment-sheet-title" className="font-display text-title tracking-wide text-accent">
          {sheetTitle}
        </h2>
        <p className="mt-1 text-body text-muted">{roster.army}</p>

        {section === 'detachments' && (
          <div className="mt-4">
            <DetachmentPicker
              roster={roster}
              armyEntry={armyEntry}
              dpUsed={dpUsed}
              onPersist={onPersist}
              battleSize={roster.battleSize}
              onBattleSize={(size) => onPersist({ ...roster, battleSize: size })}
              detachmentsRaw={woBundle?.detachmentsRaw}
              catalogEnhancements={catalogEnhancements}
            />
          </div>
        )}

        {section === 'reference' && woBundle && (
          <div className="mt-4 space-y-6">
            {roster.detachments.length === 0 ? (
              <p className="text-caption text-muted">{copy.armyLists.noDetachment}</p>
            ) : (
              roster.detachments.map((det) => {
                const rule = detachmentRuleFor(woBundle, det.name)
                const strats =
                  stratagemGroups.find((g) => g.name === det.name)?.stratagems ?? []
                if (!rule && strats.length === 0) return null
                return (
                  <section key={det.name} className="wo-det-reference-block">
                    <h3 className="text-body font-medium text-bone">
                      {formatWoDisplayName(det.name)}
                    </h3>
                    {rule && (
                      <div className="wo-det-rule mt-2">
                        {rule.Title && (
                          <p className="text-caption font-medium text-bone">{rule.Title}</p>
                        )}
                        {rule.Text && (
                          <p className="mt-1 whitespace-pre-wrap text-caption text-muted">
                            {rule.Text}
                          </p>
                        )}
                        {rule.Restrictions && (
                          <p className="mt-2 whitespace-pre-wrap text-micro text-muted">
                            {rule.Restrictions}
                          </p>
                        )}
                      </div>
                    )}
                    {strats.length > 0 && (
                      <div className="mt-3">
                        <p className="text-micro font-semibold uppercase tracking-widest text-muted">
                          {copy.armyLists.stratagems}
                        </p>
                        <div className="mt-2 space-y-1">
                          {strats.map((s) => {
                            const open = openStratagems.has(s.Name)
                            return (
                              <div key={s.Name} className="wo-stratagem">
                                <button
                                  type="button"
                                  className="wo-stratagem-trigger"
                                  aria-expanded={open}
                                  onClick={() => toggleStratagem(s.Name)}
                                >
                                  <span className="text-caption font-medium text-bone">
                                    {formatWoDisplayName(s.Name)}
                                  </span>
                                  <span className="text-micro text-accent-dim">{s.CPCost} CP</span>
                                  <span className={`wo-stratagem-chevron${open ? ' is-open' : ''}`} aria-hidden />
                                </button>
                                {open && (
                                  <div className="wo-stratagem-body space-y-1 text-micro text-muted">
                                    {s.Phase && <p>Phase: {s.Phase}</p>}
                                    {s.When && <p>When: {s.When}</p>}
                                    {s.Target && <p>Target: {s.Target}</p>}
                                    {s.Effect && <p>Effect: {s.Effect}</p>}
                                    {s.Restrictions && <p>{s.Restrictions}</p>}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                )
              })
            )}

            {woBundle.armyRules.length > 0 && (
              <section>
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
          </div>
        )}

        <button type="button" onClick={onClose} className="app-btn-ghost mt-6 w-full py-3 text-body">
          {copy.common.done}
        </button>
      </div>
    </AppSheet>
  )
}
