import type { Enhancement } from '../types/faction-data'
import type { WoDetachment, WoEnhancement, WoUnit } from '../types/warorgan'
import { unitHasEffectiveKeyword } from './warorgan-detachment-effects'
import { normalizeWoKey } from './warorgan-names'

export function woEnhancementEligible(
  unit: WoUnit,
  enhancement: WoEnhancement,
  detachmentsRaw?: WoDetachment[],
  selectedDetachmentNames?: string[],
): boolean {
  const detNames = selectedDetachmentNames ?? []
  const hasKw = (keyword: string) =>
    detachmentsRaw?.length
      ? unitHasEffectiveKeyword(unit, keyword, detachmentsRaw, detNames)
      : [...(unit.Keywords ?? []), ...(unit.FactionKeywords ?? [])].some(
          (k) => k.toLowerCase() === keyword.toLowerCase(),
        )

  if (enhancement.RequiredKeywords?.length) {
    if (!enhancement.RequiredKeywords.every((k) => hasKw(k))) return false
  }
  if (enhancement.RequiredOneOfKeywords?.length) {
    if (!enhancement.RequiredOneOfKeywords.some((k) => hasKw(k))) return false
  }
  if (enhancement.ExcludedKeywords?.length) {
    if (enhancement.ExcludedKeywords.some((k) => hasKw(k))) return false
  }
  return true
}

export function eligibleEnhancementsForUnit(
  unit: WoUnit,
  enhancements: Enhancement[],
  detachmentNames: string[],
  detachmentsRaw?: WoDetachment[],
): Enhancement[] {
  const selected = new Set(detachmentNames.map(normalizeWoKey))
  return enhancements.filter((e) => {
    if (e.detachment && !selected.has(normalizeWoKey(e.detachment))) return false
    const wo = e as Enhancement & WoEnhancement
    return woEnhancementEligible(unit, wo, detachmentsRaw, detachmentNames)
  })
}

export function enhancementByName(
  enhancements: Enhancement[],
  name: string,
): Enhancement | undefined {
  const key = normalizeWoKey(name)
  return enhancements.find((e) => normalizeWoKey(e.name) === key)
}
