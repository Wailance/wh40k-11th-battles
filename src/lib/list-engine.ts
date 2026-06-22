import type { CuratedUnit, UnitCostBracket, UnitPricingTier } from '../types/faction-data'
import type { ArmyRoster, BattleSize, RosterEnhancement, RosterUnit } from '../types/roster'
import type { SelectedDetachment } from '../types/game'
import { getArmyDataEdition } from './faction-loader'
import { maxCopiesForUnit } from './unit-buckets'

export const BATTLE_SIZE_LIMITS: Record<BattleSize, number> = {
  1000: 1000,
  2000: 2000,
}

export const MAX_CHARACTERS = 3
export const MAX_EPIC_HEROES = 3

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
  patch: Partial<Pick<RosterUnit, 'models' | 'options'>>,
  catalogUnits: CuratedUnit[] = [],
): ArmyRoster {
  const units = roster.units.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line))
  return refreshRoster({ ...roster, units }, catalogUnits)
}


export function unitPoints(unit: CuratedUnit, count = 1): number {
  return unitLinePoints(unit, count, defaultUnitModels(unit))
}

export function calcPointsTotal(
  units: RosterUnit[],
  enhancements: RosterEnhancement[] = [],
  catalogUnits: CuratedUnit[] = [],
): number {
  let unitPts = 0

  if (catalogUnits.length > 0) {
    unitPts = priceRosterLines(units, catalogUnits).reduce((s, u) => s + u.points, 0)
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

export function priceRosterLines(units: RosterUnit[], catalogUnits: CuratedUnit[]): RosterUnit[] {
  const catalogById = new Map(catalogUnits.map((u) => [u.id, u]))
  const instanceIndex = new Map<string, number>()

  return expandRosterUnits(units).map((ru) => {
    const cu = catalogById.get(ru.unitId)
    const idx = (instanceIndex.get(ru.unitId) ?? 0) + 1
    instanceIndex.set(ru.unitId, idx)
    const models = ru.models ?? (cu ? defaultUnitModels(cu) : 1)
    const points = cu ? unitLinePoints(cu, idx, models) : ru.points
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
  return rosterUnitCount(roster, unit.id) + count <= maxCopiesForUnit(unit)
}

export function addUnit(roster: ArmyRoster, unit: CuratedUnit, count = 1): ArmyRoster {
  if (!canAddUnit(roster, unit, count)) return roster
  const models = defaultUnitModels(unit)
  const lines: RosterUnit[] = []
  const existingOfType = roster.units.filter((u) => u.unitId === unit.id).length

  for (let i = 0; i < count; i++) {
    const instanceIdx = existingOfType + i + 1
    lines.push({
      lineId: crypto.randomUUID(),
      unitId: unit.id,
      name: unit.name,
      points: unitLinePoints(unit, instanceIdx, models),
      count: 1,
      models,
    })
  }

  return refreshRoster({ ...roster, units: [...roster.units, ...lines] })
}

export function removeRosterLine(roster: ArmyRoster, lineId: string): ArmyRoster {
  const removed = roster.units.find((u) => u.lineId === lineId)
  const units = roster.units.filter((u) => u.lineId !== lineId)
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
  maxDp = 3,
): ArmyRoster {
  const idx = roster.detachments.findIndex((d) => d.name === det.name)
  if (idx >= 0) {
    return refreshRoster({
      ...roster,
      detachments: roster.detachments.filter((d) => d.name !== det.name),
    })
  }
  const used = roster.detachments.reduce((s, d) => s + d.dp, 0)
  if (used + det.dp > maxDp) return roster
  return refreshRoster({ ...roster, detachments: [...roster.detachments, det] })
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

export function refreshRoster(roster: ArmyRoster, catalogUnits: CuratedUnit[] = []): ArmyRoster {
  const units =
    catalogUnits.length > 0 ? priceRosterLines(roster.units, catalogUnits) : expandRosterUnits(roster.units)
  const next = { ...roster, units }
  return {
    ...next,
    pointsTotal: calcPointsTotal(units, roster.enhancements, catalogUnits),
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
  let epicHeroes = 0

  for (const ru of roster.units) {
    const cu = catalogById.get(ru.unitId)
    if (!cu) continue
    const kws = cu.keywords.map((k) => k.toLowerCase())
    const qty = Math.max(1, ru.count)
    if (kws.includes('character')) characters += qty
    if (kws.includes('epic hero')) epicHeroes += qty
  }

  if (characters > MAX_CHARACTERS) {
    issues.push({
      level: 'error',
      message: `Too many Characters: ${characters} (max ${MAX_CHARACTERS})`,
    })
  }
  if (epicHeroes > MAX_EPIC_HEROES) {
    issues.push({
      level: 'error',
      message: `Too many Epic Heroes: ${epicHeroes} (max ${MAX_EPIC_HEROES})`,
    })
  }

  const countsByUnitId = new Map<string, number>()
  for (const ru of roster.units) {
    countsByUnitId.set(ru.unitId, (countsByUnitId.get(ru.unitId) ?? 0) + 1)
  }
  for (const [unitId, count] of countsByUnitId) {
    const cu = catalogById.get(unitId)
    if (!cu) continue
    const max = maxCopiesForUnit(cu)
    if (count > max) {
      issues.push({
        level: 'error',
        message: `Too many ${cu.name}: ${count} (max ${max})`,
      })
    }
  }

  const dpUsed = roster.detachments.reduce((s, d) => s + d.dp, 0)
  if (dpUsed > 3) {
    issues.push({ level: 'error', message: `Detachments use ${dpUsed} DP (max 3)` })
  }

  if (total < limit - 200 && roster.units.length > 0) {
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
