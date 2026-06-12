import { migrateGameState } from './game-utils'
import type { GameState } from '../types/game'

const ACTIVE_KEY = 'wh40k11-active-game'
const HISTORY_KEY = 'wh40k11-game-history'

function parseGame(raw: string): GameState {
  return migrateGameState(JSON.parse(raw) as Record<string, unknown>)
}

export function loadActiveGame(): GameState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? parseGame(raw) : null
  } catch {
    return null
  }
}

export function saveActiveGame(game: GameState): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(game))
}

export function clearActiveGame(): void {
  localStorage.removeItem(ACTIVE_KEY)
}

export function loadHistory(): GameState[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as Record<string, unknown>[]).map(migrateGameState) : []
  } catch {
    return []
  }
}

export function saveToHistory(game: GameState): void {
  const history = loadHistory()
  history.unshift({ ...game, status: 'finished' })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
  clearActiveGame()
}

export function deleteFromHistory(id: string): void {
  const history = loadHistory().filter((g) => g.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}
