import { resolveWarOrganArmyName } from './warorgan-army-map'

export type WoFactionPalette = {
  name: string
  mainColor: string
  darkColor: string
}

type WoMetaFaction = {
  Name: string
  MainColor: string
  DarkColor: string
}

type WoMeta = {
  Id?: string
  Version?: string
  PublishDate?: string
  factions?: WoMetaFaction[]
}

function normalizeFaction(f: WoMetaFaction): WoFactionPalette {
  return { name: f.Name, mainColor: f.MainColor, darkColor: f.DarkColor }
}

/** Meta faction names that differ from builder army names. */
const PALETTE_ALIASES: Record<string, string> = {
  'Black Templar': 'Black Templars',
  'League of Votann': 'Leagues of Votann',
  "T'au Empire": 'Tau Empire',
  'T\u2019au Empire': 'Tau Empire',
  'Emperor\u2019s Children': "Emperor's Children",
  'Agents of the Imperium': 'Imperial Agents',
}

let metaCache: WoMeta | null = null

export async function loadWarOrganMeta(): Promise<WoMeta> {
  if (metaCache) return metaCache
  const base = import.meta.env.BASE_URL
  const res = await fetch(`${base}data/warorgan/meta.json`)
  if (!res.ok) throw new Error('warorgan meta')
  metaCache = (await res.json()) as WoMeta
  return metaCache
}

export function factionPalette(meta: WoMeta | null, armyName: string): WoFactionPalette | null {
  const factions = meta?.factions
  if (!factions?.length) return null
  const normalized = factions.map(normalizeFaction)
  const candidates = [
    armyName,
    resolveWarOrganArmyName(armyName),
    PALETTE_ALIASES[armyName],
  ].filter(Boolean) as string[]

  for (const name of candidates) {
    const exact = normalized.find((f) => f.name === name)
    if (exact) return exact
    const kw = name.toLowerCase()
    const ci = normalized.find((f) => f.name.toLowerCase() === kw)
    if (ci) return ci
  }
  return null
}

export function woThemeStyle(palette: WoFactionPalette | null): Record<string, string> {
  if (!palette) {
    return {
      '--wo-main': '#2a2d4a',
      '--wo-dark': '#1a1c2e',
      '--wo-accent': '#6b7fd7',
    }
  }
  return {
    '--wo-main': palette.mainColor,
    '--wo-dark': palette.darkColor,
    '--wo-accent': palette.darkColor,
  }
}
