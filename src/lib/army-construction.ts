import type { CuratedUnit } from '../types/faction-data'
import type { SelectedDetachment } from '../types/game'
import type { BattleSize } from '../types/roster'
import type { WoDetachment, WoUnit } from '../types/warorgan'
import { normalizeWoKey, rawDetachmentsForSelection } from './warorgan-names'

/** 11th edition matched-play army construction limits by battle size. */
export const DETACHMENT_POINT_BUDGET: Record<BattleSize, number> = {
  1000: 2,
  2000: 3,
}

export const MAX_ENHANCEMENT_SLOTS: Record<BattleSize, number> = {
  1000: 2,
  2000: 4,
}

export const DATASHEET_COPY_LIMIT: Record<BattleSize, number> = {
  1000: 2,
  2000: 3,
}

export const BATTLELINE_COPY_MULTIPLIER = 2

function hasKeyword(unit: CuratedUnit, keyword: string): boolean {
  const q = keyword.toLowerCase()
  return unit.keywords.some((k) => k.toLowerCase() === q)
}

export function maxCopiesForUnit(unit: CuratedUnit, battleSize: BattleSize = 2000): number {
  if (hasKeyword(unit, 'Epic Hero')) return 1
  const base = DATASHEET_COPY_LIMIT[battleSize]
  if (hasKeyword(unit, 'Battleline') || hasKeyword(unit, 'Dedicated Transport')) {
    return base * BATTLELINE_COPY_MULTIPLIER
  }
  return base
}

export function detachmentPointBudget(battleSize: BattleSize): number {
  return DETACHMENT_POINT_BUDGET[battleSize]
}

export function maxEnhancementSlots(battleSize: BattleSize): number {
  return MAX_ENHANCEMENT_SLOTS[battleSize]
}

/** GW FAQ: one lone detachment may exceed the DP budget (e.g. 3 DP at 1000 pts). */
export function isDetachmentBudgetLegal(
  detachments: SelectedDetachment[],
  battleSize: BattleSize,
): boolean {
  if (!detachments.length) return true
  const budget = detachmentPointBudget(battleSize)
  const used = detachments.reduce((s, d) => s + d.dp, 0)
  if (used <= budget) return true
  return detachments.length === 1
}

export function detachmentPointsOverBudget(
  detachments: SelectedDetachment[],
  battleSize: BattleSize,
): number {
  const budget = detachmentPointBudget(battleSize)
  const used = detachments.reduce((s, d) => s + d.dp, 0)
  return Math.max(0, used - budget)
}

export function isUpgradeEnhancement(enhancement: { Features?: string }): boolean {
  return enhancement.Features === 'Upgrade'
}

export function isSupportCharacter(woUnit: WoUnit | undefined): boolean {
  if (!woUnit?.LeaderInfo) return false
  return woUnit.LeaderInfo.LeaderType === 'Support'
}

export function isLeaderCharacter(woUnit: WoUnit | undefined): boolean {
  return Boolean(woUnit?.LeaderInfo && woUnit.LeaderInfo.LeaderType !== 'Support')
}

export function normalizeUnitName(name: string): string {
  return normalizeWoKey(name)
}

export function selectedDetachmentsRaw(
  bundle: { detachmentsRaw: WoDetachment[] },
  selected: SelectedDetachment[],
): WoDetachment[] {
  return rawDetachmentsForSelection(bundle as import('../types/warorgan').WarOrganBuilderBundle, selected)
}

/** Detachment tag conflicts (e.g. two ABHUMAN detachments). */
export function findDetachmentTagConflicts(raw: WoDetachment[]): string[] {
  const seen = new Map<string, string>()
  const conflicts: string[] = []
  for (const det of raw) {
    for (const tag of det.Tags ?? []) {
      const key = tag.toUpperCase()
      const prev = seen.get(key)
      if (prev && prev !== det.Name) {
        conflicts.push(`Tag ${tag}: ${prev} and ${det.Name}`)
      } else {
        seen.set(key, det.Name)
      }
    }
  }
  return conflicts
}

/** True if adding `candidateName` would create a tag conflict with current selection. */
export function wouldDetachmentTagConflict(
  raw: WoDetachment[],
  selected: SelectedDetachment[],
  candidateName: string,
): boolean {
  const keys = new Set(selected.map((d) => normalizeWoKey(d.name)))
  keys.add(normalizeWoKey(candidateName))
  const subset = raw.filter((d) => keys.has(normalizeWoKey(d.Name)))
  return findDetachmentTagConflicts(subset).length > 0
}

/** Units forbidden while a detachment with RestrictedUnits is active. */
export function findRestrictedUnitViolations(
  unitNames: string[],
  raw: WoDetachment[],
): { unit: string; detachment: string }[] {
  const violations: { unit: string; detachment: string }[] = []
  const rosterNames = new Set(unitNames.map(normalizeUnitName))
  for (const det of raw) {
    for (const restricted of det.RestrictedUnits ?? []) {
      if (rosterNames.has(normalizeUnitName(restricted))) {
        violations.push({ unit: restricted, detachment: det.Name })
      }
    }
  }
  return violations
}

export function countEnhancementSlots(
  lines: { enhancementName: string; isUpgrade: boolean }[],
): number {
  const byName = new Map<string, { isUpgrade: boolean; count: number }>()
  for (const line of lines) {
    const entry = byName.get(line.enhancementName) ?? {
      isUpgrade: line.isUpgrade,
      count: 0,
    }
    entry.count += 1
    byName.set(line.enhancementName, entry)
  }
  let slots = 0
  for (const { isUpgrade, count } of byName.values()) {
    slots += isUpgrade ? 1 : count
  }
  return slots
}

export function maxUpgradeCopiesForEnhancement(): number {
  return 3
}
