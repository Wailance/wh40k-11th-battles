import { useState } from 'react'
import { MissionNameButton } from './MissionNameButton'
import { SecondaryMissionPickerSheet } from './SecondaryMissionPickerSheet'
import { SecondaryScoreCheckboxes } from './SecondaryScoreCheckboxes'
import { RestoreToDeckButton } from './RestoreToDeckButton'
import { copy } from '../lib/copy'
import { activateOnKeyboard } from '../lib/use-overlay'
import { tacticalPanelCards, TACTICAL_ACTIVE_LIMIT, canReturnSecondaryToDeck } from '../lib/mission-scoring'
import { mayManualRedrawWhenDrawn, whenDrawnReminder } from '../lib/tactical-when-drawn'
import type { PlayerScores, PlayerSetup } from '../types/game'

type CardScoring = {
  getCount: (card: string, optionId: string) => number
  canScore: (card: string, optionId: string, delta: 1 | -1) => { allowed: boolean; reason?: string }
  onScore: (card: string, optionId: string, delta: 1 | -1) => void
}

function WhenDrawnNote({ card }: { card: string }) {
  const whenDrawn = whenDrawnReminder(card)
  const mayRedraw = mayManualRedrawWhenDrawn(card)
  if (!whenDrawn && !mayRedraw) return null
  return (
    <p className="app-tactical-when-drawn-text">
      <span className="text-accent-dim">{copy.game.whenDrawnNote}:</span>{' '}
      {whenDrawn ?? copy.game.discardCard}
    </p>
  )
}

function ActiveCardRow({
  card,
  index,
  player,
  scores,
  battleRound,
  editable,
  cardScoring,
  discardMode,
  onDiscardPick,
  onRestoreToDeck,
}: {
  card: string
  index: number
  player: PlayerSetup
  scores: PlayerScores
  battleRound: number
  editable: boolean
  cardScoring?: CardScoring
  discardMode: boolean
  onDiscardPick: (card: string, index: number) => void
  onRestoreToDeck?: (card: string) => void
}) {
  const inHand = scores.tacticalHand.includes(card)
  const scoredOnly = !inHand
  const canPickDiscard = discardMode && (inHand || scoredOnly)
  const showRestore =
    editable &&
    inHand &&
    !discardMode &&
    (mayManualRedrawWhenDrawn(card) || canReturnSecondaryToDeck(card, battleRound, scores.tacticalHand))

  return (
    <div
      className={`app-secondary-active-card ${canPickDiscard ? 'is-discard-pick' : ''} ${scoredOnly ? 'is-scored-only' : ''}`}
      onClick={canPickDiscard ? () => onDiscardPick(card, index) : undefined}
      onKeyDown={canPickDiscard ? (e) => activateOnKeyboard(e, () => onDiscardPick(card, index)) : undefined}
      role={canPickDiscard ? 'button' : undefined}
      tabIndex={canPickDiscard ? 0 : undefined}
    >
      <div className="app-secondary-active-card-head">
        <MissionNameButton name={card} className="min-w-0 flex-1 text-caption font-medium" showIcon />
        {scoredOnly && (
          <span className="app-secondary-scored-badge">{copy.game.secondaryStatusScored}</span>
        )}
        {canPickDiscard && (
          <span className="app-secondary-discard-hint">{copy.game.secondaryDiscardPick}</span>
        )}
      </div>
      {cardScoring && !discardMode && (
        <SecondaryScoreCheckboxes
          card={card}
          mode={player.secondaryMode ?? 'tactical'}
          battleRound={battleRound}
          cardScoring={cardScoring}
        />
      )}
      {showRestore && (
        <RestoreToDeckButton onClick={() => onRestoreToDeck?.(card)} />
      )}
      {!showRestore && !discardMode && player.secondaryMode === 'tactical' && <WhenDrawnNote card={card} />}
    </div>
  )
}

export function SecondaryMissionsPanel({
  player,
  scores,
  battleRound,
  currentBattleRound,
  editable,
  deckCount,
  canRandom,
  randomBlockedReason,
  canDiscard,
  discardBlockedReason,
  cardScoring,
  color,
  secondaryVp,
  secondaryCap,
  onRandom,
  onDiscard,
  onRestoreToDeck,
  onApplyFixed,
  onApplyTactical,
  onRestoreDiscardedToDeck,
}: {
  player: PlayerSetup
  scores: PlayerScores
  battleRound: number
  currentBattleRound: number
  editable: boolean
  deckCount?: number
  canRandom: boolean
  randomBlockedReason?: string
  canDiscard: boolean
  discardBlockedReason?: string
  cardScoring?: CardScoring
  color?: string
  secondaryVp?: number
  secondaryCap?: number
  onRandom: () => void
  onDiscard: (card: string, index: number) => void
  onRestoreToDeck?: (card: string) => void
  onApplyFixed: (selected: string[]) => void
  onApplyTactical: (hand: string[], restoreToDeck: string[]) => void
  onRestoreDiscardedToDeck?: (card: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [discardMode, setDiscardMode] = useState(false)
  const isTactical = player.secondaryMode === 'tactical'

  const activeCards = isTactical
    ? tacticalPanelCards(player, scores, battleRound, currentBattleRound)
    : player.secondaries.filter((c) => !scores.removedSecondaries.includes(c))

  const handCount = isTactical ? scores.tacticalHand.length : activeCards.length

  const handleDiscardPick = (card: string, index: number) => {
    onDiscard(card, index)
    setDiscardMode(false)
  }

  const startDiscard = () => {
    if (discardMode) {
      setDiscardMode(false)
      return
    }
    if (!canDiscard) return
    if (activeCards.length === 1) {
      onDiscard(activeCards[0], 0)
      return
    }
    setDiscardMode(true)
  }

  const meta = isTactical
    ? copy.game.secondaryPanelMeta(deckCount ?? scores.tacticalDeck.length, handCount, TACTICAL_ACTIVE_LIMIT)
    : copy.game.secondaryPanelFixedMeta(activeCards.length, 2)

  return (
    <>
      <div className="app-secondary-panel">
        <div className="app-secondary-panel-head">
          <p className="app-dash-label" style={{ color }}>
            {copy.game.secondaryScoring}
            {secondaryVp !== undefined && secondaryCap !== undefined && (
              <>
                {' '}
                <span className="tabular-nums">
                  {secondaryVp}/{secondaryCap}
                </span>
              </>
            )}
          </p>
          <p className="app-secondary-panel-meta">{meta}</p>
        </div>

        {editable && isTactical && (
          <div className="app-secondary-toolbar">
            <button
              type="button"
              onClick={onRandom}
              disabled={!canRandom}
              title={randomBlockedReason}
              className="app-secondary-toolbar-btn app-secondary-toolbar-random"
            >
              {copy.game.secondaryPickerRandom}
            </button>
            <button
              type="button"
              onClick={() => {
                setDiscardMode(false)
                setPickerOpen(true)
              }}
              className="app-secondary-toolbar-btn app-secondary-toolbar-manage"
            >
              {copy.game.secondaryPickerOpen}
            </button>
            <button
              type="button"
              onClick={startDiscard}
              disabled={!canDiscard && !discardMode}
              title={discardBlockedReason}
              className={`app-secondary-toolbar-btn app-secondary-toolbar-discard ${discardMode ? 'is-active' : ''}`}
            >
              {discardMode ? copy.game.secondaryDiscardCancel : copy.game.secondaryDiscard}
            </button>
          </div>
        )}

        {discardMode && (
          <p className="app-secondary-discard-banner">{copy.game.secondaryDiscardBanner}</p>
        )}

        {activeCards.length === 0 ? (
          <p className="app-secondary-empty">{copy.game.secondaryPickerEmpty}</p>
        ) : (
          <div className="app-secondary-active-list">
            {isTactical
              ? activeCards.map((card, index) => (
                  <ActiveCardRow
                    key={card}
                    card={card}
                    index={index}
                    player={player}
                    scores={scores}
                    battleRound={battleRound}
                    editable={editable}
                    cardScoring={cardScoring}
                    discardMode={discardMode}
                    onDiscardPick={handleDiscardPick}
                    onRestoreToDeck={onRestoreToDeck}
                  />
                ))
              : activeCards.map((card, index) => (
                  <div
                    key={card}
                    className={`app-secondary-active-card ${discardMode ? 'is-discard-pick' : ''}`}
                    onClick={discardMode ? () => handleDiscardPick(card, index) : undefined}
                    onKeyDown={
                      discardMode ? (e) => activateOnKeyboard(e, () => handleDiscardPick(card, index)) : undefined
                    }
                    role={discardMode ? 'button' : undefined}
                    tabIndex={discardMode ? 0 : undefined}
                  >
                    <div className="app-secondary-active-card-head">
                      <MissionNameButton name={card} className="min-w-0 flex-1 text-caption font-medium" showIcon />
                      {discardMode && (
                        <span className="app-secondary-discard-hint">{copy.game.secondaryDiscardPick}</span>
                      )}
                    </div>
                    {cardScoring && !discardMode && (
                      <SecondaryScoreCheckboxes
                        card={card}
                        mode={player.secondaryMode ?? 'fixed'}
                        battleRound={battleRound}
                        cardScoring={cardScoring}
                      />
                    )}
                  </div>
                ))}
          </div>
        )}
      </div>

      <SecondaryMissionPickerSheet
        open={pickerOpen && isTactical}
        onClose={() => setPickerOpen(false)}
        player={player}
        scores={scores}
        battleRound={battleRound}
        editable={editable}
        onApplyFixed={onApplyFixed}
        onApplyTactical={onApplyTactical}
        onRestoreDiscardedToDeck={onRestoreDiscardedToDeck}
      />
    </>
  )
}
