export interface WeaponProfile {
  name: string
  range: string
  A: string
  BS?: string
  WS?: string
  S: string
  AP: string
  D: string
  keywords: string[]
}

export interface UnitAbility {
  name: string
  description: string
}

export interface CuratedUnit {
  id: string
  name: string
  points: number
  keywords: string[]
  factionKeywords: string[]
  stats: Record<string, string>
  rangedWeapons: WeaponProfile[]
  meleeWeapons: WeaponProfile[]
  abilities: UnitAbility[]
  leader?: string[]
}

export interface Enhancement {
  name: string
  points: number
  description: string
  detachment?: string
}

export interface CuratedFaction {
  id: string
  name: string
  catalogueName: string
  units: CuratedUnit[]
  enhancements: Enhancement[]
}

export interface UnitFilter {
  nameContainsAny?: string[]
  excludeNameContains?: string[]
  keyword?: string
}

export interface FactionMapping {
  army: string
  slugs: string[]
  unitFilter?: UnitFilter
}

export interface FactionMapData {
  dataEdition: string
  disclaimer: string
  mappings: FactionMapping[]
}
