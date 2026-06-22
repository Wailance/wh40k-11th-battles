export interface UnitLoadoutOption {
  id: string
  name: string
  /** GW app row label (e.g. "Kill Team Intercessors with plasma incinerators"). */
  displayName?: string
  min: number
  max: number
  equippedWith?: string
  hint?: string
  groups?: UnitLoadoutGroup[]
}

export interface UnitLoadoutGroup {
  id: string
  name: string
  /** GW app row label when this group renders as one variant bucket. */
  displayName?: string
  min: number
  max: number
  mode: 'single' | 'count' | 'fixed'
  hint?: string
  defaultOptionId?: string
  fixedOptionId?: string
  options: UnitLoadoutOption[]
  groups?: UnitLoadoutGroup[]
}

export interface UnitLoadoutDef {
  groups: UnitLoadoutGroup[]
}

export type FactionLoadouts = Record<string, UnitLoadoutDef>

export type RosterLoadoutSelections = Record<string, number>
