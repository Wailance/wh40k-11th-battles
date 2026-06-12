/**
 * WTC / team-event 20-point differential scoring.
 * Margin 0–5 VP → 10–10; each additional 5 VP margin → +1 for the winner (max 20–0).
 */
export function wtcPointsForMargin(margin: number): number {
  const m = Math.max(0, margin)
  if (m <= 5) return 10
  return Math.min(20, 10 + Math.ceil((m - 5) / 5))
}

export function calculateWtcScores(
  player1Vp: number,
  player2Vp: number,
): { player1: number; player2: number; margin: number } {
  const diff = player1Vp - player2Vp
  const margin = Math.abs(diff)

  if (diff >= 0) {
    const player1 = wtcPointsForMargin(diff)
    return { player1, player2: 20 - player1, margin }
  }

  const player2 = wtcPointsForMargin(-diff)
  return { player1: 20 - player2, player2, margin }
}

export function formatWtcScore(player1: number, player2: number): string {
  return `${player1}–${player2}`
}
