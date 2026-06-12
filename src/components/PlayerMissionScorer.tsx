import { MissionNameButton } from './MissionNameButton'
import { MissionScoreButtons } from './MissionScoreButtons'
import { SecondaryCardHand } from './SecondaryCardHand'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  formatRoundFiveTimingHint,
  getMissionScoreOptions,
  getTallyCount,
  secondaryScoreKey,
  tacticalDrawCount,
  validateScoreIncrement,
  validateTacticalDraw,
} from '../lib/mission-scoring'
import type { PlayerScores, PlayerSetup } from '../types/game'

export function PlayerMissionScorer({
  player,
  scores,
  color,
  battleRound,
  isSecondPlayer = false,
  onPrimaryScore,
  onSecondaryScore,
  onDrawTactical,
  onReturnToDeck,
  onDiscardSecondary,
  onRemoveFixedSecondary,
}: {
  player: PlayerSetup
  scores: PlayerScores
  color: string
  battleRound: number
  isSecondPlayer?: boolean
  onPrimaryScore: (optionId: string, delta: 1 | -1) => void
  onSecondaryScore: (card: string, optionId: string, delta: 1 | -1) => void
  onDrawTactical: () => void
  onReturnToDeck: (card: string, index: number) => void
  onDiscardSecondary: (card: string, index: number) => void
  onRemoveFixedSecondary: (card: string) => void
}) {
  const primaryOptions = getMissionScoreOptions(player.primaryMission)
  const activeSecondaries =
    player.secondaryMode === 'tactical'
      ? scores.tacticalHand
      : player.secondaries.filter((s) => !scores.removedSecondaries.includes(s))

  const roundPrimary = scores.primaryRoundVp[battleRound - 1] ?? 0
  const roundSecondary = scores.secondaryRoundVp[battleRound - 1] ?? 0
  const drawValidation = validateTacticalDraw(scores)
  const formatTiming = (timing: string) =>
    formatRoundFiveTimingHint(timing, battleRound, isSecondPlayer)
  const secondaryCap =
    player.secondaryMode === 'fixed'
      ? DEFAULT_CAPS.fixedSecondaryMaxGame
      : DEFAULT_CAPS.tacticalSecondaryMaxGame

  const canPrimary = (optionId: string, delta: 1 | -1) => {
    const option = primaryOptions.find((o) => o.id === optionId)
    if (!option) return { allowed: false, reason: 'Unknown' }
    return validateScoreIncrement({
      kind: 'primary',
      option,
      allOptions: primaryOptions,
      scores,
      player,
      battleRound,
      delta,
      caps: DEFAULT_CAPS,
    })
  }

  const canSecondary = (card: string, optionId: string, delta: 1 | -1) => {
    const options = getMissionScoreOptions(card, player.secondaryMode)
    const option = options.find((o) => o.id === optionId)
    if (!option) return { allowed: false, reason: 'Unknown' }
    return validateScoreIncrement({
      kind: 'secondary',
      option,
      allOptions: options,
      scores,
      player,
      battleRound,
      delta,
      secondaryCard: card,
      caps: DEFAULT_CAPS,
    })
  }

  return (
    <div className="app-panel space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color }}>
            {player.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            <MissionNameButton name={player.primaryMission} className="text-xs" showIcon={false} />
            {player.battleReady && (
              <span className="ml-2 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                {copy.game.battleReadyBadge}
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right text-[11px] tabular-nums text-muted">
          <p>
            Primary{' '}
            <span className="font-semibold text-bone">
              {scores.primaryVp}/{DEFAULT_CAPS.primaryMaxGame}
            </span>
            {' · '}
            Secondary{' '}
            <span className="font-semibold text-bone">
              {scores.secondaryVp}/{secondaryCap}
            </span>
            {player.battleReady && (
              <>
                {' · '}
                <span className="font-semibold text-bone">+{DEFAULT_CAPS.battleReadyVp} BR</span>
              </>
            )}
          </p>
          <p className="mt-0.5">
            {copy.game.roundVp(battleRound)}:{' '}
            <span className="font-medium" style={{ color }}>
              {roundPrimary + roundSecondary}
            </span>
            <span className="text-muted/60"> / 30</span>
            <span className="block text-muted/70">
              P {roundPrimary}/{DEFAULT_CAPS.primaryMaxRound} · S {roundSecondary}/
              {DEFAULT_CAPS.tacticalSecondaryMaxRound}
            </span>
          </p>
        </div>
      </div>

      <MissionScoreButtons
        title={copy.game.primaryScoring}
        options={primaryOptions}
        getCount={(id) => getTallyCount(scores.primaryScoreTally, id, battleRound)}
        canScore={canPrimary}
        onScore={onPrimaryScore}
        color={color}
        formatTiming={formatTiming}
      />

      {player.secondaryMode === 'tactical' && (
        <SecondaryCardHand
          hand={scores.tacticalHand}
          deckCount={scores.tacticalDeck.length}
          battleRound={battleRound}
          drawCount={tacticalDrawCount(scores)}
          canDraw={drawValidation.allowed}
          drawBlockedReason={drawValidation.reason}
          onDraw={onDrawTactical}
          onReturnToDeck={onReturnToDeck}
          onDiscard={onDiscardSecondary}
        />
      )}

      {player.secondaryMode === 'fixed' && activeSecondaries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">Fixed Secondaries</p>
          {activeSecondaries.map((card) => (
            <div
              key={card}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
            >
              <MissionNameButton name={card} className="text-xs font-medium" showIcon />
              <button
                type="button"
                onClick={() => onRemoveFixedSecondary(card)}
                className="app-btn-ghost rounded-lg px-2 py-0.5 text-[11px]"
              >
                {copy.game.removeFixed}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeSecondaries.length > 0 && (
        <div className="space-y-4 border-t border-white/[0.06] pt-4">
          <p className="text-xs font-medium text-muted">{copy.game.secondaryScoring}</p>
          {activeSecondaries.map((card) => {
            const options = getMissionScoreOptions(card, player.secondaryMode)
            if (!options.length) return null
            return (
              <MissionScoreButtons
                key={card}
                title={card}
                options={options}
                color={color}
                getCount={(id) =>
                  getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, id), battleRound)
                }
                canScore={(id, delta) => canSecondary(card, id, delta)}
                onScore={(id, delta) => onSecondaryScore(card, id, delta)}
                formatTiming={formatTiming}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
