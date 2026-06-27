import type { GameState } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import { applyMissionsToGame } from './game-utils'

export function prefillGameFromRoster(
  game: GameState,
  roster: ArmyRoster,
  player: 1 | 2,
): GameState {
  const forceDisposition =
    roster.detachments[0]?.forceDisposition ??
    (player === 1 ? game.player1.forceDisposition : game.player2.forceDisposition)

  const playerPatch = {
    name: roster.name,
    army: roster.army,
    detachments: roster.detachments,
    forceDisposition,
    primaryMission: '',
  }

  const next: GameState = {
    ...game,
    battleSize: roster.battleSize,
    player1: player === 1 ? { ...game.player1, ...playerPatch } : game.player1,
    player2: player === 2 ? { ...game.player2, ...playerPatch } : game.player2,
  }

  return applyMissionsToGame(next)
}
