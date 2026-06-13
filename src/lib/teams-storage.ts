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

export interface ActiveTeamMatch {
  teamSize: TeamSize
  teamAName: string
  teamBName: string
  teamATp: number
  teamBTp: number
  rounds: SavedTeamRound[]
}

export interface SavedTeamMatch extends ActiveTeamMatch {
  id: string
  savedAt: string
  winner: 'A' | 'B' | 'draw'
}

const ACTIVE_ROUND_KEY = 'wh40k11-teams-active'
const ACTIVE_MATCH_KEY = 'wh40k11-teams-match'
const ROUND_HISTORY_KEY = 'wh40k11-teams-history'
const MATCH_HISTORY_KEY = 'wh40k11-teams-match-history'

export const DEFAULT_ACTIVE_ROUND: ActiveTeamRound = {
  teamSize: 5,
  teamAName: 'Team A',
  teamBName: 'Team B',
  games: [],
}

export const DEFAULT_ACTIVE_MATCH: ActiveTeamMatch = {
  teamSize: 5,
  teamAName: 'Team A',
  teamBName: 'Team B',
  teamATp: 0,
  teamBTp: 0,
  rounds: [],
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

function snapshotRound(round: ActiveTeamRound): SavedTeamRound {
  const { teamABp, teamBBp } = sumTeamBp(round.games)
  const match = teamMatchResult(teamABp, teamBBp, round.teamSize)
  return {
    ...round,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    teamABp,
    teamBBp,
    winner: match.winner,
    teamAP: match.teamAP,
    teamBP: match.teamBP,
  }
}

export function loadActiveTeamRound(): ActiveTeamRound {
  try {
    const raw = localStorage.getItem(ACTIVE_ROUND_KEY)
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
  localStorage.setItem(ACTIVE_ROUND_KEY, JSON.stringify(round))
}

export function loadActiveTeamMatch(): ActiveTeamMatch {
  try {
    const raw = localStorage.getItem(ACTIVE_MATCH_KEY)
    if (!raw) return { ...DEFAULT_ACTIVE_MATCH, rounds: [] }
    const parsed = JSON.parse(raw) as Partial<ActiveTeamMatch>
    return {
      teamSize: (parsed.teamSize as TeamSize) ?? DEFAULT_ACTIVE_MATCH.teamSize,
      teamAName: parsed.teamAName?.trim() || DEFAULT_ACTIVE_MATCH.teamAName,
      teamBName: parsed.teamBName?.trim() || DEFAULT_ACTIVE_MATCH.teamBName,
      teamATp: parsed.teamATp ?? 0,
      teamBTp: parsed.teamBTp ?? 0,
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
    }
  } catch {
    return { ...DEFAULT_ACTIVE_MATCH, rounds: [] }
  }
}

export function saveActiveTeamMatch(match: ActiveTeamMatch): void {
  localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(match))
}

export function loadTeamRoundHistory(): SavedTeamRound[] {
  try {
    const raw = localStorage.getItem(ROUND_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as SavedTeamRound[]) : []
  } catch {
    return []
  }
}

export function loadTeamMatchHistory(): SavedTeamMatch[] {
  try {
    const raw = localStorage.getItem(MATCH_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as SavedTeamMatch[]) : []
  } catch {
    return []
  }
}

export function saveTeamRoundToHistory(round: ActiveTeamRound): SavedTeamRound {
  const saved = snapshotRound(round)
  const history = loadTeamRoundHistory()
  history.unshift(saved)
  localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
  return saved
}

export function addRoundToActiveMatch(round: ActiveTeamRound): { match: ActiveTeamMatch; saved: SavedTeamRound } {
  const saved = snapshotRound(round)
  const match = loadActiveTeamMatch()
  const next: ActiveTeamMatch = {
    teamSize: round.teamSize,
    teamAName: round.teamAName,
    teamBName: round.teamBName,
    teamATp: match.teamATp + saved.teamAP,
    teamBTp: match.teamBTp + saved.teamBP,
    rounds: [saved, ...match.rounds],
  }
  saveActiveTeamMatch(next)
  saveTeamRoundToHistory(round)
  return { match: next, saved }
}

export function finishTeamMatch(): SavedTeamMatch | null {
  const match = loadActiveTeamMatch()
  if (match.rounds.length === 0) return null
  const winner =
    match.teamATp > match.teamBTp ? 'A' : match.teamBTp > match.teamATp ? 'B' : ('draw' as const)
  const saved: SavedTeamMatch = {
    ...match,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    winner,
  }
  const history = loadTeamMatchHistory()
  history.unshift(saved)
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
  saveActiveTeamMatch({ ...DEFAULT_ACTIVE_MATCH, rounds: [] })
  return saved
}

export function deleteTeamRoundFromHistory(id: string): void {
  const history = loadTeamRoundHistory().filter((r) => r.id !== id)
  localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(history))
}

export function deleteTeamMatchFromHistory(id: string): void {
  const history = loadTeamMatchHistory().filter((m) => m.id !== id)
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history))
}

export function clearActiveTeamRound(): ActiveTeamRound {
  const next = { ...DEFAULT_ACTIVE_ROUND }
  saveActiveTeamRound(next)
  return next
}

export function clearActiveTeamMatch(): ActiveTeamMatch {
  const next = { ...DEFAULT_ACTIVE_MATCH, rounds: [] }
  saveActiveTeamMatch(next)
  return next
}

export function matchStanding(match: ActiveTeamMatch): { leader: 'A' | 'B' | 'draw'; margin: number } {
  const margin = Math.abs(match.teamATp - match.teamBTp)
  if (match.teamATp > match.teamBTp) return { leader: 'A', margin }
  if (match.teamBTp > match.teamATp) return { leader: 'B', margin }
  return { leader: 'draw', margin: 0 }
}
