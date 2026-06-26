import type { CuratedUnit } from '../types/faction-data'
import type { BattleSize, RosterUnit } from '../types/roster'
import { maxCopiesForUnit as copiesForBattleSize } from './army-construction'

export type UnitBucketId =
  | 'epic-hero'
  | 'hero'
  | 'battleline'
  | 'transport'
  | 'vehicle'
  | 'mounted'
  | 'other'

export const BUCKET_ORDER: UnitBucketId[] = [
  'epic-hero',
  'hero',
  'battleline',
  'transport',
  'vehicle',
  'mounted',
  'other',
]

function hasKeyword(unit: CuratedUnit, keyword: string): boolean {
  const q = keyword.toLowerCase()
  return unit.keywords.some((k) => k.toLowerCase() === q)
}

export function unitBucket(unit: CuratedUnit): UnitBucketId {
  if (hasKeyword(unit, 'Epic Hero')) return 'epic-hero'
  if (hasKeyword(unit, 'Character')) return 'hero'
  if (hasKeyword(unit, 'Battleline')) return 'battleline'
  if (hasKeyword(unit, 'Dedicated Transport')) return 'transport'
  if (hasKeyword(unit, 'Vehicle')) return 'vehicle'
  if (hasKeyword(unit, 'Mounted')) return 'mounted'
  return 'other'
}

export function maxCopiesForUnit(unit: CuratedUnit, battleSize: BattleSize = 2000): number {
  return copiesForBattleSize(unit, battleSize)
}

export function groupUnitsByBucket(units: CuratedUnit[]): { bucket: UnitBucketId; units: CuratedUnit[] }[] {
  const map = new Map<UnitBucketId, CuratedUnit[]>()
  for (const id of BUCKET_ORDER) map.set(id, [])
  for (const unit of units) {
    map.get(unitBucket(unit))!.push(unit)
  }
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    units: [...map.get(bucket)!].sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.units.length > 0)
}

export type RosterLineEntry = { line: RosterUnit; catalog: CuratedUnit }

export function groupRosterLinesByBucket(
  lines: RosterLineEntry[],
): { bucket: UnitBucketId; lines: RosterLineEntry[] }[] {
  const map = new Map<UnitBucketId, RosterLineEntry[]>()
  for (const id of BUCKET_ORDER) map.set(id, [])
  for (const entry of lines) {
    map.get(unitBucket(entry.catalog))!.push(entry)
  }
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    lines: map.get(bucket)!,
  })).filter((g) => g.lines.length > 0)
}

export function filterByBucket(units: CuratedUnit[], bucketId: UnitBucketId | ''): CuratedUnit[] {
  if (!bucketId) return units
  return units.filter((u) => unitBucket(u) === bucketId)
}
