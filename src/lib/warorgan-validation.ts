import type { CuratedUnit } from '../types/faction-data'
import type { ArmyRoster } from '../types/roster'
import type { WarOrganBuilderBundle } from '../types/warorgan'
import type { ListValidationIssue } from './list-engine'
import { BATTLE_SIZE_LIMITS, MAX_CHARACTERS, MAX_EPIC_HEROES } from './list-engine'
import { maxCopiesForUnit } from './unit-buckets'
import { parseWoLineMeta } from './warorgan-roster'
import { getWarOrganUnitDef } from './warorgan-loader'

const MAX_ENHANCEMENTS = 3

export function validateWarOrganRoster(
  roster: ArmyRoster,
  catalog: CuratedUnit[],
  bundle: WarOrganBuilderBundle,
): ListValidationIssue[] {
  const issues: ListValidationIssue[] = []
  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]
  const catalogById = new Map(catalog.map((u) => [u.id, u]))

  if (roster.pointsTotal > limit) {
    issues.push({ level: 'error', message: `Over points limit: ${roster.pointsTotal}/${limit}` })
  }

  let characters = 0
  let epicHeroes = 0
  let warlords = 0
  let enhancements = 0

  for (const line of roster.units) {
    const cu = catalogById.get(line.unitId)
    if (!cu) continue
    const kws = cu.keywords.map((k) => k.toLowerCase())
    if (kws.includes('character')) characters += 1
    if (kws.includes('epic hero')) epicHeroes += 1

    const meta = parseWoLineMeta(line.options)
    if (meta.warlord) warlords += 1
    if (meta.enhancementId) enhancements += 1

    if (meta.attachedToLineId) {
      const body = roster.units.find((u) => u.lineId === meta.attachedToLineId)
      const leaderWo = getWarOrganUnitDef(bundle, line.unitId)
      if (!body) {
        issues.push({ level: 'error', message: `${line.name}: invalid leader attachment` })
      } else if (leaderWo?.LeaderInfo?.UnitNames) {
        const allowed = leaderWo.LeaderInfo.UnitNames.map((n) => n.toUpperCase())
        if (!allowed.includes(body.name.toUpperCase())) {
          issues.push({
            level: 'error',
            message: `${line.name} cannot lead ${body.name}`,
          })
        }
      }
    }
  }

  if (characters > MAX_CHARACTERS) {
    issues.push({ level: 'error', message: `Too many Characters: ${characters} (max ${MAX_CHARACTERS})` })
  }
  if (epicHeroes > MAX_EPIC_HEROES) {
    issues.push({ level: 'error', message: `Too many Epic Heroes: ${epicHeroes} (max ${MAX_EPIC_HEROES})` })
  }
  if (warlords > 1) {
    issues.push({ level: 'error', message: 'Only one Warlord allowed' })
  }
  if (warlords === 0 && roster.units.length > 0) {
    issues.push({ level: 'warning', message: 'No Warlord selected' })
  }
  if (enhancements > MAX_ENHANCEMENTS) {
    issues.push({ level: 'error', message: `Too many Enhancements: ${enhancements} (max ${MAX_ENHANCEMENTS})` })
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
      issues.push({ level: 'error', message: `Too many ${cu.name}: ${count} (max ${max})` })
    }
  }

  const dpUsed = roster.detachments.reduce((s, d) => s + d.dp, 0)
  if (dpUsed > 3) {
    issues.push({ level: 'error', message: `Detachments use ${dpUsed} DP (max 3)` })
  }

  if (roster.pointsTotal < limit - 200 && roster.units.length > 0) {
    issues.push({ level: 'warning', message: `${limit - roster.pointsTotal} points remaining` })
  }

  return issues
}
