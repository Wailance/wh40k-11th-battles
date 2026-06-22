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

export interface UnitCostBracket {
  models: number
  points: number
}

export interface UnitPricingTier {
  range: string
  label: string
  costs: UnitCostBracket[]
}

export interface CuratedUnit {
  id: string
  name: string
  points: number
  pointsLabel?: string
  pricing?: UnitPricingTier[]
  legends?: boolean
  mfmRole?: string
  attachTo?: string[]
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

export interface MfmDetachment {
  name: string
  dp: number
  objective: string
  enhancements: Enhancement[]
}

export interface ArmyMfmMeta {
  slugs: string[]
  version: string
  lastUpdated: string
  detachments: MfmDetachment[]
  enhancements: Enhancement[]
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

/** Pull specific units from another curated slug (e.g. Fortis Kill Team for Agents). */
export interface FactionUnitSupplement {
  slug: string
  names: string[]
}

export interface FactionMapping {
  army: string
  slugs: string[]
  unitFilter?: UnitFilter
  unitSupplements?: FactionUnitSupplement[]
}

export interface FactionMapData {
  dataEdition: string
  disclaimer: string
  mappings: FactionMapping[]
}
