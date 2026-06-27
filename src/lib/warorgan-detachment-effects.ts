import { normalizeWoKey } from './warorgan-names'
import type { WoDetachment, WoUnit } from '../types/warorgan'

interface WoDetachmentEffect {
  AffectedUnits?: string[]
  DatasheetAdjustments?: {
    Target?: string
    Type?: string
    Scope?: string
    Values?: string[]
  }[]
}

/** Keywords granted by selected detachment Effects (e.g. Fulguris → Speeder on Land Speeders). */
export function effectiveUnitKeywords(
  unit: WoUnit,
  detachmentsRaw: WoDetachment[] | undefined,
  selectedDetachmentNames: string[],
): string[] {
  const keywords = new Set<string>([...(unit.Keywords ?? []), ...(unit.FactionKeywords ?? [])])
  if (!detachmentsRaw?.length || !selectedDetachmentNames.length) {
    return [...keywords]
  }

  const selected = new Set(selectedDetachmentNames.map(normalizeWoKey))
  const unitKey = normalizeWoKey(unit.Name)

  for (const det of detachmentsRaw) {
    if (!selected.has(normalizeWoKey(det.Name))) continue
    for (const raw of det.Effects ?? []) {
      const effect = raw as WoDetachmentEffect
      const affects = effect.AffectedUnits?.some((u) => normalizeWoKey(u) === unitKey)
      if (!affects) continue
      for (const adj of effect.DatasheetAdjustments ?? []) {
        if (adj.Target === 'Keywords' && adj.Type === 'Add') {
          for (const v of adj.Values ?? []) keywords.add(v)
        }
      }
    }
  }

  return [...keywords]
}

export function unitHasEffectiveKeyword(
  unit: WoUnit,
  keyword: string,
  detachmentsRaw: WoDetachment[] | undefined,
  selectedDetachmentNames: string[],
): boolean {
  const q = keyword.toLowerCase()
  return effectiveUnitKeywords(unit, detachmentsRaw, selectedDetachmentNames).some(
    (k) => k.toLowerCase() === q,
  )
}
