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
  const exact = normalized.find((f) => f.name === armyName)
  if (exact) return exact
  const kw = armyName.toLowerCase()
  return normalized.find((f) => f.name.toLowerCase() === kw) ?? null
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
