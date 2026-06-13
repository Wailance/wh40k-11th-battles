import { battlePointsFromVp, teamMatchResult } from './teams-scoring'

export type TeamSize = 3 | 4 | 5 | 6 | 7 | 8

export interface TeamRoundGame {
  p1: number
  p2: number
}

export interface ActiveTeamRound {
  teamSize: TeamSize
  teamAName: string
  teamBName: string
  games: TeamRoundGame[]
}

export interface SavedTeamRound extends ActiveTeamRound {
  id: string
  savedAt: string
  teamABp: number
  teamBBp: number
  winner: 'A' | 'B' | 'draw'
  teamAP: number
  teamBP: number
}

const ACTIVE_KEY = 'wh40k11-teams-active'
const HISTORY_KEY = 'wh40k11-teams-history'

export const DEFAULT_ACTIVE_ROUND: ActiveTeamRound = {
  teamSize: 5,
  teamAName: 'Team A',
  teamBName: 'Team B',
  games: [],
}

export function sumTeamBp(games: TeamRoundGame[]): { teamABp: number; teamBBp: number } {
  return games.reduce(
    (acc, g) => ({
      teamABp: acc.teamABp + battlePointsFromVp(g.p1, g.p2),
      teamBBp: acc.teamBBp + battlePointsFromVp(g.p2, g.p1),
    }),
    { teamABp: 0, teamBBp: 0 },
  )
}

export function loadActiveTeamRound(): ActiveTeamRound {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return { ...DEFAULT_ACTIVE_ROUND }
    const parsed = JSON.parse(raw) as Partial<ActiveTeamRound>
    return {
      teamSize: (parsed.teamSize as TeamSize) ?? DEFAULT_ACTIVE_ROUND.teamSize,
      teamAName: parsed.teamAName?.trim() || DEFAULT_ACTIVE_ROUND.teamAName,
      teamBName: parsed.teamBName?.trim() || DEFAULT_ACTIVE_ROUND.teamBName,
      games: Array.isArray(parsed.games) ? parsed.games : [],
    }
  } catch {
    return { ...DEFAULT_ACTIVE_ROUND }
  }
}

export function saveActiveTeamRound(round: ActiveTeamRound): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(round))
}

export function loadTeamRoundHistory(): SavedTeamRound[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as SavedTeamRound[]) : []
  } catch {
    return []
  }
}

export function saveTeamRoundToHistory(round: ActiveTeamRound): SavedTeamRound {
  const { teamABp, teamBBp } = sumTeamBp(round.games)
  const match = teamMatchResult(teamABp, teamBBp, round.teamSize)
  const saved: SavedTeamRound = {
    ...round,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    teamABp,
    teamBBp,
    winner: match.winner,
    teamAP: match.teamAP,
    teamBP: match.teamBP,
  }
  const history = loadTeamRoundHistory()
  history.unshift(saved)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
  return saved
}

export function deleteTeamRoundFromHistory(id: string): void {
  const history = loadTeamRoundHistory().filter((r) => r.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function clearActiveTeamRound(): ActiveTeamRound {
  const next = { ...DEFAULT_ACTIVE_ROUND }
  saveActiveTeamRound(next)
  return next
}
