import type { CuratedUnit } from '../types/faction-data'
import type { ArmyRoster, BattleSize, RosterEnhancement, RosterUnit } from '../types/roster'
import type { SelectedDetachment } from '../types/game'
import { getArmyDataEdition } from './faction-loader'

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

export function unitPoints(unit: CuratedUnit, count = 1): number {
  return unit.points * count
}

export function calcPointsTotal(
  units: RosterUnit[],
  enhancements: RosterEnhancement[] = [],
): number {
  const unitPts = units.reduce((s, u) => s + u.points * u.count, 0)
  const enhPts = enhancements.reduce((s, e) => s + e.points, 0)
  return unitPts + enhPts
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

export function addUnit(roster: ArmyRoster, unit: CuratedUnit, count = 1): ArmyRoster {
  const existing = roster.units.find((u) => u.unitId === unit.id)
  const units = existing
    ? roster.units.map((u) =>
        u.unitId === unit.id ? { ...u, count: u.count + count } : u,
      )
    : [
        ...roster.units,
        {
          unitId: unit.id,
          name: unit.name,
          points: unit.points,
          count,
        },
      ]
  return refreshRoster({ ...roster, units })
}

export function removeUnit(roster: ArmyRoster, unitId: string, count = 1): ArmyRoster {
  const units = roster.units
    .map((u) => (u.unitId === unitId ? { ...u, count: u.count - count } : u))
    .filter((u) => u.count > 0)
  const enhancements = roster.enhancements.filter((e) => e.assignedUnitId !== unitId)
  return refreshRoster({ ...roster, units, enhancements })
}

export function setUnitCount(roster: ArmyRoster, unitId: string, count: number): ArmyRoster {
  if (count <= 0) return removeUnit(roster, unitId, 999)
  const units = roster.units.map((u) => (u.unitId === unitId ? { ...u, count } : u))
  return refreshRoster({ ...roster, units })
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

export function refreshRoster(roster: ArmyRoster): ArmyRoster {
  return {
    ...roster,
    pointsTotal: calcPointsTotal(roster.units, roster.enhancements),
    updatedAt: new Date().toISOString(),
  }
}

export function validateRoster(
  roster: ArmyRoster,
  catalogUnits: CuratedUnit[],
): ListValidationIssue[] {
  const issues: ListValidationIssue[] = []
  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]

  if (roster.pointsTotal > limit) {
    issues.push({
      level: 'error',
      message: `Over points limit: ${roster.pointsTotal}/${limit}`,
    })
  }

  const catalogById = new Map(catalogUnits.map((u) => [u.id, u]))
  let characters = 0
  let epicHeroes = 0

  for (const ru of roster.units) {
    const cu = catalogById.get(ru.unitId)
    if (!cu) continue
    const kws = cu.keywords.map((k) => k.toLowerCase())
    if (kws.includes('character')) characters += ru.count
    if (kws.includes('epic hero')) epicHeroes += ru.count
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

  const dpUsed = roster.detachments.reduce((s, d) => s + d.dp, 0)
  if (dpUsed > 3) {
    issues.push({ level: 'error', message: `Detachments use ${dpUsed} DP (max 3)` })
  }

  if (roster.pointsTotal < limit - 200 && roster.units.length > 0) {
    issues.push({
      level: 'warning',
      message: `${limit - roster.pointsTotal} points remaining`,
    })
  }

  return issues
}

export function filterUnits(
  units: CuratedUnit[],
  query: string,
  keywordFilter: string,
): CuratedUnit[] {
  const q = query.trim().toLowerCase()
  return units.filter((u) => {
    if (keywordFilter && !u.keywords.some((k) => k.toLowerCase() === keywordFilter.toLowerCase())) {
      return false
    }
    if (!q) return true
    const hay = [u.name, ...u.keywords, ...u.factionKeywords].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function rosterSummaryText(roster: ArmyRoster): string {
  const lines = [
    `${roster.name} — ${roster.army}`,
    `${roster.pointsTotal}/${roster.battleSize} pts`,
    '',
    ...roster.units.map((u) => `${u.count}x ${u.name} — ${u.points * u.count} pts`),
  ]
  if (roster.detachments.length) {
    lines.push('', 'Detachments (11e CA):', ...roster.detachments.map((d) => `• ${d.name} (${d.dp} DP)`))
  }
  if (roster.enhancements.length) {
    lines.push('', 'Enhancements:', ...roster.enhancements.map((e) => `• ${e.name} (${e.points} pts)`))
  }
  return lines.join('\n')
}
