import type { CuratedUnit, Enhancement } from '../types/faction-data'
import type { ArmyRoster } from '../types/roster'
import type { WarOrganBuilderBundle, WoEnhancement } from '../types/warorgan'
import {
  countEnhancementSlots,
  detachmentPointBudget,
  findDetachmentTagConflicts,
  findRestrictedUnitViolations,
  isDetachmentBudgetLegal,
  isSupportCharacter,
  isUpgradeEnhancement,
  maxCopiesForUnit,
  maxEnhancementSlots,
  maxUpgradeCopiesForEnhancement,
  selectedDetachmentsRaw,
} from './army-construction'
import type { ListValidationIssue } from './list-engine'
import { BATTLE_SIZE_LIMITS } from './list-engine'
import { isLegendsUnit } from './list-engine'
import { enhancementByName, woEnhancementEligible } from './warorgan-enhancements'
import { getWarOrganUnitDef } from './warorgan-loader'
import { normalizeWoKey } from './warorgan-names'
import { leaderCanAttachToBodyguard, parseWoLineMeta } from './warorgan-roster'
import { compositionMatchesPoints, parseWarOrganState, totalModelCount } from './warorgan-composition'

function hasKeyword(unit: CuratedUnit, keyword: string): boolean {
  const q = keyword.toLowerCase()
  return unit.keywords.some((k) => k.toLowerCase() === q)
}

function attachedLinesToBodyguard(units: ArmyRoster['units'], bodyLineId: string) {
  return units.filter((u) => parseWoLineMeta(u.options).attachedToLineId === bodyLineId)
}

function enhancementRecord(
  name: string,
  enhancements: Enhancement[],
): { isUpgrade: boolean } {
  const enh = enhancementByName(enhancements, name)
  return { isUpgrade: enh ? isUpgradeEnhancement(enh as Enhancement & WoEnhancement) : false }
}

export function validateWarOrganRoster(
  roster: ArmyRoster,
  catalog: CuratedUnit[],
  bundle: WarOrganBuilderBundle,
): ListValidationIssue[] {
  const issues: ListValidationIssue[] = []
  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]
  const catalogById = new Map(catalog.map((u) => [u.id, u]))
  const selectedDetKeys = new Set(roster.detachments.map((d) => normalizeWoKey(d.name)))
  const rawSelected = selectedDetachmentsRaw(bundle, roster.detachments)

  if (roster.pointsTotal > limit) {
    issues.push({ level: 'error', message: `Over points limit: ${roster.pointsTotal}/${limit}` })
  }

  if (!roster.detachments.length && roster.units.length > 0) {
    issues.push({ level: 'warning', message: 'No detachments selected' })
  }

  if (!isDetachmentBudgetLegal(roster.detachments, roster.battleSize)) {
    const used = roster.detachments.reduce((s, d) => s + d.dp, 0)
    const budget = detachmentPointBudget(roster.battleSize)
    issues.push({
      level: 'error',
      message: `Detachments use ${used} DP (max ${budget} for ${roster.battleSize} pts)`,
    })
  }

  for (const conflict of findDetachmentTagConflicts(rawSelected)) {
    issues.push({ level: 'error', message: `Detachment conflict: ${conflict}` })
  }

  const unitNames = roster.units.map((line) => {
    const cu = catalogById.get(line.unitId)
    return cu?.name ?? line.name
  })
  for (const { unit, detachment } of findRestrictedUnitViolations(unitNames, rawSelected)) {
    issues.push({
      level: 'error',
      message: `${unit} cannot be included with ${detachment}`,
    })
  }

  let characters = 0
  let warlords = 0
  const enhancementLines: { enhancementName: string; isUpgrade: boolean }[] = []

  for (const line of roster.units) {
    const cu = catalogById.get(line.unitId)
    if (!cu) continue

    if (hasKeyword(cu, 'Character')) characters += 1
    if (isLegendsUnit(cu)) {
      issues.push({
        level: 'warning',
        message: `${cu.name} is Legends (not matched play legal)`,
      })
    }

    const wo = getWarOrganUnitDef(bundle, line.unitId)
    const meta = parseWoLineMeta(line.options)
    const woState = parseWarOrganState(line.options)

    if (meta.warlord) warlords += 1

    if (wo && woState) {
      const models = totalModelCount(woState)
      if (!compositionMatchesPoints(wo, models)) {
        issues.push({
          level: 'error',
          message: `${line.name}: illegal model count (${models})`,
        })
      }
    }

    if (meta.enhancementId) {
      const detachment = bundle.enhancements.find((e) => e.name === meta.enhancementId)?.detachment
      if (detachment && !selectedDetKeys.has(normalizeWoKey(detachment))) {
        issues.push({
          level: 'error',
          message: `Enhancement ${meta.enhancementId} requires detachment ${detachment}`,
        })
      }
      if (
        !woEnhancementEligibleLine(
          wo,
          meta.enhancementId,
          bundle.enhancements,
          bundle,
          roster.detachments.map((d) => d.name),
        )
      ) {
        issues.push({
          level: 'error',
          message: `${line.name}: enhancement ${meta.enhancementId} not legal for this unit`,
        })
      }
      enhancementLines.push({
        enhancementName: meta.enhancementId,
        ...enhancementRecord(meta.enhancementId, bundle.enhancements),
      })
    }

    if (isSupportCharacter(wo) && !meta.attachedToLineId) {
      issues.push({
        level: 'error',
        message: `${line.name} (Support) must be attached to a unit in the list`,
      })
    }

    if (meta.attachedToLineId) {
      const body = roster.units.find((u) => u.lineId === meta.attachedToLineId)
      const leaderWo = wo
      if (!body) {
        issues.push({ level: 'error', message: `${line.name}: invalid attachment target` })
      } else if (leaderWo?.LeaderInfo?.UnitNames) {
        const bodyName = catalogById.get(body.unitId)?.name ?? body.name
        if (!leaderCanAttachToBodyguard(leaderWo, bodyName, getWarOrganUnitDef(bundle, body.unitId))) {
          issues.push({
            level: 'error',
            message: `${line.name} cannot join ${bodyName}`,
          })
        }
      }
    }
  }

  for (const line of roster.units) {
    if (parseWoLineMeta(line.options).attachedToLineId) continue
    const attached = attachedLinesToBodyguard(roster.units, line.lineId!)
    if (!attached.length) continue

    let leaders = 0
    let supports = 0
    let enhancementsOnGroup = 0
    if (parseWoLineMeta(line.options).enhancementId) enhancementsOnGroup += 1

    for (const att of attached) {
      const attWo = getWarOrganUnitDef(bundle, att.unitId)
      if (isSupportCharacter(attWo)) supports += 1
      else if (attWo?.LeaderInfo) leaders += 1
      if (parseWoLineMeta(att.options).enhancementId) enhancementsOnGroup += 1
    }

    if (leaders > 1) {
      issues.push({ level: 'error', message: `${line.name}: more than one Leader attached` })
    }
    if (supports > 1) {
      issues.push({ level: 'error', message: `${line.name}: more than one Support attached` })
    }
    if (enhancementsOnGroup > 1) {
      issues.push({
        level: 'error',
        message: `${line.name}: only one Enhancement per attached unit`,
      })
    }
  }

  if (characters === 0 && roster.units.length > 0) {
    issues.push({ level: 'error', message: 'Army must include at least one Character' })
  }
  if (warlords > 1) {
    issues.push({ level: 'error', message: 'Only one Warlord allowed' })
  }
  if (warlords === 0 && characters > 0) {
    issues.push({ level: 'warning', message: 'No Warlord selected' })
  }

  const enhSlots = countEnhancementSlots(enhancementLines)
  const enhMax = maxEnhancementSlots(roster.battleSize)
  if (enhSlots > enhMax) {
    issues.push({
      level: 'error',
      message: `Too many Enhancements: ${enhSlots} slots used (max ${enhMax})`,
    })
  }

  const byEnhName = new Map<string, number>()
  for (const line of roster.units) {
    const name = parseWoLineMeta(line.options).enhancementId
    if (!name) continue
    byEnhName.set(name, (byEnhName.get(name) ?? 0) + 1)
  }
  for (const [name, count] of byEnhName) {
    const { isUpgrade } = enhancementRecord(name, bundle.enhancements)
    if (isUpgrade && count > maxUpgradeCopiesForEnhancement()) {
      issues.push({
        level: 'error',
        message: `Upgrade ${name} on ${count} units (max ${maxUpgradeCopiesForEnhancement()})`,
      })
    }
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
      issues.push({ level: 'error', message: `Too many ${cu.name}: ${count} (max ${max})` })
    }
  }

  if (
    roster.pointsTotal < limit - 200 &&
    roster.units.length >= 8 &&
    roster.pointsTotal >= limit * 0.75
  ) {
    issues.push({ level: 'warning', message: `${limit - roster.pointsTotal} points remaining` })
  }

  return issues
}

function woEnhancementEligibleLine(
  wo: ReturnType<typeof getWarOrganUnitDef>,
  enhancementName: string,
  enhancements: Enhancement[],
  bundle: WarOrganBuilderBundle,
  detachmentNames: string[],
): boolean {
  const enh = enhancementByName(enhancements, enhancementName)
  if (!enh) return false
  if (!wo) return true
  return woEnhancementEligible(
    wo,
    enh as Enhancement & WoEnhancement,
    bundle.detachmentsRaw,
    detachmentNames,
  )
}
