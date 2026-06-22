export interface WoPointBracket {
  ModelCount?: number
  UnitCount?: number
  Cost: number
}

export interface WoWargearOption {
  Replaces?: string[]
  Options: string[]
  Max?: number
  PerXModels?: number
}

export interface WoWargearBlock {
  InitalWargear: string[]
  Options: WoWargearOption[]
}

export interface WoModelComposition {
  ModelName: string
  StatlineRef?: string
  Limit?: { Min?: number; Max?: number }
  Wargear: WoWargearBlock[]
}

export interface WoUnitComposition {
  ModelCompositions: WoModelComposition[]
  WargearDefinitions?: {
    Key: string
    GrantsAbilities?: string[]
    GrantsWeapons?: string[]
    StatAdjustments?: { Target: string; Value: string; Info?: string }[]
  }[]
}

export interface WoWeaponProfile {
  Name: string
  Keywords?: string
  Range?: string
  Attacks?: string
  ToHit?: string
  Strength?: string
  AP?: string
  Damage?: string
}

export interface WoWeaponGroup {
  Name: string
  Weapons: WoWeaponProfile[]
}

export interface WoStatLine {
  Movement: string
  Toughness: string
  Save: string
  Wounds: string
  Leadership: string
  OC: string
  BaseInfo?: { Size?: string }
}

export interface WoUnitAbility {
  Title?: string
  Text?: string
  Name?: string
  Description?: string
}

export interface WoLeaderInfo {
  UnitNames: string[]
  Abilities?: { AbilityId: string; WeaponStatAdjustments?: unknown[] }[]
}

export interface WoUpgrade {
  Name: string
  Cost: number
}

export interface WoUnit {
  Name: string
  Faction?: string
  Keywords: string[]
  FactionKeywords?: string[]
  Points: WoPointBracket[]
  StatLines: WoStatLine[]
  Weapons: WoWeaponGroup[]
  UnitAbilities?: WoUnitAbility[]
  UnitComposition?: WoUnitComposition
  LeaderInfo?: WoLeaderInfo
  Upgrades?: WoUpgrade[]
  CoreAbilities?: string[]
  Infos?: string[]
  Legends?: boolean
}

export interface WoEnhancement {
  Name: string
  Description: string
  Cost: number
  RequiredKeywords?: string[]
  RequiredOneOfKeywords?: string[]
  ExcludedKeywords?: string[]
  RequiredAbilities?: string[]
  WeaponStatAdjustments?: unknown[]
  DatasheetAdjustments?: unknown[]
}

export interface WoStratagem {
  Name: string
  Category?: string
  CPCost: number
  Phase?: string
  When?: string
  Target?: string
  Effect?: string
  Restrictions?: string
}

export interface WoArmyRule {
  Title: string
  Text: string
}

export interface WoDetachment {
  Name: string
  Cost: number
  ForceDispositions: string[]
  Rule?: { Title?: string; Text?: string; Restrictions?: string }
  Enhancements: WoEnhancement[]
  Effects?: unknown[]
  RestrictedUnits?: string[]
  Stratagems?: WoStratagem[]
}

export interface WoFactionData {
  Name: string
  Units: WoUnit[]
  Dettachments: WoDetachment[]
  ArmyRules?: WoArmyRule[]
}

export interface WoCompositionState {
  v: 1
  modelCounts: number[]
  wargear: Record<string, number | string>
}

/** Per-line roster metadata stored in RosterUnit.options */
export interface WoLineMeta {
  enhancementId?: string
  upgradeName?: string
  warlord?: boolean
  /** Leader line → bodyguard lineId */
  attachedToLineId?: string
}

export interface WoArmyListUnit {
  InstanceId?: string
  UnitName: string
  EnhancementId?: string | null
  AttachedToInstanceId?: string | null
  Points?: number
  UnitComposition?: WoCompositionState
  UpgradeName?: string | null
  IsUpgraded?: boolean
}

export interface WoArmyListExport {
  FactionName?: string
  DetachmentName?: string
  MaxPoints?: number
  DataSetId?: string
  PointsTotal?: number
  Units?: WoArmyListUnit[]
}

export interface WarOrganBuilderBundle {
  factionFile: string
  dataVersion: string
  units: import('./faction-data').CuratedUnit[]
  unitDefs: Map<string, WoUnit>
  detachments: import('./game').Detachment[]
  enhancements: import('./faction-data').Enhancement[]
  detachmentsRaw: WoDetachment[]
  armyRules: WoArmyRule[]
}
