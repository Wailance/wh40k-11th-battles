import { MissionNameButton } from './MissionNameButton'
import { MissionScoreButtons } from './MissionScoreButtons'
import { SecondaryCardHand } from './SecondaryCardHand'
import { CpTracker } from './CpTracker'
import { copy } from '../lib/copy'
import { whenDrawnReminder, mayManualRedrawWhenDrawn } from '../lib/tactical-when-drawn'
import {
  DEFAULT_CAPS,
  formatRoundFiveTimingHint,
  getMissionScoreOptions,
  getTallyCount,
  secondaryCardsForRound,
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
  isCurrentRound = true,
  isSecondPlayer = false,
  tablePhase = 'command' as 'command' | 'turn' | 'end-turn',
  onTablePhaseChange,
  compact = false,
  onPrimaryScore,
  onSecondaryScore,
  onDrawTactical,
  onReturnToDeck,
  onDiscardForCp,
  onAchieveTactical,
  onRerollTactical,
  onRemoveFixedSecondary,
}: {
  player: PlayerSetup
  scores: PlayerScores
  color: string
  battleRound: number
  isCurrentRound?: boolean
  isSecondPlayer?: boolean
  tablePhase?: 'command' | 'turn' | 'end-turn'
  onTablePhaseChange?: (p: 'command' | 'turn' | 'end-turn') => void
  compact?: boolean
  onPrimaryScore: (optionId: string, delta: 1 | -1) => void
  onSecondaryScore: (card: string, optionId: string, delta: 1 | -1) => void
  onDrawTactical: () => void
  onReturnToDeck: (card: string, index: number) => void
  onDiscardForCp: (card: string, index: number) => void
  onAchieveTactical: (card: string, index: number) => void
  onRerollTactical: (card: string, index: number) => void
  onRemoveFixedSecondary: (card: string) => void
}) {
  const primaryOptions = getMissionScoreOptions(player.primaryMission)
  const activeSecondaries = secondaryCardsForRound(player, scores, battleRound)

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

  if (compact) {
    return (
      <div className="app-panel app-compact-panel space-y-1.5">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1">
          <p className="truncate text-xs font-semibold" style={{ color }}>
            {player.name}
          </p>
          <p className="shrink-0 text-[9px] tabular-nums text-muted">
            {scores.primaryVp}/{DEFAULT_CAPS.primaryMaxGame}P · {scores.secondaryVp}/{secondaryCap}S
            {player.battleReady && ` · +${DEFAULT_CAPS.battleReadyVp}`}
          </p>
        </div>
        <p className="truncate text-[9px] text-muted">
          <MissionNameButton name={player.primaryMission} className="text-[9px]" showIcon={false} />
          {' · '}
          R{battleRound}: {roundPrimary + roundSecondary}/30
        </p>

        <MissionScoreButtons
          title={`${copy.game.primaryScoring} ${scores.primaryVp}/${DEFAULT_CAPS.primaryMaxGame}`}
          options={primaryOptions}
          getCount={(id) => getTallyCount(scores.primaryScoreTally, id, battleRound)}
          canScore={canPrimary}
          onScore={onPrimaryScore}
          color={color}
          formatTiming={formatTiming}
          compact
        />

        {player.secondaryMode === 'tactical' && isCurrentRound && (
          <>
            <CpTracker
              compact
              extraCpThisRound={scores.extraCpThisRound}
              rerollUsed={scores.tacticalRerollUsed}
              phase={tablePhase}
              onPhaseChange={onTablePhaseChange ?? (() => {})}
            />
            <SecondaryCardHand
              compact
              hand={scores.tacticalHand}
              achieved={scores.tacticalAchieved}
              deckCount={scores.tacticalDeck.length}
              battleRound={battleRound}
              drawCount={tacticalDrawCount(scores)}
              canDraw={drawValidation.allowed}
              drawBlockedReason={drawValidation.reason}
              rerollUsed={scores.tacticalRerollUsed}
              canReroll={tablePhase === 'command'}
              scores={scores}
              onDraw={onDrawTactical}
              onReturnToDeck={onReturnToDeck}
              onDiscardForCp={onDiscardForCp}
              onAchieve={onAchieveTactical}
              onReroll={onRerollTactical}
            />
            {scores.tacticalHand.map((card) => {
              const note = whenDrawnReminder(card)
              if (!note && !mayManualRedrawWhenDrawn(card)) return null
              return (
                <p key={card} className="text-[9px] leading-snug text-muted">
                  <span className="text-accent-dim">{copy.game.whenDrawnNote}:</span> {note ?? copy.game.discardCard}
                </p>
              )
            })}
          </>
        )}

        {player.secondaryMode === 'fixed' && isCurrentRound && activeSecondaries.length > 0 && (
          <div className="app-dash-box px-2 py-1.5">
            <p className="app-dash-label mb-1">Fixed</p>
            {activeSecondaries.map((card) => (
              <div key={card} className="app-score-row">
                <MissionNameButton name={card} className="min-w-0 flex-1 truncate text-[10px]" showIcon={false} />
                <button
                  type="button"
                  onClick={() => onRemoveFixedSecondary(card)}
                  className="app-score-row-btn text-[10px]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {activeSecondaries.length > 0 && (
          <div className="space-y-1.5">
            {activeSecondaries.map((card) => {
              const options = getMissionScoreOptions(card, player.secondaryMode)
              if (!options.length) return null
              return (
                <MissionScoreButtons
                  key={card}
                  title={`${copy.game.secondaryScoring}: ${card}`}
                  options={options}
                  color={color}
                  getCount={(id) =>
                    getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, id), battleRound)
                  }
                  canScore={(id, delta) => canSecondary(card, id, delta)}
                  onScore={(id, delta) => onSecondaryScore(card, id, delta)}
                  formatTiming={formatTiming}
                  compact
                />
              )
            })}
          </div>
        )}
      </div>
    )
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

      {player.secondaryMode === 'tactical' && isCurrentRound && (
        <SecondaryCardHand
          hand={scores.tacticalHand}
          achieved={scores.tacticalAchieved}
          deckCount={scores.tacticalDeck.length}
          battleRound={battleRound}
          drawCount={tacticalDrawCount(scores)}
          canDraw={drawValidation.allowed}
          drawBlockedReason={drawValidation.reason}
          rerollUsed={scores.tacticalRerollUsed}
          scores={scores}
          onDraw={onDrawTactical}
          onReturnToDeck={onReturnToDeck}
          onDiscardForCp={onDiscardForCp}
          onAchieve={onAchieveTactical}
          onReroll={onRerollTactical}
        />
      )}

      {player.secondaryMode === 'fixed' && isCurrentRound && activeSecondaries.length > 0 && (
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
