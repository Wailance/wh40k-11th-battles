import cards from '../data/mission-cards.json'
import gameData from '../data/game-data.json'
import type { ForceDisposition } from '../types/game'
import { FD_ORDER, FD_SHORT, findMatchup, getPrimaryMission } from './game-utils'
import { hasMissionDetail } from './mission-details'

/** Primary mission deck cards per force disposition (Chapter Approved). */
export const PRIMARY_DECKS: Record<ForceDisposition, string[]> = {
  'PURGE THE FOE': ['Meatgrinder', 'Punishment', 'Consecrate', "Destroyer's Wrath"],
  'TAKE AND HOLD': ['Immovable Object', 'Determined Acquisition', 'Purge and Secure', 'Inescapable Dominion'],
  'PRIORITY ASSETS': ['Vital Link', 'Extract Relic', 'Vanguard Operation', 'Sabotage'],
  RECONNAISSANCE: ['Triangulation', 'Surveil the Foe', 'Gather Intel', 'Search and Scour'],
  DISRUPTION: ['Delaying Action', 'Locate and Deny', 'Outmaneuver', 'Smoke and Mirrors'],
}

export const TACTICAL_SECONDARIES = gameData.secondaries.tacticalDeck as string[]
export const FIXED_SECONDARIES = gameData.secondaries.fixedOptions as string[]

export function primaryMissionsForDeck(fd: ForceDisposition): string[] {
  return PRIMARY_DECKS[fd].filter((name) => hasMissionDetail(name))
}

export function allPrimaryMissionNames(): string[] {
  return Object.keys(cards).filter((name) => {
    const card = cards[name as keyof typeof cards]
    return card && typeof card === 'object' && 'type' in card && card.type === 'primary'
  })
}

export function allSecondaryMissionNames(): string[] {
  return Object.keys(cards).filter((name) => {
    const card = cards[name as keyof typeof cards]
    return card && typeof card === 'object' && 'type' in card && card.type === 'secondary'
  })
}

export function resolveMatchupMissions(p1Fd: ForceDisposition, p2Fd: ForceDisposition) {
  const matchup = findMatchup(p1Fd, p2Fd)
  return {
    matchupId: matchup?.id ?? null,
    player1Primary: getPrimaryMission(p1Fd, p2Fd),
    player2Primary: getPrimaryMission(p2Fd, p1Fd),
  }
}

export { FD_ORDER, FD_SHORT }
