import factionMapData from '../data/faction-map.json'
import type {
  CuratedFaction,
  CuratedUnit,
  FactionMapData,
  FactionMapping,
  UnitFilter,
} from '../types/faction-data'
import { publicUrl } from './public-url'

const factionMap = factionMapData as FactionMapData
const cache = new Map<string, CuratedFaction>()

export function getFactionMapping(army: string): FactionMapping | undefined {
  return factionMap.mappings.find((m) => m.army === army)
}

export function getArmyDataDisclaimer(): string {
  return factionMap.disclaimer
}

export function getArmyDataEdition(): string {
  return factionMap.dataEdition
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

  const filtered = applyUnitFilter(units, mapping.unitFilter).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const enhancements = factions.flatMap((f) => f.enhancements)
  return {
    units: filtered,
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
