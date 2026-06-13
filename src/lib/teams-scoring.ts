/** Teams Event Companion — Battle Points from VP differential */

const BP_TABLE: { maxDiff: number; winner: number; loser: number }[] = [
  { maxDiff: 5, winner: 10, loser: 10 },
  { maxDiff: 10, winner: 11, loser: 9 },
  { maxDiff: 15, winner: 12, loser: 8 },
  { maxDiff: 20, winner: 13, loser: 7 },
  { maxDiff: 25, winner: 14, loser: 6 },
  { maxDiff: 30, winner: 15, loser: 5 },
  { maxDiff: 35, winner: 16, loser: 4 },
  { maxDiff: 40, winner: 17, loser: 3 },
  { maxDiff: 45, winner: 18, loser: 2 },
  { maxDiff: 50, winner: 19, loser: 1 },
  { maxDiff: Infinity, winner: 20, loser: 0 },
]

const MATCH_WIN_MARGIN: Record<number, number> = {
  3: 4,
  4: 6,
  5: 6,
  6: 8,
  7: 10,
  8: 12,
}

export function battlePointsFromVp(myVp: number, oppVp: number): number {
  const diff = Math.abs(myVp - oppVp)
  const row = BP_TABLE.find((r) => diff <= r.maxDiff) ?? BP_TABLE[BP_TABLE.length - 1]
  return myVp >= oppVp ? row.winner : row.loser
}

export function teamMatchResult(
  teamABp: number,
  teamBBp: number,
  teamSize: 3 | 4 | 5 | 6 | 7 | 8,
): { winner: 'A' | 'B' | 'draw'; teamAP: number; teamBP: number } {
  const margin = MATCH_WIN_MARGIN[teamSize] ?? 6
  const diff = teamABp - teamBBp
  if (Math.abs(diff) < margin) {
    return { winner: 'draw', teamAP: 2, teamBP: 2 }
  }
  if (diff >= margin) return { winner: 'A', teamAP: 3, teamBP: 1 }
  return { winner: 'B', teamAP: 1, teamBP: 3 }
}
