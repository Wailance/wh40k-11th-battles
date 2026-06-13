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
  drawTacticalCardsResolved,
  gameData,
  getActiveSecondaries,
  getWinner,
  shuffleCardIntoDeck,
  syncTotalVp,
} from '../lib/game-utils'
import { BattlefieldMap } from '../components/BattlefieldMap'
import { GameRoundSummary, GameTotalSummary } from '../components/GameRoundSummary'
import { PreBattleChecklist } from '../components/PreBattleChecklist'
import { getMatchupBattlefield } from '../lib/battlefield'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  getMissionScoreOptions,
  incrementTally,
  recalcVpFromTallies,
  roundCombinedVp,
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

export function ActiveGamePage() {
  const navigate = useNavigate()
  const [game, setGame] = useState<GameState | null>(() => {
    const g = loadActiveGame()
    if (!g || g.status !== 'active') return null
    return {
      ...g,
      scores: {
        player1: recalcPlayerScores(g.scores.player1, g.player1),
        player2: recalcPlayerScores(g.scores.player2, g.player2),
      },
    }
  })
  const [tab, setTab] = useState<'score' | 'results' | 'mission'>('score')
  const [viewRound, setViewRound] = useState(() => {
    const g = loadActiveGame()
    return g?.status === 'active' ? g.battleRound : 1
  })
  const [showEnd, setShowEnd] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)
  const [p1Phase, setP1Phase] = useState<'command' | 'turn' | 'end-turn'>('command')
  const [p2Phase, setP2Phase] = useState<'command' | 'turn' | 'end-turn'>('command')

  useEffect(() => {
    if (!game) navigate('/new')
  }, [game, navigate])

  if (!game) return <PageLoading label={copy.game.loading} />

  const wtc = calculateWtcScores(game.scores.player1.vp, game.scores.player2.vp)

  const persist = (g: GameState) => {
    setGame(g)
    saveActiveGame(g)
  }

  const selectRound = (round: number) => {
    setViewRound(round)
    let scores = game.scores
    if (round > game.battleRound) {
      scores = {
        player1: { ...game.scores.player1, extraCpThisRound: 0 },
        player2: { ...game.scores.player2, extraCpThisRound: 0 },
      }
    }
    persist({ ...game, battleRound: round, scores })
  }

  const togglePreBattle = (index: number) => {
    const next = [...game.preBattleChecks]
    next[index] = !next[index]
    persist({ ...game, preBattleChecks: next })
  }

  const preBattleDone = game.preBattleChecks.every(Boolean)

  const roundVpP1 = roundCombinedVp(game.scores.player1, viewRound)
  const roundVpP2 = roundCombinedVp(game.scores.player2, viewRound)

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
      battleRound: viewRound,
      delta,
    })
    if (!check.allowed) return

    updateScores(player, (s) => {
      const next = incrementTally(s.primaryScoreTally, optionId, viewRound, delta)
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
      battleRound: viewRound,
      delta,
      secondaryCard: card,
    })
    if (!check.allowed) return

    const key = secondaryScoreKey(card, optionId)
    updateScores(player, (s) => {
      const next = incrementTally(s.secondaryScoreTally, key, viewRound, delta)
      if (!next) return s
      return { ...s, secondaryScoreTally: next }
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
      const { hand, deck: remaining } = drawTacticalCardsResolved(
        deck,
        s.tacticalHand,
        viewRound,
        count,
      )
      return {
        ...s,
        tacticalDeck: remaining,
        tacticalHand: hand,
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

  const discardTacticalForCp = (player: 1 | 2, card: string, index: number) => {
    const scores = player === 1 ? game.scores.player1 : game.scores.player2
    if (scores.extraCpThisRound >= 1) return
    updateScores(player, (s) => {
      const hand = [...s.tacticalHand]
      if (hand[index] !== card) return s
      hand.splice(index, 1)
      return { ...s, tacticalHand: hand, extraCpThisRound: s.extraCpThisRound + 1 }
    })
  }

  const achieveTactical = (player: 1 | 2, card: string, index: number) => {
    updateScores(player, (s) => {
      const hand = [...s.tacticalHand]
      if (hand[index] !== card) return s
      hand.splice(index, 1)
      return {
        ...s,
        tacticalHand: hand,
        tacticalAchieved: [...s.tacticalAchieved, card],
      }
    })
  }

  const rerollTactical = (player: 1 | 2, card: string, index: number) => {
    const phase = player === 1 ? p1Phase : p2Phase
    if (phase !== 'command') return
    updateScores(player, (s) => {
      if (s.tacticalRerollUsed) return s
      const hand = [...s.tacticalHand]
      if (hand[index] !== card) return s
      hand.splice(index, 1)
      const deck = s.tacticalDeck.length
        ? s.tacticalDeck
        : [...(gameData.secondaries.tacticalDeck as string[])]
      if (!deck.length) {
        return { ...s, tacticalHand: hand, tacticalRerollUsed: true }
      }
      const { drawn, remaining } = drawTacticalCards(deck, 1)
      return {
        ...s,
        tacticalHand: [...hand, ...drawn],
        tacticalDeck: remaining,
        tacticalRerollUsed: true,
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
    <div className="game-viewport">
      <div className="game-topbar">
        <button type="button" onClick={() => navigate('/')} className="app-btn-ghost px-2 py-1 text-[10px]">
          {copy.game.home}
        </button>
        <span className="app-chip !py-0.5 !text-[9px]">{copy.game.roundVp(viewRound)}</span>
        <div className="flex gap-1">
          <Link to="/mission-sequence" className="app-btn-ghost px-2 py-1 text-[10px]">
            {copy.nav.missionSequence}
          </Link>
          <button
            type="button"
            onClick={() => setShowAbandon(true)}
            className="app-btn-ghost px-2 py-1 text-[10px]"
          >
            {copy.game.abandon}
          </button>
        </div>
      </div>

      <div className="game-score-strip">
        <div className="min-w-0 text-left">
          <p className="truncate text-[11px] font-semibold" style={{ color: 'var(--color-p1)' }}>
            {game.player1.name}
          </p>
          <p className="text-lg font-display tabular-nums leading-none" style={{ color: 'var(--color-p1)' }}>
            {game.scores.player1.vp}
          </p>
        </div>
        <div className="text-center">
          <p className="font-display text-sm tabular-nums text-bone">
            {wtc.player1}–{wtc.player2}
          </p>
          <p className="text-[8px] uppercase tracking-wider text-muted">{copy.game.wtcScore}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-[11px] font-semibold" style={{ color: 'var(--color-p2)' }}>
            {game.player2.name}
          </p>
          <p className="text-lg font-display tabular-nums leading-none" style={{ color: 'var(--color-p2)' }}>
            {game.scores.player2.vp}
          </p>
        </div>
      </div>

      <div className="game-round-tabs" role="tablist" aria-label={copy.game.selectRound}>
        {[1, 2, 3, 4, 5].map((round) => {
          const vp =
            roundCombinedVp(game.scores.player1, round) + roundCombinedVp(game.scores.player2, round)
          return (
            <button
              key={round}
              type="button"
              role="tab"
              aria-selected={viewRound === round}
              data-active={viewRound === round}
              onClick={() => selectRound(round)}
              className="game-round-tab"
            >
              <span className="game-round-tab-label">{copy.game.roundTab(round)}</span>
              {vp > 0 && <span className="game-round-tab-vp">{vp} VP</span>}
            </button>
          )
        })}
      </div>

      {tab === 'score' && (
        <p className="game-round-banner">
          {copy.game.roundVp(viewRound)} · P1: {roundVpP1} · P2: {roundVpP2} VP
        </p>
      )}

      <div className="app-segment my-1 shrink-0" role="tablist" aria-label="Game views">
        {(['score', 'results', 'mission'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            data-active={tab === t}
            onClick={() => setTab(t)}
            className="app-segment-btn !py-1.5 !text-[10px]"
          >
            {t === 'score' ? copy.game.tabScore : t === 'results' ? copy.game.tabResults : copy.game.tabMission}
          </button>
        ))}
      </div>

      <div className="game-scroll">
        {!preBattleDone && tab === 'score' && (
          <PreBattleChecklist
            compact
            checks={game.preBattleChecks}
            onToggle={togglePreBattle}
          />
        )}

        {tab === 'score' && (
          <div className="space-y-2 pb-2">
            <PlayerMissionScorer
              compact
              player={game.player1}
              scores={game.scores.player1}
              color="var(--color-p1)"
              battleRound={viewRound}
              isCurrentRound={viewRound === game.battleRound}
              isSecondPlayer={game.firstPlayer === 2}
              tablePhase={p1Phase}
              onTablePhaseChange={setP1Phase}
              onPrimaryScore={(id, d) => scorePrimary(1, id, d)}
              onSecondaryScore={(card, id, d) => scoreSecondary(1, card, id, d)}
              onDrawTactical={() => drawTactical(1)}
              onReturnToDeck={(card, i) => returnSecondaryToDeck(1, card, i)}
              onDiscardForCp={(card, i) => discardTacticalForCp(1, card, i)}
              onAchieveTactical={(card, i) => achieveTactical(1, card, i)}
              onRerollTactical={(card, i) => rerollTactical(1, card, i)}
              onRemoveFixedSecondary={(card) => removeFixedSecondary(1, card)}
            />

            <PlayerMissionScorer
              compact
              player={game.player2}
              scores={game.scores.player2}
              color="var(--color-p2)"
              battleRound={viewRound}
              isCurrentRound={viewRound === game.battleRound}
              isSecondPlayer={game.firstPlayer === 1}
              tablePhase={p2Phase}
              onTablePhaseChange={setP2Phase}
              onPrimaryScore={(id, d) => scorePrimary(2, id, d)}
              onSecondaryScore={(card, id, d) => scoreSecondary(2, card, id, d)}
              onDrawTactical={() => drawTactical(2)}
              onReturnToDeck={(card, i) => returnSecondaryToDeck(2, card, i)}
              onDiscardForCp={(card, i) => discardTacticalForCp(2, card, i)}
              onAchieveTactical={(card, i) => achieveTactical(2, card, i)}
              onRerollTactical={(card, i) => rerollTactical(2, card, i)}
              onRemoveFixedSecondary={(card) => removeFixedSecondary(2, card)}
            />
          </div>
        )}

        {tab === 'results' && (
          <div className="space-y-2 pb-2">
            <GameRoundSummary game={game} round={viewRound} />
            <GameTotalSummary game={game} />
          </div>
        )}

        {tab === 'mission' && (
          <div className="space-y-2 pb-2">
            {game.matchupId && getMatchupBattlefield(game.matchupId) && (
              <BattlefieldMap
                battlefield={getMatchupBattlefield(game.matchupId)!}
                attacker={game.attacker}
                player1Name={game.player1.name}
                player2Name={game.player2.name}
                variantIndex={game.layoutVariantIndex}
                onVariantChange={(i) => persist({ ...game, layoutVariantIndex: i })}
              />
            )}
            <MissionPanel player={game.player1} color="var(--color-p1)" scores={game.scores.player1} />
            <MissionPanel player={game.player2} color="var(--color-p2)" scores={game.scores.player2} />
          </div>
        )}
      </div>

      <div className="game-bottombar">
        <button type="button" onClick={() => setShowEnd(true)} className="app-btn flex-1 py-2 text-xs">
          {copy.game.endGame}
        </button>
      </div>

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
              <div className="mt-4 max-h-[40vh] overflow-y-auto">
                <GameTotalSummary game={game} />
              </div>
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
      ? [...scores.tacticalHand, ...scores.tacticalAchieved]
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
