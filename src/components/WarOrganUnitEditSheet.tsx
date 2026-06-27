import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CuratedUnit, Enhancement } from '../types/faction-data'
import type { RosterUnit } from '../types/roster'
import type {
  WoCompositionState,
  WoDetachment,
  WoLineMeta,
  WoModelComposition,
  WoUnit,
} from '../types/warorgan'
import { copy } from '../lib/copy'
import {
  eligibleEnhancementsForUnit,
  enhancementByName,
} from '../lib/warorgan-enhancements'
import {
  adjustChoiceCount,
  adjustModelRow,
  adjustWargearOption,
  canAdjustChoiceCount,
  canAdjustModelRow,
  canAdjustWargearOption,
  defaultWarOrganComposition,
  getChoiceCount,
  getCountedSubChoice,
  getOptionCount,
  getSingleChoice,
  maxOptionCount,
  modelRowMax,
  modelRowMin,
  parseWarOrganState,
  setCountedSubChoice,
  setSingleWargearChoice,
  summarizeWarOrganComposition,
  totalModelCount,
  unitHasWarOrganComposition,
  validModelCounts,
  wargearOptionMode,
  WO_ROSTER_KEY,
} from '../lib/warorgan-composition'
import { warOrganLinePoints } from '../lib/warorgan-points'
import { leaderCanAttachToBodyguard, parseWoLineMeta, upgradeCost, withWoLineMeta, WO_META_KEY } from '../lib/warorgan-roster'
import { formatWoDisplayName } from '../lib/warorgan-names'
import { AppSheet } from './AppSheet'
import { UnitDatasheet } from './UnitDatasheet'

function ModelRowEditor({
  comp,
  compIdx,
  count,
  unit,
  state,
  unitTotal,
  onAdjustRow,
  onAdjustOption,
  onAdjustChoice,
  onSelectChoice,
  onSelectCountedSub,
}: {
  comp: WoModelComposition
  compIdx: number
  count: number
  unit: WoUnit
  state: WoCompositionState
  unitTotal: number
  onAdjustRow: (compIdx: number, delta: number) => void
  onAdjustOption: (compIdx: number, wgIdx: number, optIdx: number, delta: number) => void
  onAdjustChoice: (
    compIdx: number,
    wgIdx: number,
    optIdx: number,
    choiceIdx: number,
    delta: number,
  ) => void
  onSelectChoice: (compIdx: number, wgIdx: number, replaces: string[], chosen: string) => void
  onSelectCountedSub: (compIdx: number, wgIdx: number, optIdx: number, chosen: string) => void
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
                const replaceLabel = replaces.join(', ')
                const mode = wargearOptionMode(opt, count)

                if (mode === 'counted') {
                  const taken = getOptionCount(state, compIdx, wgIdx, optIdx)
                  const maxTake = maxOptionCount(count, opt, unitTotal)
                  const label = opt.Options[0] ?? 'Upgrade'
                  const hint =
                    opt.PerXModels && opt.PerXModels > 1
                      ? `Max ${maxTake} per ${opt.PerXModels} models in unit`
                      : maxTake < count
                        ? `Max ${maxTake}`
                        : undefined
                  const subChoice =
                    opt.Options.length > 1
                      ? getCountedSubChoice(state, compIdx, wgIdx, optIdx, opt)
                      : null

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
                      {subChoice != null && taken > 0 && (
                        <div className="wo-choice-list mt-2">
                          {opt.Options.map((name) => (
                            <button
                              key={name}
                              type="button"
                              className={`wo-choice-btn${subChoice === name ? ' is-selected' : ''}`}
                              onClick={() => onSelectCountedSub(compIdx, wgIdx, optIdx, name)}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                if (mode === 'perModel') {
                  return (
                    <div key={optIdx} className="bf-loadout-replace-block">
                      <p className="bf-loadout-replace-label">
                        Replaces <em>{replaceLabel}</em> · per model
                      </p>
                      {opt.Options.map((name, choiceIdx) => {
                        const taken = getChoiceCount(state, compIdx, wgIdx, optIdx, choiceIdx)
                        return (
                          <div key={name} className="bf-loadout-replace-row mt-1">
                            <button
                              type="button"
                              className="bf-loadout-squad-step"
                              disabled={taken <= 0}
                              onClick={() => onAdjustChoice(compIdx, wgIdx, optIdx, choiceIdx, -1)}
                            >
                              −
                            </button>
                            <span className="bf-loadout-squad-count">{taken}</span>
                            <span className="bf-loadout-squad-label">{name}</span>
                            <button
                              type="button"
                              className="bf-loadout-squad-step"
                              disabled={
                                !canAdjustChoiceCount(
                                  unit,
                                  state,
                                  compIdx,
                                  wgIdx,
                                  optIdx,
                                  choiceIdx,
                                  1,
                                )
                              }
                              onClick={() => onAdjustChoice(compIdx, wgIdx, optIdx, choiceIdx, 1)}
                            >
                              +
                            </button>
                          </div>
                        )
                      })}
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
  unitDefs,
  enhancements,
  detachmentNames,
  detachmentsRaw,
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
  unitDefs?: Map<string, WoUnit>
  enhancements: Enhancement[]
  detachmentNames: string[]
  detachmentsRaw?: WoDetachment[]
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
  const hydratedLineId = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      hydratedLineId.current = null
      return
    }
    if (!line?.lineId || !woUnit) return
    if (hydratedLineId.current === line.lineId) return
    hydratedLineId.current = line.lineId
    const existing = parseWarOrganState(line.options)
    setState(existing ?? defaultWarOrganComposition(woUnit))
    setMeta(parseWoLineMeta(line.options))
  }, [open, line?.lineId, line?.options, woUnit])

  const total = state ? totalModelCount(state) : line?.models ?? 1
  const validTotals = useMemo(() => (woUnit ? validModelCounts(woUnit) : []), [woUnit])
  const hasComposition = woUnit ? unitHasWarOrganComposition(woUnit) : false
  const totalValid = !hasComposition || !validTotals.length || validTotals.includes(total)

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
    return eligibleEnhancementsForUnit(woUnit, enhancements, detachmentNames, detachmentsRaw)
  }, [woUnit, enhancements, detachmentNames, detachmentsRaw])

  const leaderTargets = useMemo(() => {
    if (!woUnit?.LeaderInfo?.UnitNames || !line?.lineId) return []
    return rosterUnits.filter((u) => {
      if (u.lineId === line.lineId) return false
      const bodyWo = unitDefs?.get(u.unitId)
      return leaderCanAttachToBodyguard(woUnit, u.name, bodyWo)
    })
  }, [woUnit, rosterUnits, line?.lineId, unitDefs])

  const isCharacter = unit?.keywords.some((k) => k.toLowerCase() === 'character') ?? false

  const persistNow = useCallback(
    (nextState: WoCompositionState | null, nextMeta: WoLineMeta) => {
      if (!line || !woUnit || !nextState) return
      const models = hasComposition ? totalModelCount(nextState) : (line.models ?? 1)
      if (hasComposition && validTotals.length && !validTotals.includes(models)) return

      const options: Record<string, unknown> = {
        ...line.options,
        loadoutSummary: hasComposition
          ? summarizeWarOrganComposition(woUnit, nextState)
          : line.options?.loadoutSummary,
      }
      if (hasComposition) options[WO_ROSTER_KEY] = nextState

      const merged = withWoLineMeta(options, nextMeta)
      if (Object.keys(parseWoLineMeta(merged)).length === 0) delete merged[WO_META_KEY]

      const bp =
        unit && woUnit
          ? warOrganLinePoints(unit, woUnit, instanceIndex, nextState) +
            upgradeCost(woUnit.Upgrades, nextMeta.upgradeName) +
            (nextMeta.enhancementId
              ? (enhancementByName(enhancements, nextMeta.enhancementId)?.points ?? 0)
              : 0)
          : line.points

      onSave({
        models,
        points: bp,
        options: merged,
        clearOtherWarlord: Boolean(nextMeta.warlord),
      })
    },
    [line, woUnit, unit, hasComposition, validTotals, instanceIndex, enhancements, onSave],
  )

  useEffect(() => {
    if (!open || !line?.lineId || !state) return
    if (hydratedLineId.current !== line.lineId) return
    persistNow(state, meta)
  }, [open, line?.lineId, state, meta, persistNow])

  if (!open || !line || !unit || !woUnit || !state) return null

  function patchState(next: WoCompositionState) {
    setState(next)
  }

  function patchMeta(next: WoLineMeta) {
    setMeta(next)
  }

  return (
    <AppSheet open={open} onClose={onClose} titleId="wo-unit-edit-title" className="wo-unit-edit-sheet">
      <div className="wo-unit-edit-head flex items-start gap-2 px-4 pb-2 pt-1">
        <div className="min-w-0 flex-1">
          <h2 id="wo-unit-edit-title" className="wo-unit-edit-title">
            {formatWoDisplayName(unit.name)}
          </h2>
          <p className="wo-unit-edit-pts tabular-nums">{points} pts</p>
          {hasComposition && summary && (
            <p className="mt-0.5 truncate text-caption text-muted">{summary}</p>
          )}
        </div>
        <button
          type="button"
          className="wo-unit-edit-close"
          aria-label={copy.common.close}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="app-sheet-scroll px-4 pb-6 pt-0">
        {!totalValid && (
          <p className="mb-3 text-caption text-status-danger">
            Squad must be {validTotals.join(' or ')} models (currently {total})
          </p>
        )}

        {isCharacter && (
          <label className="wo-meta-row wo-meta-row-touch mt-1 flex items-center gap-3 text-body">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0"
              checked={Boolean(meta.warlord)}
              onChange={(e) =>
                patchMeta({ ...meta, warlord: e.target.checked || undefined })
              }
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
                patchMeta({ ...meta, attachedToLineId: e.target.value || undefined })
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-caption"
            >
              <option value="">{copy.armyLists.noLeaderAttachment}</option>
              {leaderTargets.map((t) => (
                <option key={t.lineId} value={t.lineId ?? ''}>
                  {formatWoDisplayName(t.name)}
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
                patchMeta({ ...meta, enhancementId: e.target.value || undefined })
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-caption"
            >
              <option value="">{copy.armyLists.noEnhancement}</option>
              {eligibleEnh.map((e) => (
                <option key={e.name} value={e.name}>
                  {formatWoDisplayName(e.name)} ({e.points} pts)
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
                patchMeta({ ...meta, upgradeName: e.target.value || undefined })
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-caption"
            >
              <option value="">{copy.armyLists.noUpgrade}</option>
              {woUnit.Upgrades!.map((u) => (
                <option key={u.Name} value={u.Name}>
                  {formatWoDisplayName(u.Name)} (+{u.Cost} pts)
                </option>
              ))}
            </select>
          </div>
        )}

        {hasComposition && (
          <section className="wo-composition mt-4">
            <h3 className="text-micro font-semibold uppercase tracking-widest text-muted">
              {copy.armyLists.loadoutHeading}
            </h3>
            <div className="mt-2 space-y-1">
              {(woUnit.UnitComposition?.ModelCompositions ?? []).map((comp, compIdx) => (
                <ModelRowEditor
                  key={`${comp.ModelName}-${compIdx}`}
                  comp={comp}
                  compIdx={compIdx}
                  count={state.modelCounts[compIdx] ?? 0}
                  unit={woUnit}
                  state={state}
                  unitTotal={total}
                  onAdjustRow={(ci, d) => {
                    const next = adjustModelRow(woUnit, state, ci, d)
                    if (next) patchState(next)
                  }}
                  onAdjustOption={(ci, wi, oi, d) => {
                    if (!canAdjustWargearOption(woUnit, state, ci, wi, oi, d)) return
                    const next = adjustWargearOption(state, ci, wi, oi, d)
                    if (next) patchState(next)
                  }}
                  onAdjustChoice={(ci, wi, oi, chi, d) => {
                    if (!canAdjustChoiceCount(woUnit, state, ci, wi, oi, chi, d)) return
                    const next = adjustChoiceCount(state, ci, wi, oi, chi, d)
                    if (next) patchState(next)
                  }}
                  onSelectChoice={(ci, wi, rep, ch) =>
                    patchState(setSingleWargearChoice(state, ci, wi, rep, ch))
                  }
                  onSelectCountedSub={(ci, wi, oi, ch) =>
                    patchState(setCountedSubChoice(state, ci, wi, oi, ch))
                  }
                />
              ))}
            </div>
          </section>
        )}

        <details className="wo-unit-datasheet mt-4">
          <summary className="cursor-pointer text-caption font-medium text-muted">
            {copy.armyLists.showDatasheet}
          </summary>
          <section className="mt-3">
            <UnitDatasheet
              unit={unit}
              enhancementNames={enhancementNames}
              showAdd={false}
              pointsLabel={`${points} pts`}
            />
          </section>
        </details>
      </div>
    </AppSheet>
  )
}
