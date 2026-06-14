import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AppDialog } from '../components/AppDialog'
import { GamePlayerSeatBar, GameScoreTotals, doublesPlayerLabels } from '../components/GameScoreStrip'
import { GameRoundNav } from '../components/GameRoundNav'
import { BattlefieldMap } from '../components/BattlefieldMap'
import { getMatchupBattlefield } from '../lib/battlefield'
import { PageLoading } from '../components/PageLoading'
import { MissionNameButton } from '../components/MissionNameButton'
import { PlayerMissionScorer } from '../components/PlayerMissionScorer'
import {
  applyTacticalHandState,
  afterTacticalSecondaryScore,
  discardTacticalScoredInRound,
  discardTacticalSecondaryMission,
  drawOneTacticalToHand,
  enforceTacticalHandLimit,
  FD_COLORS,
  FD_SHORT,
  gameData,
  getActiveSecondaries,
  getWinner,
  healStaleTacticalHand,
  restoreDiscardedTacticalToDeck,
  restoreTacticalCardFromHandToDeck,
  snapshotRoundTacticalCards,
  syncTotalVp,
} from '../lib/game-utils'
import { GameRoundSummary, GameTotalSummary } from '../components/GameRoundSummary'
import { PreBattleChecklist } from '../components/PreBattleChecklist'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  getMissionScoreOptions,
  incrementTally,
  recalcVpFromTallies,
  missionBriefRoundBreakdown,
  secondaryBriefBuckets,
  secondaryScoreKey,
  validateScoreIncrement,
  validateTacticalDraw,
} from '../lib/mission-scoring'
import { clearActiveGame, loadActiveGame, saveActiveGame, saveToHistory } from '../lib/storage'
import { calculateWtcScores } from '../lib/wtc-scoring'
import type { GameState, PlayerScores, PlayerSetup } from '../types/game'
import { DOMINATUS_ALLIANCE_LABELS, DOMINATUS_POST_BATTLE } from '../data/dominatus-companion'

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

function normalizeLoadedGame(g: GameState): GameState {
  const heal = (player: PlayerSetup, scores: PlayerScores) =>
    recalcPlayerScores(healStaleTacticalHand(scores, player, g.battleRound), player)
  return {
    ...g,
    scores: {
      player1: heal(g.player1, g.scores.player1),
      player2: heal(g.player2, g.scores.player2),
    },
  }
}

export function ActiveGamePage() {
  const navigate = useNavigate()
  const [game, setGame] = useState<GameState | null>(() => {
    const g = loadActiveGame()
    if (!g || g.status !== 'active') return null
    const normalized = normalizeLoadedGame(g)
    saveActiveGame(normalized)
    return normalized
  })
  const [viewRound, setViewRound] = useState(() => {
    const g = loadActiveGame()
    return g?.status === 'active' ? g.battleRound : 1
  })
  const [showEnd, setShowEnd] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)
  const [showMissionBrief, setShowMissionBrief] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [scorePlayer, setScorePlayer] = useState<1 | 2>(() => {
    const g = loadActiveGame()
    return g?.status === 'active' ? g.firstPlayer : 1
  })
  const [roundAnim, setRoundAnim] = useState<'fwd' | 'back' | null>(null)

  useEffect(() => {
    if (!game) navigate('/', { replace: true })
  }, [game, navigate])

  useEffect(() => {
    if (!game) return
    if (viewRound > game.battleRound) setViewRound(game.battleRound)
  }, [game?.battleRound, viewRound, game])

  useEffect(() => {
    if (!roundAnim) return
    const t = window.setTimeout(() => setRoundAnim(null), 280)
    return () => window.clearTimeout(t)
  }, [roundAnim, viewRound])

  useEffect(() => {
    if (!game) return
    setScorePlayer(game.firstPlayer)
  }, [game?.firstPlayer])

  if (!game) return <PageLoading label={copy.game.loading} />

  const wtc = calculateWtcScores(game.scores.player1.vp, game.scores.player2.vp)

  const persist = (g: GameState) => {
    setGame(g)
    saveActiveGame(g)
  }

  const selectRound = (round: number) => {
    if (round > game.battleRound || round < 1) return
    if (round !== viewRound) {
      setRoundAnim(round > viewRound ? 'fwd' : 'back')
    }
    setViewRound(round)
  }

  const advanceRound = () => {
    if (game.battleRound >= 5) return
    const completingRound = game.battleRound
    const next = game.battleRound + 1
    const nextScores = (player: PlayerSetup, scores: PlayerScores) => {
      let s: PlayerScores = { ...scores, extraCpThisRound: 0 }
      if (player.secondaryMode === 'tactical') {
        s = snapshotRoundTacticalCards(s, completingRound)
        s = discardTacticalScoredInRound(s, completingRound)
      }
      return recalcPlayerScores(s, player)
    }
    persist({
      ...game,
      battleRound: next,
      scores: {
        player1: nextScores(game.player1, game.scores.player1),
        player2: nextScores(game.player2, game.scores.player2),
      },
    })
    setRoundAnim('fwd')
    setViewRound(next)
    setScorePlayer(1)
  }

  const togglePreBattle = (index: number) => {
    const next = [...game.preBattleChecks]
    if (next[index]) {
      for (let i = index; i < next.length; i++) next[i] = false
    } else {
      if (index > 0 && !next[index - 1]) return
      next[index] = true
    }
    persist({ ...game, preBattleChecks: next })
  }

  const preBattleDone = game.preBattleChecks.every(Boolean)
  const scoringEnabled = preBattleDone && viewRound <= game.battleRound
  const scoringLockReason = !preBattleDone ? copy.game.scoringLockedPreBattle : copy.game.scoringLockedPastRound

  const roundPanelClass =
    roundAnim === 'fwd' ? 'motion-round-fwd' : roundAnim === 'back' ? 'motion-round-back' : 'motion-tab-panel'

  const doublesLabels = doublesPlayerLabels(game.doubles, game.player1.name, game.player2.name)
  const bottomActivePlayer = preBattleDone ? scorePlayer : null
  const bottomOnSelectPlayer = preBattleDone ? setScorePlayer : undefined
  const battlefield = game.matchupId ? getMatchupBattlefield(game.matchupId) : null

  const updateScores = (player: 1 | 2, updater: (s: PlayerScores) => PlayerScores) => {
    const key = player === 1 ? 'player1' : 'player2'
    const setup = game[key]
    let raw = updater(game.scores[key])
    if (setup.secondaryMode === 'tactical') raw = enforceTacticalHandLimit(raw)
    const next = recalcPlayerScores(raw, setup)
    persist({ ...game, scores: { ...game.scores, [key]: next } })
  }

  const scorePrimary = (player: 1 | 2, optionId: string, delta: 1 | -1) => {
    if (!scoringEnabled) return
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
    if (!scoringEnabled) return
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
      currentBattleRound: game.battleRound,
      delta,
      secondaryCard: card,
    })
    if (!check.allowed) return

    const key = secondaryScoreKey(card, optionId)
    updateScores(player, (s) => {
      const next = incrementTally(s.secondaryScoreTally, key, viewRound, delta)
      if (!next) return s
      let updated: PlayerScores = { ...s, secondaryScoreTally: next }
      if (setup.secondaryMode === 'tactical') {
        updated = afterTacticalSecondaryScore(
          updated,
          setup,
          card,
          viewRound,
          delta,
          game.battleRound,
        )
      }
      return updated
    })
  }

  const randomOneTactical = (player: 1 | 2) => {
    if (!scoringEnabled) return
    const key = player === 1 ? 'player1' : 'player2'
    const p = game[key]
    const scores = player === 1 ? game.scores.player1 : game.scores.player2
    if (p.secondaryMode !== 'tactical') return
    if (!validateTacticalDraw(scores).allowed) {
      return
    }

    updateScores(player, (s) =>
      drawOneTacticalToHand(s, viewRound, gameData.secondaries.tacticalDeck as string[], game.battleRound),
    )
  }

  const randomSecondary = (player: 1 | 2) => {
    const p = game[player === 1 ? 'player1' : 'player2']
    if (p.secondaryMode !== 'tactical') return
    randomOneTactical(player)
  }

  const discardSecondary = (player: 1 | 2, card: string, index: number) => {
    const p = game[player === 1 ? 'player1' : 'player2']
    if (p.secondaryMode !== 'tactical') return
    discardTacticalSecondary(player, card, index)
  }

  const discardTacticalSecondary = (player: 1 | 2, card: string, _index: number) => {
    if (!scoringEnabled) return
    updateScores(player, (s) => discardTacticalSecondaryMission(s, card))
  }

  const restoreTacticalToDeck = (player: 1 | 2, card: string) => {
    if (!scoringEnabled) return
    updateScores(player, (s) => restoreTacticalCardFromHandToDeck(s, card, viewRound))
  }

  const restoreDiscardedToDeck = (player: 1 | 2, card: string) => {
    if (!scoringEnabled) return
    updateScores(player, (s) => restoreDiscardedTacticalToDeck(s, card))
  }

  const applyTacticalSecondaries = (player: 1 | 2, hand: string[], restoreToDeck: string[] = []) => {
    if (!scoringEnabled) return
    updateScores(player, (s) => applyTacticalHandState(s, hand, restoreToDeck))
  }

  const applyFixedSecondaries = (player: 1 | 2, selected: string[]) => {
    if (!scoringEnabled || selected.length !== 2) return
    const playerKey = player === 1 ? 'player1' : 'player2'
    if (game[playerKey].secondaryMode !== 'fixed') return
    const scoreKey = player === 1 ? 'player1' : 'player2'
    persist({
      ...game,
      [playerKey]: { ...game[playerKey], secondaries: selected },
      scores: {
        ...game.scores,
        [scoreKey]: { ...game.scores[scoreKey], removedSecondaries: [] },
      },
    })
  }

  const endGame = () => {
    saveToHistory(game)
    navigate('/history')
  }

  const abandon = () => {
    clearActiveGame()
    navigate('/')
  }

  const saveAndLeave = () => {
    saveToHistory(game)
    navigate('/history')
  }

  return (
    <div className="game-viewport">
      <header className="game-topbar">
        <div className="game-topbar-shell">
          <button type="button" onClick={() => navigate('/')} className="game-topbar-home">
            <span className="game-topbar-home-icon" aria-hidden>
              ←
            </span>
            <span>{copy.game.home}</span>
          </button>

          <div className="game-topbar-brand">
            <span className="game-topbar-brand-mark" aria-hidden />
            <span className="game-topbar-brand-text">{copy.game.gameHeaderTitle}</span>
          </div>

          <div className="game-topbar-actions">
            <button
              type="button"
              onClick={() => setShowMap(true)}
              disabled={!battlefield}
              className="game-topbar-action game-topbar-action--map"
              title={battlefield ? copy.game.mapShortcut : copy.game.mapNoLayout}
            >
              {copy.game.mapShortcut}
            </button>
            <button
              type="button"
              onClick={() => setShowMissionBrief(true)}
              className="game-topbar-action game-topbar-action--log"
            >
              {copy.game.missionBriefOpen}
            </button>
            <button
              type="button"
              onClick={() => setShowEnd(true)}
              className="game-topbar-action game-topbar-action--end"
            >
              {copy.game.endGame}
            </button>
          </div>
        </div>
      </header>

      <section className="game-score-panel shrink-0">
        <GameScoreTotals
          player1Vp={game.scores.player1.vp}
          player2Vp={game.scores.player2.vp}
          wtcPlayer1={wtc.player1}
          wtcPlayer2={wtc.player2}
        />
      </section>

      <section className="game-mission-panel shrink-0 pb-2">
        <GamePlayerSeatBar
          {...doublesLabels}
          player1Vp={game.scores.player1.vp}
          player2Vp={game.scores.player2.vp}
          activePlayer={bottomActivePlayer}
          onSelectPlayer={bottomOnSelectPlayer}
        />
      </section>

      {game.format !== 'standard' && (
        <p className="game-format-banner mb-1 text-center">
          {game.format === 'dominatus' ? copy.game.formatDominatus : copy.game.formatDoubles}
          {game.format === 'doubles' && game.doubles
            ? ` · ${game.doubles.team1Name} vs ${game.doubles.team2Name}`
            : ''}
          {game.format === 'dominatus' && game.dominatus
            ? ` · Phase ${game.dominatus.phase}`
            : ''}
        </p>
      )}

      <div className="game-scroll">
        {!preBattleDone && (
          <PreBattleChecklist
            compact
            checks={game.preBattleChecks}
            onToggle={togglePreBattle}
            attacker={game.attacker}
            onAttackerChange={(v) => persist({ ...game, attacker: v })}
            firstPlayer={game.firstPlayer}
            onFirstPlayerChange={(v) => persist({ ...game, firstPlayer: v })}
            player1Name={game.player1.name}
            player2Name={game.player2.name}
          />
        )}

        <div
          key={`score-r${viewRound}`}
          className={`${roundPanelClass} space-y-2 pb-2`}
        >
            {scorePlayer === 1 ? (
              <PlayerMissionScorer
                key="p1"
                compact
                hidePlayerHeader={preBattleDone}
                player={game.player1}
                scores={game.scores.player1}
                color="var(--color-p1)"
                battleRound={viewRound}
                currentBattleRound={game.battleRound}
                scoringEnabled={scoringEnabled}
                scoringLockReason={scoringLockReason}
                isSecondPlayer={game.firstPlayer === 2}
                onPrimaryScore={(id, d) => scorePrimary(1, id, d)}
                onSecondaryScore={(card, id, d) => scoreSecondary(1, card, id, d)}
                onRandomSecondary={() => randomSecondary(1)}
                onDiscardSecondary={(card, i) => discardSecondary(1, card, i)}
                onRestoreTacticalToDeck={(card) => restoreTacticalToDeck(1, card)}
                onRestoreDiscardedToDeck={(card) => restoreDiscardedToDeck(1, card)}
                onApplyFixedSecondaries={(selected) => applyFixedSecondaries(1, selected)}
                onApplyTacticalSecondaries={(hand, restoreToDeck) => applyTacticalSecondaries(1, hand, restoreToDeck)}
              />
            ) : (
              <PlayerMissionScorer
                key="p2"
                compact
                hidePlayerHeader={preBattleDone}
                player={game.player2}
                scores={game.scores.player2}
                color="var(--color-p2)"
                battleRound={viewRound}
                currentBattleRound={game.battleRound}
                scoringEnabled={scoringEnabled}
                scoringLockReason={scoringLockReason}
                isSecondPlayer={game.firstPlayer === 1}
                onPrimaryScore={(id, d) => scorePrimary(2, id, d)}
                onSecondaryScore={(card, id, d) => scoreSecondary(2, card, id, d)}
                onRandomSecondary={() => randomSecondary(2)}
                onDiscardSecondary={(card, i) => discardSecondary(2, card, i)}
                onRestoreTacticalToDeck={(card) => restoreTacticalToDeck(2, card)}
                onRestoreDiscardedToDeck={(card) => restoreDiscardedToDeck(2, card)}
                onApplyFixedSecondaries={(selected) => applyFixedSecondaries(2, selected)}
                onApplyTacticalSecondaries={(hand, restoreToDeck) => applyTacticalSecondaries(2, hand, restoreToDeck)}
              />
            )}
        </div>
      </div>

      <GameRoundNav
        viewRound={viewRound}
        battleRound={game.battleRound}
        onSelectRound={selectRound}
        onAdvanceRound={advanceRound}
      />

        <ConfirmDialog
          open={showAbandon}
          title={copy.game.abandonTitle}
          body={copy.game.abandonBody}
          confirmLabel={copy.game.abandon}
          extraAction={{ label: copy.game.abandonSave, onClick: () => {
            setShowAbandon(false)
            saveAndLeave()
          }}}
          danger
          onCancel={() => setShowAbandon(false)}
          onConfirm={() => {
            setShowAbandon(false)
            abandon()
          }}
        />

        <AppDialog open={showEnd} onClose={() => setShowEnd(false)} titleId="end-game-title" className="app-dialog-panel-lg">
          <h2 id="end-game-title" className="font-display text-display">
            {copy.game.gameOver}
          </h2>
          <p className="mt-2 text-muted">
            {getWinner(game) === 0
              ? copy.game.draw
              : copy.game.wins(getWinner(game) === 1 ? game.player1.name : game.player2.name)}
          </p>
          <p className="mt-1 font-display text-stat tabular-nums text-accent">
            {game.scores.player1.vp} – {game.scores.player2.vp} VP
          </p>
          <p className="mt-1 text-body text-muted">
            WTC: {wtc.player1} – {wtc.player2} ({copy.game.wtcMargin(wtc.margin)})
          </p>
          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
            {Array.from({ length: game.battleRound }, (_, i) => i + 1).map((round) => (
              <GameRoundSummary key={round} game={game} round={round} />
            ))}
            <GameTotalSummary game={game} />
          </div>
          {game.format === 'dominatus' && game.dominatus && (
            <div className="mt-4 app-panel p-3 text-caption">
              <p className="font-medium text-bone">{copy.game.dominatusPostBattle}</p>
              <p className="mt-1 text-muted">{copy.game.dominatusPostBattleHint}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
                {DOMINATUS_POST_BATTLE.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-2 text-micro text-muted">
                P1: {DOMINATUS_ALLIANCE_LABELS[game.dominatus.player1Alliance]}
                {game.dominatus.player1AttemptAgenda ? ' · Agenda' : ' · Standard primary'}
                {' · '}
                P2: {DOMINATUS_ALLIANCE_LABELS[game.dominatus.player2Alliance]}
                {game.dominatus.player2AttemptAgenda ? ' · Agenda' : ' · Standard primary'}
              </p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowEnd(false)} className="app-btn-ghost flex-1 py-2.5 text-caption">
              {copy.game.continue}
            </button>
            <button type="button" onClick={endGame} className="app-btn flex-1 py-2.5 text-caption">
              {copy.game.save}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowEnd(false)
              setShowAbandon(true)
            }}
            className="mt-3 w-full py-1 text-center text-micro text-muted underline-offset-2 hover:text-bone hover:underline"
          >
            {copy.game.abandon}
          </button>
        </AppDialog>

        <GameMissionBriefDialog
          open={showMissionBrief}
          onClose={() => setShowMissionBrief(false)}
          game={game}
        />

        <AppDialog
          open={showMap}
          onClose={() => setShowMap(false)}
          titleId="game-map-title"
          className="app-dialog-panel-lg game-map-dialog"
        >
          <div className="game-map-dialog-head">
            <h2 id="game-map-title" className="font-display text-title text-accent">
              {copy.game.mapShortcut}
            </h2>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="app-secondary-picker-close"
              aria-label={copy.common.close}
            >
              ×
            </button>
          </div>
          <div className="game-map-dialog-body">
            {battlefield ? (
              <BattlefieldMap
                battlefield={battlefield}
                attacker={game.attacker}
                player1Name={game.player1.name}
                player2Name={game.player2.name}
                variantIndex={game.layoutVariantIndex}
                compact
              />
            ) : (
              <p className="text-caption text-muted">{copy.game.mapNoLayout}</p>
            )}
          </div>
          <button type="button" onClick={() => setShowMap(false)} className="app-btn game-map-dialog-close w-full py-2.5 text-caption">
            {copy.common.close}
          </button>
        </AppDialog>
    </div>
  )
}

function GameMissionBriefDialog({
  open,
  onClose,
  game,
}: {
  open: boolean
  onClose: () => void
  game: GameState
}) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      titleId="mission-brief-title"
      className="app-dialog-panel-lg game-mission-brief-dialog"
    >
      <div className="game-mission-brief-dialog-head">
        <h2 id="mission-brief-title" className="font-display text-title text-accent">
          {copy.game.tabMission}
        </h2>
        <button type="button" onClick={onClose} className="app-secondary-picker-close" aria-label={copy.common.close}>
          ×
        </button>
      </div>
      <div className="game-mission-brief-dialog-body">
        <div className="game-mission-brief-grid">
          <MissionBriefCard
            player={game.player1}
            scores={game.scores.player1}
            battleRound={game.battleRound}
            color="var(--color-p1)"
          />
          <MissionBriefCard
            player={game.player2}
            scores={game.scores.player2}
            battleRound={game.battleRound}
            color="var(--color-p2)"
          />
        </div>
      </div>
      <button type="button" onClick={onClose} className="app-btn mt-4 w-full py-2.5 text-caption">
        {copy.common.close}
      </button>
    </AppDialog>
  )
}

function MissionBriefCard({
  player,
  color,
  scores,
  battleRound,
}: {
  player: PlayerSetup
  color: string
  scores: PlayerScores
  battleRound: number
}) {
  const { discarded } = secondaryBriefBuckets(player, scores)
  const scoredRounds = missionBriefRoundBreakdown(player, scores).filter(
    (entry) =>
      entry.round <= battleRound && (entry.primary > 0 || entry.secondaries.length > 0),
  )
  const fdTone = FD_COLORS[player.forceDisposition] ?? 'red'

  return (
    <article
      className="game-mission-brief-card"
      style={{ '--player-accent': color } as CSSProperties}
    >
      <header className="game-mission-brief-card-head">
        <div className="game-mission-brief-head-row">
          <p className="game-mission-brief-player truncate">{player.name}</p>
          <span className={`game-mission-brief-fd game-mission-brief-fd--${fdTone}`}>
            {FD_SHORT[player.forceDisposition]}
          </span>
        </div>
        <MissionNameButton
          name={player.primaryMission}
          className="game-mission-brief-primary"
          showIcon
        />
      </header>

      <div className="game-mission-brief-log">
        {scoredRounds.length === 0 ? (
          <p className="game-mission-brief-empty">{copy.game.missionBriefNoVp}</p>
        ) : (
          scoredRounds.map(({ round, primary, secondaries }) => (
            <div key={round} className="game-mission-brief-round">
              <span className="game-mission-brief-round-badge tabular-nums">R{round}</span>
              <div className="game-mission-brief-round-body">
                {primary > 0 && (
                  <span className="game-mission-brief-p-chip tabular-nums">
                    <span className="game-mission-brief-p-chip-label">
                      {copy.game.missionBriefRoundPrimary}
                    </span>
                    <span className="game-mission-brief-p-chip-vp">+{primary}</span>
                  </span>
                )}
                {secondaries.map(({ card, vp }) => (
                  <span key={card} className="game-mission-brief-s-chip">
                    <MissionNameButton
                      name={card}
                      className="game-mission-brief-s-chip-name"
                      showIcon={false}
                    />
                    <span className="game-mission-brief-s-chip-vp tabular-nums">+{vp}</span>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {discarded.length > 0 && (
        <footer className="game-mission-brief-footer">
          <p className="game-mission-brief-foot-row">
            <span className="game-mission-brief-foot-label">{copy.game.missionBriefDiscarded}</span>
            <span className="game-mission-brief-foot-chips">
              {discarded.map((card) => (
                <span key={card} className="game-mission-brief-foot-chip game-mission-brief-foot-chip--off">
                  <MissionNameButton name={card} className="game-mission-brief-chip-label" showIcon={false} />
                </span>
              ))}
            </span>
          </p>
        </footer>
      )}
    </article>
  )
}
