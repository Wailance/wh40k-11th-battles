import gameData from '../data/game-data.json'
import { clearSecondaryScoresForCard, deriveTacticalRoundCardsFromTally, getMissionScoreOptions, getTallyCount, isTacticalCardExhausted, registerTacticalRoundCard, secondaryScoreKey, unregisterTacticalRoundCard } from './mission-scoring'
import { shouldAutoRedrawWhenDrawn } from './tactical-when-drawn'
import type {
  Army,
  DominatusBattleMeta,
  DoublesBattleMeta,
  ForceDisposition,
  GameFormat,
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
export const INCURSION_DP = 2

export function maxDpForBattleSize(battleSize: 1000 | 2000 = 2000): number {
  return battleSize === 1000 ? INCURSION_DP : MAX_DP
}

export const FD_COLORS: Record<ForceDisposition, string> =
  gameData.forceDispositionColors as Record<ForceDisposition, string>

const PRIMARY_MATRIX = gameData.primaryMissionMatrix as string[][]

export const FD_SHORT: Record<ForceDisposition, string> = {
  'PURGE THE FOE': 'Purge',
  'TAKE AND HOLD': 'Hold',
  'PRIORITY ASSETS': 'Assets',
  RECONNAISSANCE: 'Recon',
  DISRUPTION: 'Disrupt',
}

export function getPrimaryMission(
  myFd: ForceDisposition,
  opponentFd: ForceDisposition,
): string {
  const row = FD_ORDER.indexOf(myFd)
  const col = FD_ORDER.indexOf(opponentFd)
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
    tacticalAchieved: [],
    tacticalRerollUsed: false,
    extraCpThisRound: 0,
    removedSecondaries: [],
    primaryScoreTally: {},
    secondaryScoreTally: {},
    tacticalRoundCards: [[], [], [], [], []],
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

/** No hand-size cap — returns scores unchanged (kept for call-site stability). */
export function enforceTacticalHandLimit(scores: PlayerScores): PlayerScores {
  return scores
}

/** Draw tactical cards applying When Drawn auto-redraw (round 1). */
export function drawTacticalCardsResolved(
  deck: string[],
  hand: string[],
  battleRound: number,
  count: number,
): { hand: string[]; deck: string[]; redrawn: string[] } {
  let remaining = [...deck]
  const nextHand = [...hand]
  const redrawn: string[] = []
  let slots = count

  for (let guard = 0; guard < 20 && slots > 0 && remaining.length > 0; guard++) {
    const { drawn, remaining: rest } = drawTacticalCards(remaining, 1)
    remaining = rest
    const card = drawn[0]
    if (!card) break

    if (shouldAutoRedrawWhenDrawn(card, battleRound)) {
      remaining = shuffleCardIntoDeck(remaining, card)
      redrawn.push(card)
      continue
    }

    nextHand.push(card)
    slots -= 1
  }

  return { hand: nextHand, deck: remaining, redrawn }
}

/** Draw one tactical card into hand (Random button). Respects When Drawn auto-redraw. */
export function drawOneTacticalToHand(
  scores: PlayerScores,
  battleRound: number,
  fullDeck: string[],
  currentBattleRound?: number,
): PlayerScores {
  const deck = remainingTacticalDeck(scores, fullDeck)
  if (!deck.length) return scores

  const { hand, deck: remaining } = drawTacticalCardsResolved(
    deck,
    scores.tacticalHand,
    battleRound,
    1,
  )
  const drawn = hand.filter((c) => !scores.tacticalHand.includes(c))
  if (!drawn.length) return { ...scores, tacticalDeck: remaining }

  let next: PlayerScores = enforceTacticalHandLimit({ ...scores, tacticalHand: hand, tacticalDeck: remaining })
  if (currentBattleRound == null || battleRound === currentBattleRound) {
    next = registerTacticalRoundCard(next, drawn[0], battleRound)
  }
  return next
}

/** Return an in-hand tactical card to the deck (When Drawn manual redraw). */
export function restoreTacticalCardFromHandToDeck(
  scores: PlayerScores,
  card: string,
  viewRound?: number,
): PlayerScores {
  if (!scores.tacticalHand.includes(card)) return scores

  const hand = scores.tacticalHand.filter((c) => c !== card)
  const fullDeck = gameData.secondaries.tacticalDeck as string[]
  let deck =
    scores.tacticalDeck.length > 0
      ? [...scores.tacticalDeck]
      : fullDeck.filter((c) => !hand.includes(c) && !scores.removedSecondaries.includes(c))
  deck = deck.filter((c) => c !== card)
  deck = shuffleCardIntoDeck(deck, card)

  let next: PlayerScores = { ...scores, tacticalHand: hand, tacticalDeck: deck }
  if (viewRound != null) {
    next = unregisterTacticalRoundCard(next, card, viewRound)
  }
  return next
}

/** Return a permanently discarded tactical card back into the deck. */
export function restoreDiscardedTacticalToDeck(scores: PlayerScores, card: string): PlayerScores {
  if (!scores.removedSecondaries.includes(card)) return scores
  if (scores.tacticalHand.includes(card)) return scores

  const removed = scores.removedSecondaries.filter((c) => c !== card)
  const hand = scores.tacticalHand
  const fullDeck = gameData.secondaries.tacticalDeck as string[]
  let deck =
    scores.tacticalDeck.length > 0
      ? [...scores.tacticalDeck]
      : fullDeck.filter((c) => !hand.includes(c) && !removed.includes(c))
  deck = deck.filter((c) => c !== card)
  deck = shuffleCardIntoDeck(deck, card)

  return { ...scores, removedSecondaries: removed, tacticalDeck: deck }
}

export function shuffleCardIntoDeck(deck: string[], card: string): string[] {
  const next = [...deck, card]
  const j = Math.floor(Math.random() * next.length)
  ;[next[next.length - 1], next[j]] = [next[j], next[next.length - 1]]
  return next
}

/** Remaining tactical cards not in hand or permanently discarded. */
export function remainingTacticalDeck(scores: PlayerScores, fullDeck: string[]): string[] {
  const removed = new Set(scores.removedSecondaries)
  const taken = new Set(scores.tacticalHand)
  if (scores.tacticalDeck.length > 0) {
    return scores.tacticalDeck.filter((c) => !removed.has(c))
  }
  return fullDeck.filter((c) => !taken.has(c) && !removed.has(c))
}

/** Permanently discard a tactical secondary; clears any scored VP. */
export function discardTacticalSecondaryMission(scores: PlayerScores, card: string): PlayerScores {
  let next = clearSecondaryScoresForCard(scores, card)
  const hand = next.tacticalHand.filter((c) => c !== card)
  const removed = next.removedSecondaries.includes(card)
    ? next.removedSecondaries
    : [...next.removedSecondaries, card]
  return enforceTacticalHandLimit({ ...next, tacticalHand: hand, removedSecondaries: removed })
}

/** Permanently discard a fixed secondary; clears any scored VP. */
export function discardFixedSecondaryMission(scores: PlayerScores, card: string): PlayerScores {
  const next = clearSecondaryScoresForCard(scores, card)
  const removed = next.removedSecondaries.includes(card)
    ? next.removedSecondaries
    : [...next.removedSecondaries, card]
  return { ...next, removedSecondaries: removed }
}

/** Remove a scored tactical card from the active hand (achieved & discarded). */
export function discardAchievedTacticalCard(scores: PlayerScores, card: string): PlayerScores {
  const hand = scores.tacticalHand.filter((c) => c !== card)
  const removed = scores.removedSecondaries.includes(card)
    ? scores.removedSecondaries
    : [...scores.removedSecondaries, card]
  return { ...scores, tacticalHand: hand, removedSecondaries: removed }
}

/** At round end: discard tactical cards that were scored this round but still in hand. */
export function discardTacticalScoredInRound(scores: PlayerScores, round: number): PlayerScores {
  const scoredInHand = new Set<string>()
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (getTallyCount(scores.secondaryScoreTally, key, round) <= 0) continue
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card && scores.tacticalHand.includes(card)) scoredInHand.add(card)
  }
  let next = scores
  for (const card of scoredInHand) {
    next = discardAchievedTacticalCard(next, card)
  }
  return next
}

/** Pin active hand + scored cards to a battle round (for past-round edits). */
export function snapshotRoundTacticalCards(scores: PlayerScores, round: number): PlayerScores {
  let next = scores
  for (const card of scores.tacticalHand) {
    next = registerTacticalRoundCard(next, card, round)
  }
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (getTallyCount(scores.secondaryScoreTally, key, round) <= 0) continue
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card) next = registerTacticalRoundCard(next, card, round)
  }
  return next
}

/** Apply GW achieve-and-discard after scoring, or restore hand on undo. */
export function afterTacticalSecondaryScore(
  scores: PlayerScores,
  player: PlayerSetup,
  card: string,
  battleRound: number,
  delta: 1 | -1,
  currentBattleRound?: number,
): PlayerScores {
  if (player.secondaryMode !== 'tactical') return scores

  if (delta === 1) {
    let next =
      currentBattleRound != null && battleRound === currentBattleRound
        ? snapshotRoundTacticalCards(scores, battleRound)
        : scores
    next = registerTacticalRoundCard(next, card, battleRound)
    if (isTacticalCardExhausted(card, next, player, battleRound, undefined, currentBattleRound)) {
      next = discardAchievedTacticalCard(next, card)
    }
    return next
  }

  if (delta === -1) {
    const options = getMissionScoreOptions(card, 'tactical')
    const scoredThisRound = options.some(
      (o) => getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, o.id), battleRound) > 0,
    )
    let next = scores

    const onLiveRound = currentBattleRound == null || battleRound === currentBattleRound
    if (
      !scoredThisRound &&
      onLiveRound &&
      next.removedSecondaries.includes(card) &&
      !next.tacticalHand.includes(card)
    ) {
      next = {
        ...next,
        tacticalHand: [...next.tacticalHand, card],
        removedSecondaries: next.removedSecondaries.filter((c) => c !== card),
      }
    }

    if (scoredThisRound || next.tacticalHand.includes(card)) {
      next = registerTacticalRoundCard(next, card, battleRound)
    } else {
      next = unregisterTacticalRoundCard(next, card, battleRound)
    }
    return enforceTacticalHandLimit(next)
  }

  return scores
}

/** Fix saves where scored tactical cards were never discarded at round end. */
export function healStaleTacticalHand(
  scores: PlayerScores,
  player: PlayerSetup,
  battleRound: number,
): PlayerScores {
  if (player.secondaryMode !== 'tactical') return scores
  let next = scores
  for (let round = 1; round < battleRound; round++) {
    next = discardTacticalScoredInRound(next, round)
  }
  return next
}

export function applyTacticalHandState(
  scores: PlayerScores,
  nextHand: string[],
  restoreDiscardedToDeck: string[] = [],
): PlayerScores {
  const pickable = (card: string) =>
    scores.tacticalHand.includes(card) || scores.tacticalDeck.includes(card)
  const hand = [...new Set(nextHand)].filter(pickable)
  let deck = [...scores.tacticalDeck]
  let removed = [...scores.removedSecondaries]

  for (const card of restoreDiscardedToDeck) {
    if (!removed.includes(card) || hand.includes(card)) continue
    removed = removed.filter((c) => c !== card)
    deck = shuffleCardIntoDeck(deck, card)
  }

  for (const card of hand) {
    if (removed.includes(card)) {
      removed = removed.filter((c) => c !== card)
    }
  }

  deck = deck.filter((c) => !hand.includes(c))

  for (const c of scores.tacticalHand) {
    if (!hand.includes(c) && !removed.includes(c)) {
      deck = shuffleCardIntoDeck(deck, c)
    }
  }

  return {
    ...scores,
    tacticalHand: hand,
    tacticalDeck: deck,
    removedSecondaries: removed,
    tacticalAchieved: [],
  }
}

export function getActiveSecondaries(player: PlayerSetup, scores: PlayerScores): string[] {
  if (player.secondaryMode === 'tactical') {
    const cards = new Set([...scores.tacticalHand])
    for (const key of Object.keys(scores.secondaryScoreTally)) {
      const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
      cards.add(card)
    }
    return [...cards]
  }
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
  maxDp = MAX_DP,
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
  if (playerTotalDp(player) + det.dp > maxDp) return player
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
  let tacticalHand = (s.tacticalHand as string[]) ?? []
  let tacticalDeck = (s.tacticalDeck as string[]) ?? []
  const legacyAchieved = (s.tacticalAchieved as string[]) ?? []

  for (const card of legacyAchieved) {
    if (!tacticalHand.includes(card) && !tacticalDeck.includes(card)) {
      tacticalDeck = shuffleCardIntoDeck(tacticalDeck, card)
    }
  }

  const base: PlayerScores = {
    vp,
    primaryVp: (s.primaryVp as number) ?? vp,
    secondaryVp: (s.secondaryVp as number) ?? 0,
    roundVp,
    primaryRoundVp: (s.primaryRoundVp as number[]) ?? [...roundVp],
    secondaryRoundVp: (s.secondaryRoundVp as number[]) ?? [0, 0, 0, 0, 0],
    tacticalHand,
    tacticalDeck,
    tacticalAchieved: [],
    tacticalRerollUsed: (s.tacticalRerollUsed as boolean) ?? false,
    extraCpThisRound: (s.extraCpThisRound as number) ?? 0,
    removedSecondaries: (s.removedSecondaries as string[]) ?? [],
    primaryScoreTally: (s.primaryScoreTally as Record<string, number[]>) ?? {},
    secondaryScoreTally: (s.secondaryScoreTally as Record<string, number[]>) ?? {},
    tacticalRoundCards: [[], [], [], [], []],
  }

  const migrated = {
    ...base,
    tacticalRoundCards:
      (s.tacticalRoundCards as string[][])?.length === 5
        ? (s.tacticalRoundCards as string[][])
        : deriveTacticalRoundCardsFromTally(base),
  }
  return enforceTacticalHandLimit(migrated)
}

export function migrateGameState(raw: Record<string, unknown>): GameState {
  const g = raw as unknown as GameState
  const format = (g.format as GameFormat) ?? 'standard'
  return {
    ...g,
    format,
    dominatus: g.dominatus as DominatusBattleMeta | undefined,
    doubles: g.doubles as DoublesBattleMeta | undefined,
    player1: migratePlayerSetup(g.player1 as unknown as Record<string, unknown>),
    player2: migratePlayerSetup(g.player2 as unknown as Record<string, unknown>),
    scores: {
      player1: migrateScores(g.scores?.player1 as unknown as Record<string, unknown>),
      player2: migrateScores(g.scores?.player2 as unknown as Record<string, unknown>),
    },
    layoutVariantIndex:
      typeof g.layoutVariantIndex === 'number' ? g.layoutVariantIndex : 0,
    battleSize: g.battleSize === 1000 ? 1000 : 2000,
    preBattleChecks:
      Array.isArray(g.preBattleChecks) && g.preBattleChecks.length === 5
        ? g.preBattleChecks
        : [false, false, false, false, false],
  }
}

export function defaultDominatusMeta(): DominatusBattleMeta {
  return {
    phase: 1,
    player1Alliance: 'liberator',
    player2Alliance: 'oppressor',
    player1AttemptAgenda: false,
    player2AttemptAgenda: false,
    player1AgendaName: '',
    player2AgendaName: '',
    locationNotes: '',
  }
}

export function defaultDoublesMeta(): DoublesBattleMeta {
  return {
    team1Name: 'Team A',
    team2Name: 'Team B',
    team1Player2: '',
    team2Player2: '',
    team1Army2: '',
    team2Army2: '',
    team1Warlord: 1,
    team2Warlord: 1,
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

export function createNewGame(format: GameFormat = 'standard'): GameState {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'setup',
    format,
    dominatus: format === 'dominatus' ? defaultDominatusMeta() : undefined,
    doubles: format === 'doubles' ? defaultDoublesMeta() : undefined,
    matchupId: null,
    layoutVariantIndex: 0,
    battleSize: 2000,
    preBattleChecks: [false, false, false, false, false],
    player1: {
      ...emptyPlayer(),
      name: format === 'doubles' ? 'Team A · Player 1' : 'Player 1',
    },
    player2: {
      ...emptyPlayer(),
      name: format === 'doubles' ? 'Team B · Player 1' : 'Player 2',
    },
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
    player1: { ...game.player1, primaryMission: setup.player1Primary },
    player2: { ...game.player2, primaryMission: setup.player2Primary },
  }
}

export function prepareGameForStart(game: GameState): GameState {
  const g = applyMissionsToGame(game)
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
