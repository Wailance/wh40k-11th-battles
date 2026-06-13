import { armies } from './game-utils'
import type { Army } from '../types/game'

export type Allegiance = 'imperium' | 'chaos' | 'xenos'

export const ALLEGIANCES: { id: Allegiance; labelKey: 'allegianceImperium' | 'allegianceChaos' | 'allegianceXenos' }[] = [
  { id: 'imperium', labelKey: 'allegianceImperium' },
  { id: 'chaos', labelKey: 'allegianceChaos' },
  { id: 'xenos', labelKey: 'allegianceXenos' },
]

export function allegianceOf(army: Army): Allegiance {
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
