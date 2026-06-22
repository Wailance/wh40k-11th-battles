import factionMapData from '../data/faction-map.json'
import {
  applyMfmPricingToUnit,
  lookupMfmUnit,
  normalizeMfmName,
  type MfmUnitPricing,
} from './mfm-pricing'
import { dedupeCatalogUnits, isListableCatalogUnit } from './catalog-units'
import { mfmArmyKey } from './space-marine-chapters'
import type {
  ArmyMfmMeta,
  CuratedFaction,
  CuratedUnit,
  Enhancement,
  FactionMapData,
  FactionMapping,
  UnitFilter,
} from '../types/faction-data'
import type { Army, Detachment, ForceDisposition } from '../types/game'
import { publicUrl } from './public-url'

const factionMap = factionMapData as FactionMapData
const cache = new Map<string, CuratedFaction>()
let armyMfmCache: Record<string, ArmyMfmMeta> | null = null
const mfmFactionUnitsCache = new Map<string, MfmUnitPricing[]>()

export function getFactionMapping(army: string): FactionMapping | undefined {
  return factionMap.mappings.find((m) => m.army === army)
}

export function getArmyDataDisclaimer(): string {
  return factionMap.disclaimer
}

export function getArmyDataEdition(): string {
  return factionMap.dataEdition
}

async function loadArmyMfmMap(): Promise<Record<string, ArmyMfmMeta>> {
  if (armyMfmCache) return armyMfmCache
  const res = await fetch(publicUrl('/data/army/mfm/army-map.json'))
  if (!res.ok) {
    armyMfmCache = {}
    return armyMfmCache
  }
  armyMfmCache = (await res.json()) as Record<string, ArmyMfmMeta>
  return armyMfmCache
}

export function mfmDetachmentToGame(d: ArmyMfmMeta['detachments'][number]): Detachment {
  return {
    name: d.name,
    dp: d.dp,
    note: d.objective,
    forceDisposition: d.objective as ForceDisposition,
  }
}

export async function loadArmyBuilderMeta(army: string): Promise<{
  detachments: Detachment[]
  enhancements: Enhancement[]
  version: string
  lastUpdated: string
} | null> {
  const map = await loadArmyMfmMap()
  const meta = map[mfmArmyKey(army)]
  if (!meta) return null
  return {
    detachments: meta.detachments.map(mfmDetachmentToGame),
    enhancements: meta.enhancements.map((e) => ({
      name: e.name,
      points: e.points,
      description: e.detachment ? `${e.detachment} detachment` : '',
      detachment: e.detachment,
    })),
    version: meta.version,
    lastUpdated: meta.lastUpdated,
  }
}

export async function loadArmyEntryForBuilder(army: string, fallback: Army | undefined): Promise<Army | undefined> {
  const meta = await loadArmyBuilderMeta(army)
  if (!meta || meta.detachments.length === 0) return fallback
  return {
    army,
    category: fallback?.category ?? 'imperium',
    factionPackUrl: fallback?.factionPackUrl ?? '',
    detachments: meta.detachments,
  }
}

export function enhancementsForRoster(
  all: Enhancement[],
  detachmentNames: string[],
): Enhancement[] {
  if (!detachmentNames.length) return all
  const selected = new Set(detachmentNames)
  const filtered = all.filter((e) => !e.detachment || selected.has(e.detachment))
  return filtered.length > 0 ? filtered : all
}

function applyUnitFilter(units: CuratedUnit[], filter?: UnitFilter): CuratedUnit[] {
  if (!filter) return units
  return units.filter((u) => {
    const name = u.name
    if (filter.excludeNameContains?.some((s) => name.includes(s))) return false
    if (filter.nameContainsAny?.length) {
      return filter.nameContainsAny.some((s) => name.includes(s))
    }
    if (filter.keyword) {
      return u.keywords.some((k) => k.toLowerCase() === filter.keyword!.toLowerCase())
    }
    return true
  })
}

async function loadMfmFactionUnits(slug: string): Promise<MfmUnitPricing[]> {
  const cached = mfmFactionUnitsCache.get(slug)
  if (cached) return cached
  const res = await fetch(publicUrl(`/data/army/mfm/factions/${slug}.json`))
  if (!res.ok) {
    mfmFactionUnitsCache.set(slug, [])
    return []
  }
  const data = (await res.json()) as { units?: MfmUnitPricing[] }
  const units = data.units ?? []
  mfmFactionUnitsCache.set(slug, units)
  return units
}

async function buildMfmUnitIndex(army: string): Promise<Map<string, MfmUnitPricing>> {
  const map = await loadArmyMfmMap()
  const meta = map[mfmArmyKey(army)]
  if (!meta?.slugs?.length) return new Map()

  const index = new Map<string, MfmUnitPricing>()
  for (const slug of meta.slugs) {
    const units = await loadMfmFactionUnits(slug)
    for (const unit of units) {
      index.set(normalizeMfmName(unit.name), unit)
    }
  }
  return index
}

async function loadSlug(slug: string): Promise<CuratedFaction> {
  const cached = cache.get(slug)
  if (cached) return cached
  const res = await fetch(publicUrl(`/data/army/curated/factions/${slug}.json`))
  if (!res.ok) throw new Error(`Failed to load faction ${slug}`)
  const data = (await res.json()) as CuratedFaction
  cache.set(slug, data)
  return data
}

export async function loadFactionCatalog(army: string): Promise<{
  units: CuratedUnit[]
  enhancements: CuratedFaction['enhancements']
  catalogueNames: string[]
}> {
  const mapping = getFactionMapping(army)
  if (!mapping) throw new Error(`No faction map for ${army}`)

  const factions = await Promise.all(mapping.slugs.map(loadSlug))
  const seen = new Set<string>()
  const units: CuratedUnit[] = []

  for (const f of factions) {
    for (const u of f.units) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      units.push(u)
    }
  }

  for (const supplement of mapping.unitSupplements ?? []) {
    const allowed = new Set(supplement.names.map((name) => normalizeMfmName(name)))
    const extra = await loadSlug(supplement.slug)
    for (const u of extra.units) {
      if (!allowed.has(normalizeMfmName(u.name))) continue
      if (seen.has(u.id)) continue
      seen.add(u.id)
      units.push(u)
    }
  }

  const filtered = applyUnitFilter(units, mapping.unitFilter).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const mfmIndex = await buildMfmUnitIndex(army)
  const priced = dedupeCatalogUnits(
    filtered.map((unit) => {
      const mfm = lookupMfmUnit(mfmIndex, unit.name)
      return mfm ? applyMfmPricingToUnit(unit, mfm) : unit
    }),
  ).filter(isListableCatalogUnit)

  const mfmMeta = await loadArmyBuilderMeta(army)
  const enhancements =
    mfmMeta && mfmMeta.enhancements.length > 0
      ? mfmMeta.enhancements
      : factions.flatMap((f) => f.enhancements)

  return {
    units: priced,
    enhancements,
    catalogueNames: factions.map((f) => f.catalogueName),
  }
}

export async function loadGameSystem(): Promise<{
  categories: string[]
}> {
  const res = await fetch(publicUrl('/data/army/curated/game-system.json'))
  if (!res.ok) return { categories: [] }
  const data = (await res.json()) as { categories?: { name: string }[] }
  return { categories: (data.categories ?? []).map((c) => c.name) }
}
