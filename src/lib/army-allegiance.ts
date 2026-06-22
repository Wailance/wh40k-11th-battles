import { armies } from './game-utils'
import type { Army } from '../types/game'

export type Allegiance =
  | 'imperium'
  | 'chaos'
  | 'xenos'
  | 'aeldari'
  | 'space-marines'
  | 'knights'
  | 'hive-fleet'

export type AllegianceLabelKey =
  | 'allegianceImperium'
  | 'allegianceChaos'
  | 'allegianceXenos'
  | 'allegianceAeldari'
  | 'allegianceSpaceMarines'
  | 'allegianceKnights'
  | 'allegianceHiveFleet'

export const ALLEGIANCES: { id: Allegiance; labelKey: AllegianceLabelKey }[] = [
  { id: 'imperium', labelKey: 'allegianceImperium' },
  { id: 'space-marines', labelKey: 'allegianceSpaceMarines' },
  { id: 'knights', labelKey: 'allegianceKnights' },
  { id: 'chaos', labelKey: 'allegianceChaos' },
  { id: 'hive-fleet', labelKey: 'allegianceHiveFleet' },
  { id: 'aeldari', labelKey: 'allegianceAeldari' },
  { id: 'xenos', labelKey: 'allegianceXenos' },
]

/** Explicit builder groups — split out from broad Imperium / Chaos / Xenos. */
const ARMY_ALLEGIANCE: Record<string, Allegiance> = {
  Aeldari: 'aeldari',
  Drukhari: 'aeldari',
  'Black Templar': 'space-marines',
  'Blood Angels': 'space-marines',
  'Dark Angels': 'space-marines',
  Deathwatch: 'space-marines',
  'Grey Knights': 'space-marines',
  'Space Marines': 'space-marines',
  'Space Wolves': 'space-marines',
  'Imperial Knights': 'knights',
  'Chaos Knights': 'knights',
  Tyranids: 'hive-fleet',
  'Genestealer Cults': 'hive-fleet',
}

export function allegianceOf(army: Army): Allegiance {
  const mapped = ARMY_ALLEGIANCE[army.army]
  if (mapped) return mapped
  if (army.category === 'chaos') return 'chaos'
  if (army.category === 'xenos') return 'xenos'
  return 'imperium'
}

export function armiesForAllegiance(allegiance: Allegiance): Army[] {
  return armies.filter((a) => allegianceOf(a) === allegiance)
}

export function findArmy(name: string): Army | undefined {
  return armies.find((a) => a.army === name)
}
