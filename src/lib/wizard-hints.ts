import type { GameState, PlayerSetup } from '../types/game'

function secondaryReady(p: PlayerSetup): boolean {
  return p.secondaryMode === 'tactical' || (p.secondaryMode === 'fixed' && p.secondaries.length === 2)
}

export function wizardStepHint(step: number, game: GameState): string | null {
  switch (step) {
    case 0: {
      if (!game.player1.army && !game.player2.army) return 'Select an army for both players'
      if (!game.player1.army) return 'Select Player 1 army'
      if (!game.player2.army) return 'Select Player 2 army'
      return null
    }
    case 1: {
      if (!game.player1.detachments.length && !game.player2.detachments.length) {
        return 'Each player needs at least one detachment (3 DP max)'
      }
      if (!game.player1.detachments.length) return `${game.player1.name || 'Player 1'}: pick detachments`
      if (!game.player2.detachments.length) return `${game.player2.name || 'Player 2'}: pick detachments`
      return null
    }
    case 2:
      if (!game.matchupId) return 'Choose Force Dispositions on the previous step'
      return null
    case 3: {
      if (!game.player1.secondaryMode || !game.player2.secondaryMode) {
        return 'Choose Fixed or Tactical secondaries for both players'
      }
      if (!secondaryReady(game.player1)) {
        return game.player1.secondaryMode === 'fixed'
          ? `${game.player1.name}: pick 2 fixed secondaries`
          : `${game.player1.name}: confirm tactical mode`
      }
      if (!secondaryReady(game.player2)) {
        return game.player2.secondaryMode === 'fixed'
          ? `${game.player2.name}: pick 2 fixed secondaries`
          : `${game.player2.name}: confirm tactical mode`
      }
      return null
    }
    default:
      return null
  }
}
