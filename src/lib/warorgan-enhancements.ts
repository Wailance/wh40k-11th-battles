import type { Enhancement } from '../types/faction-data'
import type { WoEnhancement, WoUnit } from '../types/warorgan'
import { normalizeWoKey } from './warorgan-names'

function hasKeyword(unit: WoUnit, keyword: string): boolean {
  const q = keyword.toLowerCase()
  return [...(unit.Keywords ?? []), ...(unit.FactionKeywords ?? [])].some(
    (k) => k.toLowerCase() === q,
  )
}

export function woEnhancementEligible(unit: WoUnit, enhancement: WoEnhancement): boolean {
  if (enhancement.RequiredKeywords?.length) {
    if (!enhancement.RequiredKeywords.every((k) => hasKeyword(unit, k))) return false
  }
  if (enhancement.RequiredOneOfKeywords?.length) {
    if (!enhancement.RequiredOneOfKeywords.some((k) => hasKeyword(unit, k))) return false
  }
  if (enhancement.ExcludedKeywords?.length) {
    if (enhancement.ExcludedKeywords.some((k) => hasKeyword(unit, k))) return false
  }
  return true
}

export function eligibleEnhancementsForUnit(
  unit: WoUnit,
  enhancements: Enhancement[],
  detachmentNames: string[],
): Enhancement[] {
  const selected = new Set(detachmentNames.map(normalizeWoKey))
  return enhancements.filter((e) => {
    if (e.detachment && !selected.has(normalizeWoKey(e.detachment))) return false
    const wo = e as Enhancement & WoEnhancement
    return woEnhancementEligible(unit, wo)
  })
}

export function enhancementByName(
  enhancements: Enhancement[],
  name: string,
): Enhancement | undefined {
  const key = normalizeWoKey(name)
  return enhancements.find((e) => normalizeWoKey(e.name) === key)
}
