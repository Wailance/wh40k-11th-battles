import type { CuratedUnit, UnitPricingTier } from '../types/faction-data'

export function normalizeMfmName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function inflectMfmNameVariants(name: string): string[] {
  const norm = normalizeMfmName(name)
  const variants = new Set<string>([norm])
  const parts = norm.split(' ').filter(Boolean)
  if (parts.length === 0) return [norm]

  const last = parts[parts.length - 1]
  if (last.endsWith('s') && last.length > 3) {
    variants.add([...parts.slice(0, -1), last.slice(0, -1)].join(' '))
  } else {
    variants.add([...parts.slice(0, -1), `${last}s`].join(' '))
  }

  return [...variants]
}

/** BSData catalogue name → MFM unit name(s) for pricing overlay. */
const CATALOG_MFM_ALIASES: Record<string, string[]> = {}

export function mfmLookupKeysForCatalogUnit(unitName: string): string[] {
  const keys = new Set<string>()
  for (const variant of inflectMfmNameVariants(unitName)) keys.add(variant)
  for (const alias of CATALOG_MFM_ALIASES[normalizeMfmName(unitName)] ?? []) {
    keys.add(alias)
    for (const variant of inflectMfmNameVariants(alias)) keys.add(variant)
  }
  return [...keys]
}

/** Whether a catalogue unit name covers an MFM roster entry (incl. known aliases). */
export function catalogNameSatisfiesMfm(catalogName: string, mfmName: string): boolean {
  const mfmKey = normalizeMfmName(mfmName)
  return mfmLookupKeysForCatalogUnit(catalogName).includes(mfmKey)
}

export function lookupMfmUnit(
  index: Map<string, MfmUnitPricing>,
  unitName: string,
): MfmUnitPricing | undefined {
  for (const key of mfmLookupKeysForCatalogUnit(unitName)) {
    const hit = index.get(key)
    if (hit) return hit
  }
  return undefined
}

export function defaultMfmPoints(pricing: UnitPricingTier[] | undefined): number | null {
  if (!pricing?.length) return null
  return pricing[0]?.costs?.[0]?.points ?? null
}

export function formatMfmPointsLabel(pricing: UnitPricingTier[] | undefined): string | undefined {
  if (!pricing?.length) return undefined
  const costs = pricing[0]?.costs ?? []
  if (!costs.length) return undefined
  if (costs.length === 1) return String(costs[0].points)
  return costs.map((c) => c.points).join('/')
}

export type MfmUnitPricing = {
  name: string
  pricing?: UnitPricingTier[]
  points?: number
  pointsLabel?: string
  legends?: boolean
  role?: string
  attachTo?: string[]
}

export function applyMfmPricingToUnit(
  unit: CuratedUnit,
  mfm: MfmUnitPricing,
): CuratedUnit {
  if (!mfm.pricing?.length) return unit
  const points = mfm.points ?? defaultMfmPoints(mfm.pricing) ?? unit.points
  return {
    ...unit,
    points,
    pricing: mfm.pricing,
    pointsLabel: mfm.pointsLabel ?? formatMfmPointsLabel(mfm.pricing) ?? String(points),
    legends: mfm.legends === true ? true : unit.legends,
    mfmRole: mfm.role ?? unit.mfmRole,
    attachTo: mfm.attachTo ?? unit.attachTo,
  }
}
