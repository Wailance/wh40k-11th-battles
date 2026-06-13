import battlefieldData from '../data/battlefield-layouts.json'
import { gameData } from './game-utils'
import { publicUrl } from './public-url'
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

export function getMatchupBattlefield(matchupId: number | null): MatchupBattlefield | null {
  if (!matchupId) return null

  const layout = gameData.layouts.find((l) => l.id === matchupId)
  if (!layout) return null

  const variants = (MATCHUP_MAP[String(matchupId)]?.variants ?? []).map((v) => ({
    ...v,
    image: publicUrl(v.image),
  }))

  return {
    matchupId,
    player1: layout.player1 as ForceDisposition,
    player2: layout.player2 as ForceDisposition,
    available: layout.available,
    variants,
  }
}
