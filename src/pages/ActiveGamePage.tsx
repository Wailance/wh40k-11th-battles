import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageLoading } from '../components/PageLoading'
import { DpCost } from '../components/DpDisplay'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { PlayerMissionScorer } from '../components/PlayerMissionScorer'
import {
  drawTacticalCards,
  gameData,
  getActiveSecondaries,
  getWinner,
  shuffleCardIntoDeck,
  syncTotalVp,
} from '../lib/game-utils'
import { BattlefieldMap } from '../components/BattlefieldMap'
import { getMatchupBattlefield } from '../lib/battlefield'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  getMissionScoreOptions,
  incrementTally,
  isTacticalCardExhausted,
  recalcVpFromTallies,
  secondaryScoreKey,
  tacticalDrawCount,
  validateScoreIncrement,
  validateTacticalDraw,
} from '../lib/mission-scoring'
import { clearActiveGame, loadActiveGame, saveActiveGame, saveToHistory } from '../lib/storage'
import { calculateWtcScores } from '../lib/wtc-scoring'
import type { GameState, PlayerScores, PlayerSetup } from '../types/game'

function pruneSecondaryTallies(
  tally: Record<string, number[]>,
  card: string,
): Record<string, number[]> {
  const prefix = `${card}::`
  const next = { ...tally }
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) delete next[key]
  }
  return next
}

function recalcPlayerScores(scores: PlayerScores, player: PlayerSetup): PlayerScores {
  const secondaries = getActiveSecondaries(player, scores)
  const { primaryVp, secondaryVp, primaryRoundVp, secondaryRoundVp } = recalcVpFromTallies(
    scores.primaryScoreTally,
    scores.secondaryScoreTally,
    player.primaryMission,
    secondaries,
    player.secondaryMode,
    DEFAULT_CAPS,
  )
  return syncTotalVp(
    {
      ...scores,
      primaryVp,
      secondaryVp,
      primaryRoundVp,
      secondaryRoundVp,
    },
    player.battleReady,
  )
}

function stripExhaustedTacticalCards(
  scores: PlayerScores,
  player: PlayerSetup,
  battleRound: number,
): PlayerScores {
  if (player.secondaryMode !== 'tactical' || scores.tacticalHand.length === 0) return scores

  const keep: string[] = []
  let tally = scores.secondaryScoreTally
  for (const card of scores.tacticalHand) {
    if (isTacticalCardExhausted(card, { ...scores, secondaryScoreTally: tally }, player, battleRound)) {
      tally = pruneSecondaryTallies(tally, card)
      continue
    }
    keep.push(card)
  }
  if (keep.length === scores.tacticalHand.length) return scores
  return { ...scores, tacticalHand: keep, secondaryScoreTally: tally }
}

export function ActiveGamePage() {
  const navigate = useNavigate()
  const [game, setGame] = useState<GameState | null>(null)
  const [tab, setTab] = useState<'score' | 'mission'>('score')
  const [showEnd, setShowEnd] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)

  useEffect(() => {
    const g = loadActiveGame()
    if (!g || g.status !== 'active') {
      navigate('/new')
      return
    }
    setGame({
      ...g,
      scores: {
        player1: recalcPlayerScores(g.scores.player1, g.player1),
        player2: recalcPlayerScores(g.scores.player2, g.player2),
      },
    })
  }, [navigate])

  if (!game) return <PageLoading label={copy.game.loading} />

  const wtc = calculateWtcScores(game.scores.player1.vp, game.scores.player2.vp)
  const firstName = game.firstPlayer === 1 ? game.player1.name : game.player2.name
  const attackerName = game.attacker === 1 ? game.player1.name : game.player2.name
  const defenderName = game.attacker === 1 ? game.player2.name : game.player1.name

  const persist = (g: GameState) => {
    setGame(g)
    saveActiveGame(g)
  }

  const updateScores = (player: 1 | 2, updater: (s: PlayerScores) => PlayerScores) => {
    const key = player === 1 ? 'player1' : 'player2'
    const setup = game[key]
    const next = recalcPlayerScores(updater(game.scores[key]), setup)
    persist({ ...game, scores: { ...game.scores, [key]: next } })
  }

  const scorePrimary = (player: 1 | 2, optionId: string, delta: 1 | -1) => {
    const setup = player === 1 ? game.player1 : game.player2
    const scores = player === 1 ? game.scores.player1 : game.scores.player2
    const options = getMissionScoreOptions(setup.primaryMission)
    const option = options.find((o) => o.id === optionId)
    if (!option) return
    const check = validateScoreIncrement({
      kind: 'primary',
      option,
      allOptions: options,
      scores,
      player: setup,
      battleRound: game.battleRound,
      delta,
    })
    if (!check.allowed) return

    updateScores(player, (s) => {
      const next = incrementTally(s.primaryScoreTally, optionId, game.battleRound, delta)
      if (!next) return s
      return { ...s, primaryScoreTally: next }
    })
  }

  const scoreSecondary = (player: 1 | 2, card: string, optionId: string, delta: 1 | -1) => {
    const setup = player === 1 ? game.player1 : game.player2
    const scores = player === 1 ? game.scores.player1 : game.scores.player2
    const options = getMissionScoreOptions(card, setup.secondaryMode)
    const option = options.find((o) => o.id === optionId)
    if (!option) return
    const check = validateScoreIncrement({
      kind: 'secondary',
      option,
      allOptions: options,
      scores,
      player: setup,
      battleRound: game.battleRound,
      delta,
      secondaryCard: card,
    })
    if (!check.allowed) return

    const key = secondaryScoreKey(card, optionId)
    updateScores(player, (s) => {
      const next = incrementTally(s.secondaryScoreTally, key, game.battleRound, delta)
      if (!next) return s
      const withTally = { ...s, secondaryScoreTally: next }
      return delta === 1 ? stripExhaustedTacticalCards(withTally, setup, game.battleRound) : withTally
    })
  }

  const drawTactical = (player: 1 | 2) => {
    const key = player === 1 ? 'player1' : 'player2'
    const p = game[key]
    const scores = player === 1 ? game.scores.player1 : game.scores.player2
    if (p.secondaryMode !== 'tactical') return
    if (!validateTacticalDraw(scores).allowed) return

    updateScores(player, (s) => {
      const deck = s.tacticalDeck.length
        ? s.tacticalDeck
        : [...(gameData.secondaries.tacticalDeck as string[])]
      const count = tacticalDrawCount(s)
      if (count < 1) return s
      const { drawn, remaining } = drawTacticalCards(deck, count)
      return {
        ...s,
        tacticalDeck: remaining,
        tacticalHand: [...s.tacticalHand, ...drawn],
      }
    })
  }

  const returnSecondaryToDeck = (player: 1 | 2, card: string, index: number) => {
    updateScores(player, (s) => {
      const hand = [...s.tacticalHand]
      if (hand[index] !== card) return s
      hand.splice(index, 1)
      return {
        ...s,
        tacticalHand: hand,
        tacticalDeck: shuffleCardIntoDeck(s.tacticalDeck, card),
        secondaryScoreTally: pruneSecondaryTallies(s.secondaryScoreTally, card),
      }
    })
  }

  const discardSecondary = (player: 1 | 2, card: string, index: number) => {
    updateScores(player, (s) => {
      const hand = [...s.tacticalHand]
      if (hand[index] !== card) return s
      hand.splice(index, 1)
      return {
        ...s,
        tacticalHand: hand,
        secondaryScoreTally: pruneSecondaryTallies(s.secondaryScoreTally, card),
      }
    })
  }

  const removeFixedSecondary = (player: 1 | 2, card: string) => {
    updateScores(player, (s) => ({
      ...s,
      removedSecondaries: [...s.removedSecondaries, card],
      secondaryScoreTally: pruneSecondaryTallies(s.secondaryScoreTally, card),
    }))
  }

  const endGame = () => {
    saveToHistory(game)
    navigate('/history')
  }

  const abandon = () => {
    clearActiveGame()
    navigate('/')
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="app-btn-ghost px-3 py-1.5 text-xs">
            {copy.game.home}
          </button>
          <span className="app-chip">Round {game.battleRound} of 5</span>
          <button
            type="button"
            onClick={() => setShowAbandon(true)}
            className="app-btn-ghost px-3 py-1.5 text-xs"
          >
            {copy.game.abandon}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="app-chip !py-1">
            {copy.game.firstPlayer}: {firstName}
          </span>
          <span className="app-chip !py-1">
            {copy.game.attacker}: {attackerName}
          </span>
          <span className="app-chip !py-1">
            {copy.game.defender}: {defenderName}
          </span>
        </div>

        <div className="flex gap-2">
          <Link to="/rules" className="app-btn-ghost flex-1 py-2 text-center text-xs">
            {copy.game.rulesShortcut}
          </Link>
          <button
            type="button"
            onClick={() => setTab('mission')}
            className="app-btn-ghost flex-1 py-2 text-xs"
          >
            {copy.game.mapShortcut}
          </button>
        </div>

        <div className="app-sticky-score">
        <div className="app-panel-elevated p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-p1)' }}>
                {game.player1.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {game.scores.player1.primaryVp}P · {game.scores.player1.secondaryVp}S
                {game.player1.battleReady && ' · +10 BR'}
              </p>
            </div>
            <span className="pt-1 font-display text-sm text-muted">vs</span>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-p2)' }}>
                {game.player2.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {game.scores.player2.primaryVp}P · {game.scores.player2.secondaryVp}S
                {game.player2.battleReady && ' · +10 BR'}
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center">
              <p className="font-display text-4xl tabular-nums leading-none tracking-tight">
                <span style={{ color: 'var(--color-p1)' }}>{game.scores.player1.vp}</span>
                <span className="mx-2 text-xl font-normal text-muted/50">–</span>
                <span style={{ color: 'var(--color-p2)' }}>{game.scores.player2.vp}</span>
              </p>
              <p className="mt-2 text-[11px] text-muted">{copy.game.victoryPoints}</p>
            </div>
            <div className="rounded-xl border border-crimson/20 bg-crimson-soft px-3 py-3 text-center">
              <p className="font-display text-4xl tabular-nums leading-none tracking-tight text-bone">
                <span style={{ color: 'var(--color-p1)' }}>{wtc.player1}</span>
                <span className="mx-2 text-xl font-normal text-muted/50">–</span>
                <span style={{ color: 'var(--color-p2)' }}>{wtc.player2}</span>
              </p>
              <p className="mt-2 text-[11px] text-muted">{copy.game.wtcScore}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted/80">{copy.game.wtcMargin(wtc.margin)}</p>
        </div>
        </div>

        <div className="app-segment" role="tablist" aria-label="Game views">
          {(['score', 'mission'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              data-active={tab === t}
              onClick={() => setTab(t)}
              className="app-segment-btn"
            >
              {t === 'score' ? copy.game.tabScore : copy.game.tabMission}
            </button>
          ))}
        </div>

        {tab === 'score' && (
          <>
            <PlayerMissionScorer
              player={game.player1}
              scores={game.scores.player1}
              color="var(--color-p1)"
              battleRound={game.battleRound}
              isSecondPlayer={game.firstPlayer === 2}
              onPrimaryScore={(id, d) => scorePrimary(1, id, d)}
              onSecondaryScore={(card, id, d) => scoreSecondary(1, card, id, d)}
              onDrawTactical={() => drawTactical(1)}
              onReturnToDeck={(card, i) => returnSecondaryToDeck(1, card, i)}
              onDiscardSecondary={(card, i) => discardSecondary(1, card, i)}
              onRemoveFixedSecondary={(card) => removeFixedSecondary(1, card)}
            />

            <PlayerMissionScorer
              player={game.player2}
              scores={game.scores.player2}
              color="var(--color-p2)"
              battleRound={game.battleRound}
              isSecondPlayer={game.firstPlayer === 1}
              onPrimaryScore={(id, d) => scorePrimary(2, id, d)}
              onSecondaryScore={(card, id, d) => scoreSecondary(2, card, id, d)}
              onDrawTactical={() => drawTactical(2)}
              onReturnToDeck={(card, i) => returnSecondaryToDeck(2, card, i)}
              onDiscardSecondary={(card, i) => discardSecondary(2, card, i)}
              onRemoveFixedSecondary={(card) => removeFixedSecondary(2, card)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                disabled={game.battleRound <= 1}
                onClick={() => persist({ ...game, battleRound: game.battleRound - 1 })}
                className="app-btn-ghost flex-1 py-3 disabled:opacity-30"
              >
                {copy.game.prevRound}
              </button>
              <button
                type="button"
                disabled={game.battleRound >= 5}
                onClick={() => persist({ ...game, battleRound: game.battleRound + 1 })}
                className="app-btn-ghost flex-1 py-3 disabled:opacity-30"
              >
                {copy.game.nextRound}
              </button>
            </div>
          </>
        )}

        {tab === 'mission' && (
          <div className="space-y-3">
            {game.matchupId && getMatchupBattlefield(game.matchupId) && (
              <BattlefieldMap
                battlefield={getMatchupBattlefield(game.matchupId)!}
                attacker={game.attacker}
                player1Name={game.player1.name}
                player2Name={game.player2.name}
                variantIndex={game.layoutVariantIndex}
                onVariantChange={(i) => persist({ ...game, layoutVariantIndex: i })}
                referenceMatchupId={game.mapReferenceMatchupId}
                onReferenceMatchupChange={(id) =>
                  persist({ ...game, mapReferenceMatchupId: id })
                }
              />
            )}
            <MissionPanel player={game.player1} color="var(--color-p1)" scores={game.scores.player1} />
            <MissionPanel player={game.player2} color="var(--color-p2)" scores={game.scores.player2} />
          </div>
        )}

        <button type="button" onClick={() => setShowEnd(true)} className="app-btn w-full py-4 text-base">
          {copy.game.endGame}
        </button>

        <ConfirmDialog
          open={showAbandon}
          title={copy.game.abandonTitle}
          body={copy.game.abandonBody}
          confirmLabel={copy.game.abandon}
          danger
          onCancel={() => setShowAbandon(false)}
          onConfirm={() => {
            setShowAbandon(false)
            abandon()
          }}
        />

        {showEnd && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-game-title"
              className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-panel p-6 shadow-2xl"
            >
              <h2 id="end-game-title" className="font-display text-xl">
                {copy.game.gameOver}
              </h2>
              <p className="mt-2 text-muted">
                {getWinner(game) === 0
                  ? copy.game.draw
                  : copy.game.wins(getWinner(game) === 1 ? game.player1.name : game.player2.name)}
              </p>
              <p className="mt-1 font-display text-2xl tabular-nums text-accent">
                {game.scores.player1.vp} – {game.scores.player2.vp} VP
              </p>
              <p className="mt-1 text-sm text-muted">
                WTC: {wtc.player1} – {wtc.player2} ({copy.game.wtcMargin(wtc.margin)})
              </p>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowEnd(false)} className="app-btn-ghost flex-1 py-3 text-sm">
                  {copy.game.continue}
                </button>
                <button type="button" onClick={endGame} className="app-btn flex-1 py-3 text-sm">
                  {copy.game.save}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

function MissionPanel({
  player,
  color,
  scores,
}: {
  player: PlayerSetup
  color: string
  scores: PlayerScores
}) {
  const secondaries =
    player.secondaryMode === 'tactical'
      ? scores.tacticalHand
      : player.secondaries.filter((s) => !scores.removedSecondaries.includes(s))

  return (
    <div className="app-panel p-4">
      <p className="font-semibold" style={{ color }}>
        {player.name}
      </p>
      <p className="text-sm text-muted">{player.army}</p>
      <div className="mt-1 space-y-1">
        {player.detachments.map((d) => (
          <p key={d.name} className="flex items-center gap-2 text-xs text-muted">
            <span>· {d.name}</span>
            <DpCost dp={d.dp} size="sm" />
          </p>
        ))}
      </div>
      <div className="mt-3">
        <p className="text-xs uppercase text-muted">Primary</p>
        <p className="font-bold">
          <MissionNameButton name={player.primaryMission} className="font-bold" />
        </p>
        <div className="mt-1">
          <ForceDispositionBadge fd={player.forceDisposition} short />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs uppercase text-muted">Secondaries ({player.secondaryMode})</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {secondaries.length === 0 && <span className="text-xs text-muted">—</span>}
          {secondaries.map((s, i) => (
            <span key={`${s}-${i}`} className="rounded border border-border px-2 py-0.5 text-xs">
              <MissionNameButton name={s} className="text-xs" showIcon={false} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
