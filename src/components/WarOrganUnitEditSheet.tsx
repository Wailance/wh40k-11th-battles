import { useEffect, useMemo, useState } from 'react'
import type { CuratedUnit, Enhancement } from '../types/faction-data'
import type { RosterUnit } from '../types/roster'
import type { WoCompositionState, WoLineMeta, WoModelComposition, WoUnit } from '../types/warorgan'
import { copy } from '../lib/copy'
import { eligibleEnhancementsForUnit } from '../lib/warorgan-enhancements'
import {
  adjustModelRow,
  adjustWargearOption,
  canAdjustModelRow,
  canAdjustWargearOption,
  defaultWarOrganComposition,
  getOptionCount,
  getSingleChoice,
  maxOptionCount,
  modelRowMax,
  modelRowMin,
  parseWarOrganState,
  setSingleWargearChoice,
  summarizeWarOrganComposition,
  totalModelCount,
  unitHasWarOrganComposition,
  validModelCounts,
  WO_ROSTER_KEY,
} from '../lib/warorgan-composition'
import { warOrganLinePoints } from '../lib/warorgan-points'
import { enhancementByName } from '../lib/warorgan-enhancements'
import { parseWoLineMeta, upgradeCost, withWoLineMeta, WO_META_KEY } from '../lib/warorgan-roster'
import { AppSheet } from './AppSheet'
import { UnitDatasheet } from './UnitDatasheet'

function ModelRowEditor({
  comp,
  compIdx,
  count,
  unit,
  state,
  onAdjustRow,
  onAdjustOption,
  onSelectChoice,
}: {
  comp: WoModelComposition
  compIdx: number
  count: number
  unit: WoUnit
  state: WoCompositionState
  onAdjustRow: (compIdx: number, delta: number) => void
  onAdjustOption: (compIdx: number, wgIdx: number, optIdx: number, delta: number) => void
  onSelectChoice: (compIdx: number, wgIdx: number, replaces: string[], chosen: string) => void
}) {
  const [expanded, setExpanded] = useState(count > 0 && comp.Wargear.some((w) => w.Options.length > 0))
  const hasWargear = comp.Wargear.some((w) => w.Options.length > 0)
  const min = modelRowMin(comp)
  const max = modelRowMax(comp)
  const fixed = !comp.Limit

  return (
    <div className="wo-comp-row">
      <div className={`wo-comp-header${hasWargear ? ' has-chevron' : ''}`}>
        {!fixed && (
          <button
            type="button"
            className="bf-loadout-squad-step"
            aria-label={copy.armyLists.decreaseLoadout}
            disabled={!canAdjustModelRow(unit, state, compIdx, -1)}
            onClick={() => onAdjustRow(compIdx, -1)}
          >
            −
          </button>
        )}
        <span className="wo-comp-count">{fixed ? 1 : count}</span>
        <button
          type="button"
          className="wo-comp-label"
          disabled={!hasWargear}
          onClick={() => hasWargear && setExpanded((e) => !e)}
        >
          <span className="wo-comp-name">{comp.ModelName.trim()}</span>
          {!fixed && (
            <span className="wo-comp-limit text-micro text-muted">
              {min}–{max}
            </span>
          )}
        </button>
        {hasWargear && (
          <button
            type="button"
            className={`bf-loadout-chevron${expanded ? ' is-open' : ''}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
          />
        )}
        {!fixed && (
          <button
            type="button"
            className="bf-loadout-squad-step"
            aria-label={copy.armyLists.increaseLoadout}
            disabled={!canAdjustModelRow(unit, state, compIdx, 1)}
            onClick={() => onAdjustRow(compIdx, 1)}
          >
            +
          </button>
        )}
      </div>

      {expanded && count > 0 && (
        <div className="wo-comp-panel">
          {comp.Wargear.map((wg, wgIdx) => (
            <div key={wgIdx} className="wo-wargear-block">
              <p className="wo-wargear-default text-micro text-muted">
                {wg.InitalWargear.join(' · ')}
              </p>
              {wg.Options.map((opt, optIdx) => {
                const replaces = opt.Replaces ?? []
                const isCounted = opt.Max != null || opt.PerXModels != null
                const replaceLabel = replaces.join(', ')

                if (isCounted) {
                  const taken = getOptionCount(state, compIdx, wgIdx, optIdx)
                  const maxTake = maxOptionCount(count, opt)
                  const label = opt.Options[0] ?? 'Upgrade'
                  const hint =
                    opt.PerXModels && opt.PerXModels > 1
                      ? `Max ${maxTake} (${opt.PerXModels} models each)`
                      : maxTake < count
                        ? `Max ${maxTake}`
                        : undefined

                  return (
                    <div key={optIdx} className="bf-loadout-replace-block">
                      <p className="bf-loadout-replace-label">
                        Replaces <em>{replaceLabel}</em>
                      </p>
                      {hint && <p className="bf-loadout-rule-hint">{hint}</p>}
                      <div className="bf-loadout-replace-row">
                        <button
                          type="button"
                          className="bf-loadout-squad-step"
                          disabled={taken <= 0}
                          onClick={() => onAdjustOption(compIdx, wgIdx, optIdx, -1)}
                        >
                          −
                        </button>
                        <span className="bf-loadout-squad-count">{taken}</span>
                        <span className="bf-loadout-squad-label">{label}</span>
                        <button
                          type="button"
                          className="bf-loadout-squad-step"
                          disabled={
                            !canAdjustWargearOption(unit, state, compIdx, wgIdx, optIdx, 1)
                          }
                          onClick={() => onAdjustOption(compIdx, wgIdx, optIdx, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                }

                const chosen = getSingleChoice(state, compIdx, wgIdx, replaces)
                return (
                  <div key={optIdx} className="wo-choice-group">
                    <p className="bf-loadout-replace-label">
                      Replaces <em>{replaceLabel}</em>
                    </p>
                    <div className="wo-choice-list">
                      {opt.Options.map((name) => (
                        <button
                          key={name}
                          type="button"
                          className={`wo-choice-btn${chosen === name ? ' is-selected' : ''}`}
                          onClick={() => onSelectChoice(compIdx, wgIdx, replaces, name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WarOrganUnitEditSheet({
  line,
  unit,
  woUnit,
  rosterUnits,
  enhancements,
  detachmentNames,
  open,
  onClose,
  onSave,
  instanceIndex,
  enhancementNames,
}: {
  line: RosterUnit | null
  unit: CuratedUnit | null
  woUnit: WoUnit | null
  rosterUnits: RosterUnit[]
  enhancements: Enhancement[]
  detachmentNames: string[]
  open: boolean
  onClose: () => void
  onSave: (patch: {
    models?: number
    options?: Record<string, unknown>
    points?: number
    clearOtherWarlord?: boolean
  }) => void
  instanceIndex: number
  enhancementNames?: readonly string[]
}) {
  const [state, setState] = useState<WoCompositionState | null>(null)
  const [meta, setMeta] = useState<WoLineMeta>({})

  useEffect(() => {
    if (!open || !line || !woUnit) return
    const existing = parseWarOrganState(line.options)
    setState(existing ?? defaultWarOrganComposition(woUnit))
    setMeta(parseWoLineMeta(line.options))
  }, [open, line, woUnit])

  const total = state ? totalModelCount(state) : line?.models ?? 1
  const validTotals = useMemo(() => (woUnit ? validModelCounts(woUnit) : []), [woUnit])
  const basePoints =
    unit && woUnit && state
      ? warOrganLinePoints(unit, woUnit, instanceIndex, state)
      : unit && woUnit
        ? warOrganLinePoints(unit, woUnit, instanceIndex, {
            v: 1,
            modelCounts: [1],
            wargear: {},
          })
        : 0
  const upgradePts = upgradeCost(woUnit?.Upgrades, meta.upgradeName)
  const enhPts = meta.enhancementId
    ? (enhancementByName(enhancements, meta.enhancementId)?.points ?? 0)
    : 0
  const points = basePoints + upgradePts + enhPts
  const summary = woUnit && state ? summarizeWarOrganComposition(woUnit, state) : ''

  const eligibleEnh = useMemo(() => {
    if (!woUnit) return []
    return eligibleEnhancementsForUnit(woUnit, enhancements, detachmentNames)
  }, [woUnit, enhancements, detachmentNames])

  const leaderTargets = useMemo(() => {
    if (!woUnit?.LeaderInfo?.UnitNames || !line?.lineId) return []
    const allowed = new Set(woUnit.LeaderInfo.UnitNames.map((n) => n.toUpperCase()))
    return rosterUnits.filter(
      (u) => u.lineId !== line.lineId && allowed.has(u.name.toUpperCase()),
    )
  }, [woUnit, rosterUnits, line?.lineId])

  const isCharacter = unit?.keywords.some((k) => k.toLowerCase() === 'character') ?? false

  if (!open || !line || !unit || !woUnit) return null

  const hasComposition = unitHasWarOrganComposition(woUnit)
  const totalValid = !hasComposition || !validTotals.length || validTotals.includes(total)

  function handleAdjustRow(compIdx: number, delta: number) {
    if (!state) return
    const next = adjustModelRow(woUnit!, state, compIdx, delta)
    if (next) setState(next)
  }

  function handleAdjustOption(compIdx: number, wgIdx: number, optIdx: number, delta: number) {
    if (!state) return
    if (!canAdjustWargearOption(woUnit!, state, compIdx, wgIdx, optIdx, delta)) return
    const next = adjustWargearOption(state, compIdx, wgIdx, optIdx, delta)
    if (next) setState(next)
  }

  function handleSave() {
    const options: Record<string, unknown> = {
      ...line!.options,
      loadoutSummary: hasComposition ? summary : line!.options?.loadoutSummary,
    }
    if (state && hasComposition) {
      options[WO_ROSTER_KEY] = state
    }
    const merged = withWoLineMeta(options, meta)
    if (Object.keys(parseWoLineMeta(merged)).length === 0) {
      delete merged[WO_META_KEY]
    }

    onSave({
      models: hasComposition ? total : line!.models,
      points,
      options: merged,
      clearOtherWarlord: Boolean(meta.warlord),
    })
  }

  return (
    <AppSheet open={open} onClose={onClose} titleId="wo-unit-edit-title" className="wo-unit-edit-sheet">
      <div className="app-sheet-scroll px-4 pb-8 pt-1">
        <h2 id="wo-unit-edit-title" className="wo-unit-edit-title">
          {unit.name}
        </h2>
        <p className="wo-unit-edit-pts tabular-nums">{points} pts</p>

        {isCharacter && (
          <label className="wo-meta-row mt-3 flex items-center gap-2 text-caption">
            <input
              type="checkbox"
              checked={Boolean(meta.warlord)}
              onChange={(e) => setMeta((m) => ({ ...m, warlord: e.target.checked || undefined }))}
            />
            {copy.armyLists.warlord}
          </label>
        )}

        {leaderTargets.length > 0 && (
          <div className="wo-meta-row mt-3">
            <p className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.leadUnit}
            </p>
            <select
              value={meta.attachedToLineId ?? ''}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  attachedToLineId: e.target.value || undefined,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-caption"
            >
              <option value="">{copy.armyLists.noLeaderAttachment}</option>
              {leaderTargets.map((t) => (
                <option key={t.lineId} value={t.lineId ?? ''}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {eligibleEnh.length > 0 && (
          <div className="wo-meta-row mt-3">
            <p className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.tabEnhancements}
            </p>
            <select
              value={meta.enhancementId ?? ''}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  enhancementId: e.target.value || undefined,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-caption"
            >
              <option value="">{copy.armyLists.noEnhancement}</option>
              {eligibleEnh.map((e) => (
                <option key={e.name} value={e.name}>
                  {e.name} ({e.points} pts)
                </option>
              ))}
            </select>
          </div>
        )}

        {(woUnit.Upgrades?.length ?? 0) > 0 && (
          <div className="wo-meta-row mt-3">
            <p className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.upgrades}
            </p>
            <select
              value={meta.upgradeName ?? ''}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  upgradeName: e.target.value || undefined,
                }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-caption"
            >
              <option value="">{copy.armyLists.noUpgrade}</option>
              {woUnit.Upgrades!.map((u) => (
                <option key={u.Name} value={u.Name}>
                  {u.Name} (+{u.Cost} pts)
                </option>
              ))}
            </select>
          </div>
        )}

        {hasComposition && state && (
          <section className="wo-composition mt-4">
            <h3 className="text-micro font-semibold uppercase tracking-widest text-muted">
              Unit composition
            </h3>
            {!totalValid && (
              <p className="mt-1 text-caption text-status-danger">
                Squad must be {validTotals.join(' or ')} models (currently {total})
              </p>
            )}
            <div className="mt-2 space-y-1">
              {(woUnit.UnitComposition?.ModelCompositions ?? []).map((comp, compIdx) => (
                <ModelRowEditor
                  key={`${comp.ModelName}-${compIdx}`}
                  comp={comp}
                  compIdx={compIdx}
                  count={state.modelCounts[compIdx] ?? 0}
                  unit={woUnit}
                  state={state}
                  onAdjustRow={handleAdjustRow}
                  onAdjustOption={handleAdjustOption}
                  onSelectChoice={(ci, wi, rep, ch) =>
                    setState(setSingleWargearChoice(state, ci, wi, rep, ch))
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-4">
          <UnitDatasheet
            unit={unit}
            enhancementNames={enhancementNames}
            showAdd={false}
            pointsLabel={`${points} pts`}
          />
        </section>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="app-btn-ghost flex-1 py-3">
            {copy.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!totalValid}
            className="app-btn-primary flex-1 py-3"
          >
            {copy.common.save}
          </button>
        </div>
      </div>
    </AppSheet>
  )
}
