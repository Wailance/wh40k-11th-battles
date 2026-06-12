import battlefieldData from '../data/battlefield-layouts.json'
import { gameData } from './game-utils'
import type { ForceDisposition } from '../types/game'

export interface LayoutVariant {
  id: number
  label: string
  title: string
  image: string
  deployment: string
}

export interface MatchupBattlefield {
  matchupId: number
  player1: ForceDisposition
  player2: ForceDisposition
  available: boolean
  variants: LayoutVariant[]
}

const MATCHUP_MAP = battlefieldData.matchups as Record<
  string,
  { variants: LayoutVariant[] }
>

export const BATTLEFIELD_TABLE = battlefieldData.table
export const BATTLEFIELD_SETUP_STEPS = battlefieldData.setupSteps as string[]
export const GW_TERRAIN_LAYOUTS = battlefieldData.gwTerrainLayouts

export function getMatchupBattlefield(matchupId: number | null): MatchupBattlefield | null {
  if (!matchupId) return null

  const layout = gameData.layouts.find((l) => l.id === matchupId)
  if (!layout) return null

  const variants = MATCHUP_MAP[String(matchupId)]?.variants ?? []

  return {
    matchupId,
    player1: layout.player1 as ForceDisposition,
    player2: layout.player2 as ForceDisposition,
    available: layout.available,
    variants,
  }
}

export function hasBattlefieldMap(matchupId: number | null): boolean {
  const bf = getMatchupBattlefield(matchupId)
  return Boolean(bf?.available && bf.variants.length > 0)
}

export function getMatchupsWithMaps(): MatchupBattlefield[] {
  return gameData.layouts
    .map((l) => getMatchupBattlefield(l.id))
    .filter((bf): bf is MatchupBattlefield => Boolean(bf && hasBattlefieldMap(bf.matchupId)))
}

/** Rank alternative matchups that have digital maps (same FD = higher rank). */
export function suggestAlternativeMatchups(currentMatchupId: number): MatchupBattlefield[] {
  const current = getMatchupBattlefield(currentMatchupId)
  const candidates = getMatchupsWithMaps().filter((m) => m.matchupId !== currentMatchupId)
  if (!current) return candidates

  const rank = (m: MatchupBattlefield) => {
    let score = 0
    if (m.player1 === current.player1) score += 2
    if (m.player2 === current.player2) score += 2
    if (m.player1 === current.player2) score += 1
    if (m.player2 === current.player1) score += 1
    return score
  }

  return [...candidates].sort((a, b) => rank(b) - rank(a) || a.matchupId - b.matchupId)
}
