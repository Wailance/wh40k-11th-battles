import { MissionNameButton } from './MissionNameButton'
import { canReturnSecondaryToDeck, getMissionScoreOptions, tacticalScoreHint } from '../lib/mission-scoring'
import { mayManualRedrawWhenDrawn, whenDrawnReminder } from '../lib/tactical-when-drawn'
import { copy } from '../lib/copy'
import type { PlayerScores } from '../types/game'

function TacticalAction({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="app-tactical-action"
    >
      {label}
    </button>
  )
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

function TacticalScoreControls({
  label,
  hint,
  vp,
  inactiveReason,
  inactive,
  count,
  color,
  canMinus,
  canPlus,
  onScore,
}: {
  label: string
  hint: string
  vp: number
  inactiveReason?: string
  inactive: boolean
  count: number
  color: string
  canMinus: boolean
  canPlus: boolean
  onScore: (delta: 1 | -1) => void
}) {
  return (
    <div
      className="app-tactical-score-row"
      data-inactive={inactive}
      title={inactive ? inactiveReason : label}
    >
      <span className="app-tactical-score-hint">
        +{vp} · {hint}
      </span>
      <div className="app-tactical-score-buttons">
        <button
          type="button"
          onClick={() => canMinus && onScore(-1)}
          disabled={!canMinus}
          className="app-tactical-score-btn"
          aria-label={`Undo ${label}`}
        >
          −
        </button>
        <span className="app-tactical-score-count tabular-nums" style={{ color }}>
          {count}
        </span>
        <button
          type="button"
          onClick={() => canPlus && onScore(1)}
          disabled={!canPlus}
          className="app-tactical-score-btn app-tactical-score-btn-plus"
          aria-label={`Score ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

type CardScoring = {
  color: string
  formatTiming?: (timing: string) => string
  getCount: (card: string, optionId: string) => number
  canScore: (card: string, optionId: string, delta: 1 | -1) => { allowed: boolean; reason?: string }
  onScore: (card: string, optionId: string, delta: 1 | -1) => void
}

export function SecondaryCardHand({
  hand,
  deckCount,
  battleRound,
  drawCount,
  canDraw,
  drawBlockedReason,
  rerollUsed,
  canReroll = true,
  cardScoring,
  onDraw,
  onReturnToDeck,
  onReroll,
  compact = false,
}: {
  hand: string[]
  deckCount: number
  battleRound: number
  drawCount: number
  canDraw: boolean
  drawBlockedReason?: string
  rerollUsed: boolean
  canReroll?: boolean
  scores: PlayerScores
  cardScoring?: CardScoring
  onDraw: () => void
  onReturnToDeck: (card: string, index: number) => void
  onReroll: (card: string, index: number) => void
  compact?: boolean
}) {
  const row = (card: string, index: number) => {
    const options = cardScoring ? getMissionScoreOptions(card, 'tactical') : []
    const showReturn = canReturnSecondaryToDeck(card, battleRound, hand)
    const showReroll = !rerollUsed && canReroll
    const hasActions = showReturn || showReroll

    return (
      <div key={`${card}-${index}`} className="app-tactical-card">
        <div className="app-tactical-card-top">
          <MissionNameButton
            name={card}
            className="app-tactical-card-name text-micro font-medium"
            showIcon
          />
          {hasActions && (
            <div className="app-tactical-card-actions">
              {showReturn && (
                <TacticalAction
                  label={copy.game.tacticalReturnDeck}
                  title={copy.game.returnToDeckHint}
                  onClick={() => onReturnToDeck(card, index)}
                />
              )}
              {showReroll && (
                <TacticalAction
                  label={copy.game.tacticalRerollBtn}
                  title={copy.game.rerollTacticalHint}
                  onClick={() => onReroll(card, index)}
                />
              )}
            </div>
          )}
        </div>
        {cardScoring && options.length > 0 && (
          <div className="app-tactical-card-scoring">
            {options.map((opt) => {
              const count = cardScoring.getCount(card, opt.id)
              const plus = cardScoring.canScore(card, opt.id, 1)
              const minus = cardScoring.canScore(card, opt.id, -1)
              const inactive = !plus.allowed && count === 0
              const hint = tacticalScoreHint(card, opt, options)

              return (
                <TacticalScoreControls
                  key={opt.id}
                  label={opt.label}
                  hint={hint}
                  vp={opt.vp}
                  inactive={inactive}
                  inactiveReason={plus.reason}
                  count={count}
                  color={cardScoring.color}
                  canMinus={minus.allowed}
                  canPlus={plus.allowed}
                  onScore={(delta) => cardScoring.onScore(card, opt.id, delta)}
                />
              )
            })}
          </div>
        )}
        <WhenDrawnNote card={card} />
      </div>
    )
  }

  if (compact) {
    return (
      <div className="app-dash-box px-2 py-1.5">
        <div className="app-tactical-hand-header">
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-wide text-bone">
              {copy.game.tacticalHandTitle}
            </p>
            <p className="text-micro text-muted">{copy.game.deckRemaining(deckCount)}</p>
          </div>
          <button
            type="button"
            onClick={onDraw}
            disabled={!canDraw}
            title={drawBlockedReason}
            className="app-tactical-draw-btn"
          >
            {drawCount > 0 && drawCount < 2 ? `+${drawCount}` : copy.game.drawTactical}
          </button>
        </div>
        {hand.length === 0 ? (
          <p className="text-micro text-muted">{copy.game.noTacticalCards}</p>
        ) : (
          <div className="app-tactical-card-list">{hand.map((card, index) => row(card, index))}</div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-caption text-muted">{copy.game.deckRemaining(deckCount)}</span>
        <button
          type="button"
          onClick={onDraw}
          disabled={!canDraw}
          title={drawBlockedReason}
          className="app-btn rounded-lg px-2.5 py-1 text-caption disabled:opacity-40"
        >
          {drawCount > 0 && drawCount < 2 ? `Draw ${drawCount}` : copy.game.drawTactical}
        </button>
      </div>
      {hand.length === 0 ? (
        <p className="text-caption text-muted">{copy.game.noTacticalCards}</p>
      ) : (
        <div className="space-y-2">{hand.map((card, index) => row(card, index))}</div>
      )}
    </div>
  )
}
