import { MissionNameButton } from './MissionNameButton'
import { MissionScoreButtons } from './MissionScoreButtons'
import { SecondaryMissionsPanel } from './SecondaryMissionsPanel'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  formatRoundFiveTimingHint,
  getMissionScoreOptions,
  getTallyCount,
  scoreOptionsForRound,
  secondaryScoreKey,
  tacticalDrawPoolSize,
  tacticalPanelCards,
  validateScoreIncrement,
  validateTacticalDraw,
} from '../lib/mission-scoring'
import type { PlayerScores, PlayerSetup } from '../types/game'

export function PlayerMissionScorer({
  player,
  scores,
  color,
  battleRound,
  scoringEnabled = true,
  scoringLockReason,
  isSecondPlayer = false,
  compact = false,
  hidePlayerHeader = false,
  onPrimaryScore,
  onSecondaryScore,
  onRandomSecondary,
  onDiscardSecondary,
  onRestoreTacticalToDeck,
  onRestoreDiscardedToDeck,
  onApplyFixedSecondaries,
  onApplyTacticalSecondaries,
  currentBattleRound,
}: {
  player: PlayerSetup
  scores: PlayerScores
  color: string
  battleRound: number
  scoringEnabled?: boolean
  scoringLockReason?: string
  isSecondPlayer?: boolean
  compact?: boolean
  hidePlayerHeader?: boolean
  onPrimaryScore: (optionId: string, delta: 1 | -1) => void
  onSecondaryScore: (card: string, optionId: string, delta: 1 | -1) => void
  onRandomSecondary: () => void
  onDiscardSecondary: (card: string, index: number) => void
  onRestoreTacticalToDeck?: (card: string) => void
  onRestoreDiscardedToDeck?: (card: string) => void
  onApplyFixedSecondaries: (selected: string[]) => void
  onApplyTacticalSecondaries: (hand: string[], restoreToDeck: string[]) => void
  currentBattleRound: number
}) {
  const primaryOptions = getMissionScoreOptions(player.primaryMission)
  const isTactical = player.secondaryMode === 'tactical'

  const roundPrimary = scores.primaryRoundVp[battleRound - 1] ?? 0
  const roundSecondary = scores.secondaryRoundVp[battleRound - 1] ?? 0
  const formatTiming = (timing: string) =>
    formatRoundFiveTimingHint(timing, battleRound, isSecondPlayer)
  const secondaryCap =
    player.secondaryMode === 'fixed'
      ? DEFAULT_CAPS.fixedSecondaryMaxGame
      : DEFAULT_CAPS.tacticalSecondaryMaxGame
  const randomValidation = isTactical ? validateTacticalDraw(scores) : { allowed: false as const }

  const discardableCards = isTactical
    ? tacticalPanelCards(player, scores, battleRound, currentBattleRound)
    : []
  const canDiscard = discardableCards.length > 0
  const discardBlockedReason = copy.game.secondaryDiscardBlocked

  const secondaryEditable = scoringEnabled
  const secondaryScoringEnabled = scoringEnabled

  const secondaryCardScoring = secondaryScoringEnabled
    ? {
        getCount: (card: string, optionId: string) =>
          getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, optionId), battleRound),
        canScore: (card: string, optionId: string, delta: 1 | -1) => canSecondary(card, optionId, delta),
        onScore: (card: string, optionId: string, delta: 1 | -1) => onSecondaryScore(card, optionId, delta),
      }
    : undefined

  const canPrimary = (optionId: string, delta: 1 | -1) => {
    if (!scoringEnabled) {
      return { allowed: false, reason: scoringLockReason ?? copy.game.scoringLockedPreBattle }
    }
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
    if (!scoringEnabled) {
      return { allowed: false, reason: scoringLockReason ?? copy.game.scoringLockedPreBattle }
    }
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
      currentBattleRound,
      delta,
      secondaryCard: card,
    })
  }

  const secondaryPanel = (
    <SecondaryMissionsPanel
      player={player}
      scores={scores}
      battleRound={battleRound}
      currentBattleRound={currentBattleRound}
      editable={secondaryEditable}
      deckCount={isTactical ? tacticalDrawPoolSize(scores) : undefined}
      canRandom={randomValidation.allowed}
      randomBlockedReason={randomValidation.reason}
      canDiscard={canDiscard}
      discardBlockedReason={discardBlockedReason}
      cardScoring={secondaryCardScoring}
      color={color}
      secondaryVp={scores.secondaryVp}
      secondaryCap={secondaryCap}
      onRandom={onRandomSecondary}
      onDiscard={onDiscardSecondary}
      onRestoreToDeck={onRestoreTacticalToDeck}
      onApplyFixed={onApplyFixedSecondaries}
      onApplyTactical={onApplyTacticalSecondaries}
      onRestoreDiscardedToDeck={onRestoreDiscardedToDeck}
    />
  )

  if (compact) {
    return (
      <div className="app-panel app-compact-panel space-y-1.5">
        {!hidePlayerHeader && (
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1">
            <p className="truncate text-caption font-semibold" style={{ color }}>
              {player.name}
            </p>
            <p className="shrink-0 text-micro tabular-nums text-muted">
              {scores.primaryVp}/{DEFAULT_CAPS.primaryMaxGame}P · {scores.secondaryVp}/{secondaryCap}S
              {player.battleReady && ` · +${DEFAULT_CAPS.battleReadyVp}`}
            </p>
          </div>
        )}
        {!hidePlayerHeader && (
          <p className="truncate text-micro text-muted">
            <MissionNameButton name={player.primaryMission} className="text-micro" showIcon={false} />
            {' · '}
            R{battleRound}: {roundPrimary + roundSecondary}/30
          </p>
        )}
        {hidePlayerHeader && (
          <p className="truncate text-micro text-muted">
            <MissionNameButton name={player.primaryMission} className="text-micro" showIcon={false} />
            {' · '}
            R{battleRound}: {roundPrimary + roundSecondary}/30 VP · Total {scores.vp}
            {player.battleReady ? ` (+${DEFAULT_CAPS.battleReadyVp} BR)` : ''}
          </p>
        )}

        <MissionScoreButtons
          title={`${copy.game.primaryScoring} ${scores.primaryVp}/${DEFAULT_CAPS.primaryMaxGame}`}
          options={scoreOptionsForRound(primaryOptions, battleRound)}
          getCount={(id) => getTallyCount(scores.primaryScoreTally, id, battleRound)}
          canScore={canPrimary}
          onScore={onPrimaryScore}
          color={color}
          formatTiming={formatTiming}
          compact
        />

        {secondaryPanel}
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
          <p className="mt-0.5 text-caption text-muted">
            <MissionNameButton name={player.primaryMission} className="text-caption" showIcon={false} />
            {player.battleReady && (
              <span className="ml-2 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-micro text-accent">
                {copy.game.battleReadyBadge}
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right text-caption tabular-nums text-muted">
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
        options={scoreOptionsForRound(primaryOptions, battleRound)}
        getCount={(id) => getTallyCount(scores.primaryScoreTally, id, battleRound)}
        canScore={canPrimary}
        onScore={onPrimaryScore}
        color={color}
        formatTiming={formatTiming}
      />

      {secondaryPanel}
    </div>
  )
}
