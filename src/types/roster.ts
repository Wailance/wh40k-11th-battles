import type { SelectedDetachment } from './game'

export type BattleSize = 1000 | 2000

export interface RosterUnit {
  /** Unique row in the army list (one physical unit entry). */
  lineId?: string
  unitId: string
  name: string
  points: number
  count: number
  models?: number
  options?: Record<string, unknown>
}

export interface RosterEnhancement {
  name: string
  points: number
  assignedUnitId?: string
}

export interface ArmyRoster {
  id: string
  name: string
  army: string
  battleSize: BattleSize
  dataEdition: string
  units: RosterUnit[]
  detachments: SelectedDetachment[]
  enhancements: RosterEnhancement[]
  pointsTotal: number
  createdAt: string
  updatedAt: string
}
