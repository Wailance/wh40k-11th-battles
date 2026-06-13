import type { CuratedUnit } from '../types/faction-data'

export type UnitBucketId = 'epic-hero' | 'hero' | 'battleline' | 'vehicle' | 'mounted' | 'other'

export const BUCKET_ORDER: UnitBucketId[] = [
  'epic-hero',
  'hero',
  'battleline',
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
  if (hasKeyword(unit, 'Vehicle')) return 'vehicle'
  if (hasKeyword(unit, 'Mounted')) return 'mounted'
  return 'other'
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

export function filterByBucket(units: CuratedUnit[], bucketId: UnitBucketId | ''): CuratedUnit[] {
  if (!bucketId) return units
  return units.filter((u) => unitBucket(u) === bucketId)
}
