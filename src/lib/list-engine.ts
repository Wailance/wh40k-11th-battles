import type { CuratedUnit, Enhancement, UnitCostBracket, UnitPricingTier } from '../types/faction-data'
import type { ArmyRoster, BattleSize, RosterEnhancement, RosterUnit } from '../types/roster'
import type { SelectedDetachment } from '../types/game'
import type { WoDetachment, WoUnit, WoEnhancement } from '../types/warorgan'
import { getArmyDataEdition } from './faction-loader'
import { detachmentPointBudget, isDetachmentBudgetLegal, wouldDetachmentTagConflict, countEnhancementSlots, maxEnhancementSlots, isUpgradeEnhancement } from './army-construction'
import { maxCopiesForUnit } from './unit-buckets'
import {
  defaultWarOrganComposition,
  parseWarOrganState,
  summarizeWarOrganComposition,
  totalModelCount,
  WO_ROSTER_KEY,
} from './warorgan-composition'
import { warOrganLinePoints } from './warorgan-points'
import { enhancementByName } from './warorgan-enhancements'
import {
  clearLeaderAttachmentsTo,
  clearEnhancementsForDetachedDetachments,
  parseWoLineMeta,
  rosterWarlordLineId,
  setWarlordOnLine,
  upgradeCost,
  withWoLineMeta,
} from './warorgan-roster'
import { woNamesMatch } from './warorgan-names'

export const BATTLE_SIZE_LIMITS: Record<BattleSize, number> = {
  1000: 1000,
  2000: 2000,
}

export interface ListValidationIssue {
  level: 'error' | 'warning'
  message: string
}

function parseInstanceRange(range: string): { min: number; max: number | null } {
  const open = range.match(/\[(\d+),\s*(\)|(\d+))\]/)
  if (!open) return { min: 1, max: null }
  const min = Number(open[1])
  const max = open[2] === ')' ? null : Number(open[2])
  return { min, max }
}

function pricingTierForInstance(pricing: UnitPricingTier[], instance: number): UnitPricingTier {
  for (const tier of pricing) {
    const { min, max } = parseInstanceRange(tier.range)
    if (instance >= min && (max === null || instance <= max)) return tier
  }
  return pricing[0]
}

export function defaultUnitModels(unit: CuratedUnit): number {
  return unit.pricing?.[0]?.costs?.[0]?.models ?? 1
}

export function resolveModelCost(costs: UnitCostBracket[], models: number): number {
  const sorted = [...costs].sort((a, b) => a.models - b.models)
  for (const bracket of sorted) {
    if (models <= bracket.models) return bracket.points
  }
  return sorted[sorted.length - 1]?.points ?? 0
}

export function unitLinePoints(unit: CuratedUnit, instanceIndex: number, models?: number): number {
  if (!unit.pricing?.length) return unit.points
  const tier = pricingTierForInstance(unit.pricing, instanceIndex)
  const modelCount = models ?? tier.costs[0]?.models ?? 1
  return resolveModelCost(tier.costs, modelCount)
}

export function displayUnitPoints(unit: CuratedUnit): string {
  return unit.pointsLabel ?? String(unit.points)
}

export function modelCountChoices(unit: CuratedUnit): number[] {
  const costs = unit.pricing?.[0]?.costs
  if (!costs?.length) return []
  const counts = [...new Set(costs.map((c) => c.models))].sort((a, b) => a - b)
  return counts.length > 1 ? counts : []
}

export function updateRosterLine(
  roster: ArmyRoster,
  lineId: string,
  patch: Partial<Pick<RosterUnit, 'models' | 'options' | 'points'>>,
  catalogUnits: CuratedUnit[] = [],
  woUnits?: Map<string, WoUnit>,
  enhancements: Enhancement[] = [],
): ArmyRoster {
  const units = roster.units.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line))
  return refreshRoster({ ...roster, units }, catalogUnits, woUnits, enhancements)
}


export function unitPoints(unit: CuratedUnit, count = 1): number {
  return unitLinePoints(unit, count, defaultUnitModels(unit))
}

export function calcPointsTotal(
  units: RosterUnit[],
  enhancements: RosterEnhancement[] = [],
  catalogUnits: CuratedUnit[] = [],
  woUnits?: Map<string, WoUnit>,
  catalogEnhancements: Enhancement[] = [],
): number {
  let unitPts = 0

  if (catalogUnits.length > 0) {
    unitPts = priceRosterLines(units, catalogUnits, woUnits, catalogEnhancements).reduce(
      (s, u) => s + u.points,
      0,
    )
  } else {
    for (const ru of units) {
      unitPts += ru.points * Math.max(1, ru.count)
    }
  }

  const enhPts = enhancements.reduce((s, e) => s + e.points, 0)
  return unitPts + enhPts
}

function expandRosterUnits(units: RosterUnit[]): RosterUnit[] {
  const expanded: RosterUnit[] = []
  for (const ru of units) {
    const qty = Math.max(1, ru.count)
    if (ru.lineId && qty === 1) {
      expanded.push({ ...ru, count: 1 })
      continue
    }
    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...ru,
        lineId: crypto.randomUUID(),
        count: 1,
      })
    }
  }
  return expanded
}

export function priceRosterLines(
  units: RosterUnit[],
  catalogUnits: CuratedUnit[],
  woUnits?: Map<string, WoUnit>,
  catalogEnhancements: Enhancement[] = [],
): RosterUnit[] {
  const catalogById = new Map(catalogUnits.map((u) => [u.id, u]))
  const instanceIndex = new Map<string, number>()

  return expandRosterUnits(units).map((ru) => {
    const cu = catalogById.get(ru.unitId)
    const wo = woUnits?.get(ru.unitId)
    const idx = (instanceIndex.get(ru.unitId) ?? 0) + 1
    instanceIndex.set(ru.unitId, idx)
    const woState = parseWarOrganState(ru.options)
    const models = woState
      ? totalModelCount(woState)
      : (ru.models ?? (cu ? defaultUnitModels(cu) : 1))
    let points = cu ? unitLinePoints(cu, idx, models) : ru.points
    if (cu && wo && woState) {
      points = warOrganLinePoints(cu, wo, idx, woState)
    }
    const meta = parseWoLineMeta(ru.options)
    if (wo && meta.upgradeName) {
      points += upgradeCost(wo.Upgrades, meta.upgradeName)
    }
    if (meta.enhancementId) {
      points += enhancementByName(catalogEnhancements, meta.enhancementId)?.points ?? 0
    }
    return { ...ru, count: 1, models, points }
  })
}

export function createEmptyRoster(army: string, battleSize: BattleSize = 2000): ArmyRoster {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: `${army} list`,
    army,
    battleSize,
    dataEdition: getArmyDataEdition(),
    units: [],
    detachments: [],
    enhancements: [],
    pointsTotal: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function rosterUnitCount(roster: ArmyRoster, unitId: string): number {
  return roster.units.filter((u) => u.unitId === unitId).length
}

export function canAddUnit(roster: ArmyRoster, unit: CuratedUnit, count = 1): boolean {
  return rosterUnitCount(roster, unit.id) + count <= maxCopiesForUnit(unit, roster.battleSize)
}

export function addUnit(
  roster: ArmyRoster,
  unit: CuratedUnit,
  count = 1,
  woUnit?: WoUnit,
): ArmyRoster {
  if (!canAddUnit(roster, unit, count)) return roster
  const lines: RosterUnit[] = []
  const existingOfType = roster.units.filter((u) => u.unitId === unit.id).length

  for (let i = 0; i < count; i++) {
    const instanceIdx = existingOfType + i + 1
    if (woUnit?.UnitComposition?.ModelCompositions.length) {
      const woState = defaultWarOrganComposition(woUnit)
      const models = totalModelCount(woState)
      lines.push({
        lineId: crypto.randomUUID(),
        unitId: unit.id,
        name: unit.name,
        points: warOrganLinePoints(unit, woUnit, instanceIdx, woState),
        count: 1,
        models,
        options: {
          loadoutSummary: summarizeWarOrganComposition(woUnit, woState),
          [WO_ROSTER_KEY]: woState,
        },
      })
    } else {
      const models = defaultUnitModels(unit)
      lines.push({
        lineId: crypto.randomUUID(),
        unitId: unit.id,
        name: unit.name,
        points: unitLinePoints(unit, instanceIdx, models),
        count: 1,
        models,
      })
    }
  }

  let result = refreshRoster({ ...roster, units: [...roster.units, ...lines] })
  const newLineId = lines[0]?.lineId
  if (
    newLineId &&
    unit.keywords.some((k) => k.toLowerCase() === 'character') &&
    !rosterWarlordLineId(result.units)
  ) {
    result = refreshRoster({
      ...result,
      units: setWarlordOnLine(result.units, newLineId, true),
    })
  }
  return result
}

export function duplicateRosterLine(
  roster: ArmyRoster,
  lineId: string,
  unit: CuratedUnit,
): ArmyRoster {
  const line = roster.units.find((u) => u.lineId === lineId)
  if (!line || !canAddUnit(roster, unit)) return roster

  const options = line.options
    ? withWoLineMeta(line.options, {
        warlord: undefined,
        attachedToLineId: undefined,
        enhancementId: undefined,
      })
    : undefined

  const newLine: RosterUnit = {
    ...line,
    lineId: crypto.randomUUID(),
    count: 1,
    options,
  }

  return refreshRoster({ ...roster, units: [...roster.units, newLine] })
}

export function removeRosterLine(roster: ArmyRoster, lineId: string): ArmyRoster {
  const removed = roster.units.find((u) => u.lineId === lineId)
  let units = roster.units.filter((u) => u.lineId !== lineId)
  units = clearLeaderAttachmentsTo(units, lineId)
  const enhancements =
    removed != null
      ? roster.enhancements.filter((e) => e.assignedUnitId !== removed.unitId)
      : roster.enhancements
  return refreshRoster({ ...roster, units, enhancements })
}

/** @deprecated use removeRosterLine */
export function removeUnit(roster: ArmyRoster, unitId: string, count = 1): ArmyRoster {
  let remaining = count
  const units = roster.units.filter((u) => {
    if (remaining > 0 && u.unitId === unitId) {
      remaining -= Math.max(1, u.count)
      return false
    }
    return true
  })
  const enhancements = roster.enhancements.filter((e) => e.assignedUnitId !== unitId)
  return refreshRoster({ ...roster, units, enhancements })
}

export function setUnitCount(roster: ArmyRoster, unitId: string, count: number): ArmyRoster {
  if (count <= 0) return removeUnit(roster, unitId, 999)
  const catalogUnit = roster.units.find((u) => u.unitId === unitId)
  if (!catalogUnit) return roster
  const others = roster.units.filter((u) => u.unitId !== unitId)
  const lines: RosterUnit[] = []
  for (let i = 0; i < count; i++) {
    lines.push({
      ...catalogUnit,
      lineId: crypto.randomUUID(),
      count: 1,
    })
  }
  return refreshRoster({ ...roster, units: [...others, ...lines] })
}

export function toggleDetachment(
  roster: ArmyRoster,
  det: SelectedDetachment,
  opts?: { detachmentsRaw?: WoDetachment[]; catalogEnhancements?: Enhancement[] },
): ArmyRoster {
  const idx = roster.detachments.findIndex((d) => woNamesMatch(d.name, det.name))
  let nextDetachments: SelectedDetachment[]
  if (idx >= 0) {
    nextDetachments = roster.detachments.filter((d) => !woNamesMatch(d.name, det.name))
  } else {
    nextDetachments = [...roster.detachments, det]
    if (!isDetachmentBudgetLegal(nextDetachments, roster.battleSize)) return roster
    if (
      opts?.detachmentsRaw &&
      wouldDetachmentTagConflict(opts.detachmentsRaw, roster.detachments, det.name)
    ) {
      return roster
    }
  }

  const selectedNames = new Set(nextDetachments.map((d) => d.name))
  let units = roster.units
  if (opts?.catalogEnhancements?.length) {
    units = clearEnhancementsForDetachedDetachments(units, selectedNames, opts.catalogEnhancements)
  }

  return refreshRoster({ ...roster, detachments: nextDetachments, units })
}

function trimWoEnhancementSlots(
  units: RosterUnit[],
  maxSlots: number,
  catalogEnhancements: Enhancement[],
): RosterUnit[] {
  let result = units.map((u) => ({ ...u }))
  const slotLines = () => {
    const out: { idx: number; name: string; isUpgrade: boolean }[] = []
    for (let i = 0; i < result.length; i++) {
      const name = parseWoLineMeta(result[i].options).enhancementId
      if (!name) continue
      const enh = enhancementByName(catalogEnhancements, name)
      out.push({
        idx: i,
        name,
        isUpgrade: enh ? isUpgradeEnhancement(enh as Enhancement & WoEnhancement) : false,
      })
    }
    return out
  }
  while (
    countEnhancementSlots(
      slotLines().map((e) => ({ enhancementName: e.name, isUpgrade: e.isUpgrade })),
    ) > maxSlots
  ) {
    const lines = slotLines()
    if (!lines.length) break
    const last = lines[lines.length - 1]
    result[last.idx] = {
      ...result[last.idx],
      options: withWoLineMeta(result[last.idx].options, { enhancementId: undefined }),
    }
  }
  return result
}

/** Reconcile detachments, copies, and enhancements when battle size changes. */
export function applyBattleSizeChange(
  roster: ArmyRoster,
  newSize: BattleSize,
  catalogUnits: CuratedUnit[] = [],
  opts?: { catalogEnhancements?: Enhancement[] },
): ArmyRoster {
  if (roster.battleSize === newSize) return roster

  let detachments = [...roster.detachments]
  while (detachments.length > 0 && !isDetachmentBudgetLegal(detachments, newSize)) {
    detachments = detachments.slice(0, -1)
  }

  const selectedNames = new Set(detachments.map((d) => d.name))
  let units = roster.units
  if (opts?.catalogEnhancements?.length) {
    units = clearEnhancementsForDetachedDetachments(units, selectedNames, opts.catalogEnhancements)
  }

  const catalogById = new Map(catalogUnits.map((u) => [u.id, u]))
  const keepIds = new Set<string>()
  const countsByUnitId = new Map<string, number>()
  const removedIds = new Set<string>()

  for (const line of units) {
    const lineId = line.lineId ?? crypto.randomUUID()
    const cu = catalogById.get(line.unitId)
    if (!cu) {
      keepIds.add(lineId)
      continue
    }
    const count = countsByUnitId.get(line.unitId) ?? 0
    const max = maxCopiesForUnit(cu, newSize)
    if (count < max) {
      keepIds.add(lineId)
      countsByUnitId.set(line.unitId, count + 1)
    } else {
      removedIds.add(lineId)
    }
  }

  units = units
    .filter((line) => {
      const id = line.lineId ?? ''
      return keepIds.has(id)
    })
    .map((line) => (line.lineId ? line : { ...line, lineId: crypto.randomUUID() }))

  for (const removedId of removedIds) {
    units = clearLeaderAttachmentsTo(units, removedId)
  }

  let enhancements = roster.enhancements
  const enhMax = maxEnhancementSlots(newSize)
  if (enhancements.length > enhMax) {
    enhancements = enhancements.slice(0, enhMax)
  }
  if (opts?.catalogEnhancements?.length) {
    units = trimWoEnhancementSlots(units, enhMax, opts.catalogEnhancements)
  }

  return { ...roster, battleSize: newSize, detachments, units, enhancements }
}

export function toggleEnhancement(
  roster: ArmyRoster,
  name: string,
  points: number,
): ArmyRoster {
  const idx = roster.enhancements.findIndex((e) => e.name === name)
  if (idx >= 0) {
    return refreshRoster({
      ...roster,
      enhancements: roster.enhancements.filter((e) => e.name !== name),
    })
  }
  return refreshRoster({
    ...roster,
    enhancements: [...roster.enhancements, { name, points }],
  })
}

export function refreshRoster(
  roster: ArmyRoster,
  catalogUnits: CuratedUnit[] = [],
  woUnits?: Map<string, WoUnit>,
  catalogEnhancements: Enhancement[] = [],
): ArmyRoster {
  const units = (
    catalogUnits.length > 0
      ? priceRosterLines(roster.units, catalogUnits, woUnits, catalogEnhancements)
      : expandRosterUnits(roster.units)
  ).map((line) => (line.lineId ? line : { ...line, lineId: crypto.randomUUID() }))
  const next = { ...roster, units }
  return {
    ...next,
    pointsTotal: calcPointsTotal(
      units,
      roster.enhancements,
      catalogUnits,
      woUnits,
      catalogEnhancements,
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function validateRoster(
  roster: ArmyRoster,
  catalogUnits: CuratedUnit[],
): ListValidationIssue[] {
  const issues: ListValidationIssue[] = []
  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]

  const total = calcPointsTotal(roster.units, roster.enhancements, catalogUnits)
  if (total > limit) {
    issues.push({
      level: 'error',
      message: `Over points limit: ${total}/${limit}`,
    })
  }

  const catalogById = new Map(catalogUnits.map((u) => [u.id, u]))
  let characters = 0

  for (const ru of roster.units) {
    const cu = catalogById.get(ru.unitId)
    if (!cu) continue
    const kws = cu.keywords.map((k) => k.toLowerCase())
    const qty = Math.max(1, ru.count)
    if (kws.includes('character')) characters += qty
  }

  if (characters === 0 && roster.units.length > 0) {
    issues.push({
      level: 'error',
      message: 'Army must include at least one Character',
    })
  }

  const countsByUnitId = new Map<string, number>()
  for (const ru of roster.units) {
    countsByUnitId.set(ru.unitId, (countsByUnitId.get(ru.unitId) ?? 0) + 1)
  }
  for (const [unitId, count] of countsByUnitId) {
    const cu = catalogById.get(unitId)
    if (!cu) continue
    const max = maxCopiesForUnit(cu, roster.battleSize)
    if (count > max) {
      issues.push({
        level: 'error',
        message: `Too many ${cu.name}: ${count} (max ${max})`,
      })
    }
  }

  if (!isDetachmentBudgetLegal(roster.detachments, roster.battleSize)) {
    const used = roster.detachments.reduce((s, d) => s + d.dp, 0)
    issues.push({
      level: 'error',
      message: `Detachments use ${used} DP (max ${detachmentPointBudget(roster.battleSize)})`,
    })
  }

  if (
    total < limit - 200 &&
    roster.units.length >= 8 &&
    total >= limit * 0.75
  ) {
    issues.push({
      level: 'warning',
      message: `${limit - total} points remaining`,
    })
  }

  return issues
}

export function filterUnits(
  units: CuratedUnit[],
  query: string,
  keywordFilter: string,
): CuratedUnit[] {
  const trimmed = query.trim()
  const q = trimmed.toLowerCase()
  const maxPoints = /^\d+$/.test(trimmed) ? Number(trimmed) : null

  return units.filter((u) => {
    if (keywordFilter && !u.keywords.some((k) => k.toLowerCase() === keywordFilter.toLowerCase())) {
      return false
    }
    if (maxPoints !== null) return u.points <= maxPoints
    if (!q) return true
    const hay = [u.name, ...u.keywords, ...u.factionKeywords].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function isLegendsUnit(unit: CuratedUnit): boolean {
  return unit.legends === true || /\[legends\]/i.test(unit.name)
}

export function filterLegendsVisibility(
  units: CuratedUnit[],
  showLegends: boolean,
): CuratedUnit[] {
  if (showLegends) return units
  return units.filter((u) => !isLegendsUnit(u))
}

export function rosterSummaryText(roster: ArmyRoster, catalogUnits: CuratedUnit[] = []): string {
  const lines = [
    `${roster.name} — ${roster.army}`,
    `${calcPointsTotal(roster.units, roster.enhancements, catalogUnits)}/${roster.battleSize} pts`,
    '',
  ]

  const priced =
    catalogUnits.length > 0 ? priceRosterLines(roster.units, catalogUnits) : expandRosterUnits(roster.units)

  for (const ru of priced) {
    const models = ru.models ?? 1
    lines.push(`${models}x ${ru.name} — ${ru.points} pts`)
  }

  if (roster.detachments.length) {
    lines.push('', 'Detachments (11e CA):', ...roster.detachments.map((d) => `• ${d.name} (${d.dp} DP)`))
  }
  if (roster.enhancements.length) {
    lines.push('', 'Enhancements:', ...roster.enhancements.map((e) => `• ${e.name} (${e.points} pts)`))
  }
  return lines.join('\n')
}
