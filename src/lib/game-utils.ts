import gameData from '../data/game-data.json'
import type {
  Army,
  ForceDisposition,
  GameState,
  PlayerScores,
  PlayerSetup,
  SecondaryMode,
  SelectedDetachment,
} from '../types/game'

export const armies = [...(gameData.armies as Army[])].sort((a, b) =>
  a.army.localeCompare(b.army, 'en'),
)

export const FD_ORDER = gameData.forceDispositionOrder as ForceDisposition[]
export const MAX_DP = 3

export const FD_COLORS: Record<ForceDisposition, string> =
  gameData.forceDispositionColors as Record<ForceDisposition, string>

export const FD_SHORT: Record<ForceDisposition, string> = {
  'PURGE THE FOE': 'Purge',
  'TAKE AND HOLD': 'Hold',
  'PRIORITY ASSETS': 'Assets',
  RECONNAISSANCE: 'Recon',
  DISRUPTION: 'Disrupt',
}

const OPPONENT_ROW = gameData.opponentForceDispositionRow as Record<ForceDisposition, number>
const PRIMARY_MATRIX = gameData.primaryMissionMatrix as string[][]

export function getPrimaryMission(
  myFd: ForceDisposition,
  opponentFd: ForceDisposition,
): string {
  const row = OPPONENT_ROW[opponentFd]
  const col = FD_ORDER.indexOf(myFd)
  return PRIMARY_MATRIX[row][col]
}

export function findMatchup(fd1: ForceDisposition, fd2: ForceDisposition) {
  return gameData.forceDispositionMatchups.find(
    (m) =>
      (m.player1 === fd1 && m.player2 === fd2) ||
      (m.player1 === fd2 && m.player2 === fd1),
  )
}

export function resolveMissionSetup(
  p1Fd: ForceDisposition,
  p2Fd: ForceDisposition,
) {
  const matchup = findMatchup(p1Fd, p2Fd)
  return {
    matchupId: matchup?.id ?? null,
    player1Primary: getPrimaryMission(p1Fd, p2Fd),
    player2Primary: getPrimaryMission(p2Fd, p1Fd),
  }
}

export function battleReadyBonus(battleReady: boolean): number {
  return battleReady ? (gameData.scoringCaps.battleReadyVp as number) : 0
}

export function emptyScores(): PlayerScores {
  return {
    vp: 0,
    primaryVp: 0,
    secondaryVp: 0,
    roundVp: [0, 0, 0, 0, 0],
    primaryRoundVp: [0, 0, 0, 0, 0],
    secondaryRoundVp: [0, 0, 0, 0, 0],
    tacticalHand: [],
    tacticalDeck: [],
    removedSecondaries: [],
    primaryScoreTally: {},
    secondaryScoreTally: {},
  }
}

export function shuffleDeck<T>(arr: T[]): T[] {
  const deck = [...arr]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function initTacticalDeck(): string[] {
  return shuffleDeck(gameData.secondaries.tacticalDeck as string[])
}

export function drawTacticalCards(deck: string[], count: number): { drawn: string[]; remaining: string[] } {
  const drawn = deck.slice(0, count)
  return { drawn, remaining: deck.slice(count) }
}

export function shuffleCardIntoDeck(deck: string[], card: string): string[] {
  const next = [...deck, card]
  const j = Math.floor(Math.random() * next.length)
  ;[next[next.length - 1], next[j]] = [next[j], next[next.length - 1]]
  return next
}

export function getActiveSecondaries(player: PlayerSetup, scores: PlayerScores): string[] {
  if (player.secondaryMode === 'tactical') return scores.tacticalHand
  return player.secondaries.filter((s) => !scores.removedSecondaries.includes(s))
}

export function secondaryMaxGame(mode: SecondaryMode | null): number {
  if (mode === 'fixed') return gameData.scoringCaps.fixedSecondaryMaxGame as number
  return gameData.scoringCaps.tacticalSecondaryMaxGame as number
}

export function clampVp(
  current: number,
  delta: number,
  max: number,
): number {
  return Math.max(0, Math.min(max, current + delta))
}

export function syncTotalVp(scores: PlayerScores, battleReady = false): PlayerScores {
  const bonus = battleReadyBonus(battleReady)
  const vp = scores.primaryVp + scores.secondaryVp + bonus
  const roundVp = scores.primaryRoundVp.map(
    (p, i) => p + (scores.secondaryRoundVp[i] ?? 0),
  )
  return { ...scores, vp, roundVp }
}

export function playerTotalDp(player: PlayerSetup): number {
  return player.detachments.reduce((sum, d) => sum + d.dp, 0)
}

export function playerForceDispositions(player: PlayerSetup): ForceDisposition[] {
  const seen = new Set<ForceDisposition>()
  return player.detachments
    .map((d) => d.forceDisposition)
    .filter((fd) => {
      if (seen.has(fd)) return false
      seen.add(fd)
      return true
    })
}

export function formatPlayerDetachments(player: PlayerSetup): string {
  if (!player.detachments.length) return '—'
  const names = player.detachments.map((d) => d.name).join(' + ')
  return `${names} (${playerTotalDp(player)} DP)`
}

export function togglePlayerDetachment(
  player: PlayerSetup,
  det: SelectedDetachment,
): PlayerSetup {
  const idx = player.detachments.findIndex((d) => d.name === det.name)
  if (idx >= 0) {
    const detachments = player.detachments.filter((d) => d.name !== det.name)
    const fds = detachments.map((d) => d.forceDisposition)
    const forceDisposition = fds.includes(player.forceDisposition)
      ? player.forceDisposition
      : (fds[0] ?? 'PURGE THE FOE')
    return { ...player, detachments, forceDisposition, primaryMission: '' }
  }
  if (playerTotalDp(player) + det.dp > MAX_DP) return player
  const detachments = [...player.detachments, det]
  const forceDisposition =
    detachments.length === 1 ? det.forceDisposition : player.forceDisposition
  return { ...player, detachments, forceDisposition, primaryMission: '' }
}

export function migratePlayerSetup(raw: Record<string, unknown>): PlayerSetup {
  if (Array.isArray(raw.detachments)) {
    return {
      ...(raw as unknown as PlayerSetup),
      secondaryMode: (raw.secondaryMode as SecondaryMode | null) ?? null,
      battleReady: raw.battleReady !== false,
    }
  }
  const legacy = raw as { detachment?: string; dp?: number; forceDisposition?: ForceDisposition }
  const detachments: SelectedDetachment[] = []
  if (legacy.detachment) {
    detachments.push({
      name: legacy.detachment,
      dp: legacy.dp ?? 0,
      note: '',
      forceDisposition: legacy.forceDisposition ?? 'PURGE THE FOE',
    })
  }
  return {
    name: (raw.name as string) ?? '',
    army: (raw.army as string) ?? '',
    detachments,
    forceDisposition: (raw.forceDisposition as ForceDisposition) ?? 'PURGE THE FOE',
    primaryMission: (raw.primaryMission as string) ?? '',
    secondaryMode: (raw.secondaryMode as SecondaryMode | null) ?? 'fixed',
    secondaries: (raw.secondaries as string[]) ?? [],
    battleReady: raw.battleReady !== false,
  }
}

function migrateScores(raw: Record<string, unknown> | undefined): PlayerScores {
  const s = raw ?? {}
  const vp = (s.vp as number) ?? 0
  const roundVp = (s.roundVp as number[]) ?? [0, 0, 0, 0, 0]
  return {
    vp,
    primaryVp: (s.primaryVp as number) ?? vp,
    secondaryVp: (s.secondaryVp as number) ?? 0,
    roundVp,
    primaryRoundVp: (s.primaryRoundVp as number[]) ?? [...roundVp],
    secondaryRoundVp: (s.secondaryRoundVp as number[]) ?? [0, 0, 0, 0, 0],
    tacticalHand: (s.tacticalHand as string[]) ?? [],
    tacticalDeck: (s.tacticalDeck as string[]) ?? [],
    removedSecondaries: (s.removedSecondaries as string[]) ?? [],
    primaryScoreTally: (s.primaryScoreTally as Record<string, number[]>) ?? {},
    secondaryScoreTally: (s.secondaryScoreTally as Record<string, number[]>) ?? {},
  }
}

export function migrateGameState(raw: Record<string, unknown>): GameState {
  const g = raw as unknown as GameState
  return {
    ...g,
    player1: migratePlayerSetup(g.player1 as unknown as Record<string, unknown>),
    player2: migratePlayerSetup(g.player2 as unknown as Record<string, unknown>),
    scores: {
      player1: migrateScores(g.scores?.player1 as unknown as Record<string, unknown>),
      player2: migrateScores(g.scores?.player2 as unknown as Record<string, unknown>),
    },
    layoutVariantIndex:
      typeof g.layoutVariantIndex === 'number' ? g.layoutVariantIndex : 0,
    mapReferenceMatchupId:
      typeof g.mapReferenceMatchupId === 'number' ? g.mapReferenceMatchupId : null,
  }
}

export function emptyPlayer(): PlayerSetup {
  return {
    name: '',
    army: '',
    detachments: [],
    forceDisposition: 'PURGE THE FOE',
    primaryMission: '',
    secondaryMode: null,
    secondaries: [],
    battleReady: true,
  }
}

export function createNewGame(): GameState {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'setup',
    matchupId: null,
    layoutVariantIndex: 0,
    mapReferenceMatchupId: null,
    player1: { ...emptyPlayer(), name: 'Player 1' },
    player2: { ...emptyPlayer(), name: 'Player 2' },
    firstPlayer: 1,
    attacker: 1,
    battleRound: 1,
    scores: {
      player1: emptyScores(),
      player2: emptyScores(),
    },
    notes: '',
  }
}

export function applyMissionsToGame(game: GameState): GameState {
  const setup = resolveMissionSetup(
    game.player1.forceDisposition,
    game.player2.forceDisposition,
  )
  const matchupChanged = game.matchupId !== setup.matchupId
  return {
    ...game,
    matchupId: setup.matchupId,
    layoutVariantIndex: matchupChanged ? 0 : (game.layoutVariantIndex ?? 0),
    mapReferenceMatchupId: matchupChanged ? null : (game.mapReferenceMatchupId ?? null),
    player1: { ...game.player1, primaryMission: setup.player1Primary },
    player2: { ...game.player2, primaryMission: setup.player2Primary },
  }
}

export function prepareGameForStart(game: GameState): GameState {
  let g = applyMissionsToGame(game)
  const scores = { ...g.scores }

  if (g.player1.secondaryMode === 'tactical') {
    scores.player1 = {
      ...scores.player1,
      tacticalDeck: initTacticalDeck(),
      tacticalHand: [],
    }
  }
  if (g.player2.secondaryMode === 'tactical') {
    scores.player2 = {
      ...scores.player2,
      tacticalDeck: initTacticalDeck(),
      tacticalHand: [],
    }
  }

  return { ...g, scores }
}

export function getWinner(game: GameState): 1 | 2 | 0 {
  if (game.scores.player1.vp > game.scores.player2.vp) return 1
  if (game.scores.player2.vp > game.scores.player1.vp) return 2
  return 0
}

export { gameData }
