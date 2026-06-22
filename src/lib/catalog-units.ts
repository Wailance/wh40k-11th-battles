import type { CuratedUnit } from '../types/faction-data'
import { normalizeMfmName } from './mfm-pricing'

export function unitCatalogQuality(unit: CuratedUnit): number {
  let score = 0
  if (unit.factionKeywords?.length) score += 20
  if (unit.keywords?.length) score += 10
  if (unit.pricing?.length) score += 5
  score += unit.rangedWeapons?.length ?? 0
  score += unit.meleeWeapons?.length ?? 0
  score += unit.abilities?.length ?? 0
  if (Object.keys(unit.stats ?? {}).length >= 6) score += 3
  return score
}

/** BSData model/loadout entries that must not appear as separate army list picks. */
export function isListableCatalogUnit(unit: CuratedUnit): boolean {
  if (!unit.factionKeywords?.length && !unit.keywords?.length) return false
  if (unit.pricing?.length) return true
  return unit.points > 0
}

/** Prefer the richest datasheet when BSData exports duplicate names under different ids. */
export function dedupeCatalogUnits(units: CuratedUnit[]): CuratedUnit[] {
  const byName = new Map<string, CuratedUnit>()
  for (const unit of units) {
    const key = normalizeMfmName(unit.name)
    const existing = byName.get(key)
    if (!existing || unitCatalogQuality(unit) > unitCatalogQuality(existing)) {
      byName.set(key, unit)
    }
  }
  return [...byName.values()]
}
