import { MissionNameButton } from './MissionNameButton'
import { canReturnSecondaryToDeck } from '../lib/mission-scoring'
import { copy } from '../lib/copy'
import type { PlayerScores } from '../types/game'

function cardHasScoredVp(scores: PlayerScores, card: string): boolean {
  const prefix = `${card}::`
  for (const [key, counts] of Object.entries(scores.secondaryScoreTally)) {
    if (key.startsWith(prefix) && counts.some((c) => c > 0)) return true
  }
  return false
}

export function SecondaryCardHand({
  hand,
  achieved,
  deckCount,
  battleRound,
  drawCount,
  canDraw,
  drawBlockedReason,
  rerollUsed,
  canReroll = true,
  scores,
  onDraw,
  onReturnToDeck,
  onDiscardForCp,
  onAchieve,
  onReroll,
  compact = false,
}: {
  hand: string[]
  achieved: string[]
  deckCount: number
  battleRound: number
  drawCount: number
  canDraw: boolean
  drawBlockedReason?: string
  rerollUsed: boolean
  canReroll?: boolean
  scores: PlayerScores
  onDraw: () => void
  onReturnToDeck: (card: string, index: number) => void
  onDiscardForCp: (card: string, index: number) => void
  onAchieve: (card: string, index: number) => void
  onReroll: (card: string, index: number) => void
  compact?: boolean
}) {
  const row = (card: string, index: number, mode: 'active' | 'achieved') => (
    <div key={`${mode}-${card}-${index}`} className="app-score-row">
      <MissionNameButton name={card} className="min-w-0 flex-1 truncate text-[10px]" showIcon={false} />
      {mode === 'achieved' && (
        <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[8px] uppercase text-accent">
          {copy.game.tacticalAchieved}
        </span>
      )}
      {mode === 'active' && (
        <>
          {canReturnSecondaryToDeck(card, battleRound, hand) && (
            <button
              type="button"
              onClick={() => onReturnToDeck(card, index)}
              className="app-score-row-btn text-[9px]"
              title={copy.game.returnToDeckHint}
            >
              ↩
            </button>
          )}
          {cardHasScoredVp(scores, card) && (
            <button
              type="button"
              onClick={() => onAchieve(card, index)}
              className="app-score-row-btn text-[9px] text-accent"
              title={copy.game.achieveTacticalHint}
            >
              ✓
            </button>
          )}
          <button
            type="button"
            onClick={() => onDiscardForCp(card, index)}
            className="app-score-row-btn text-[8px]"
            title={copy.game.discardForCpHint}
          >
            CP
          </button>
          {!rerollUsed && canReroll && (
            <button
              type="button"
              onClick={() => onReroll(card, index)}
              className="app-score-row-btn text-[8px]"
              title={copy.game.rerollTacticalHint}
            >
              ↻
            </button>
          )}
        </>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="app-dash-box px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="app-dash-label">{copy.game.secondaryScoring}</p>
          <button
            type="button"
            onClick={onDraw}
            disabled={!canDraw}
            title={drawBlockedReason}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] disabled:opacity-40"
          >
            {drawCount > 0 && drawCount < 2 ? `+${drawCount}` : copy.game.drawTactical}
          </button>
        </div>
        <p className="mb-1 text-[9px] text-muted">
          {copy.game.deckRemaining(deckCount)}
          {rerollUsed && ` · ${copy.game.rerollUsed}`}
        </p>
        {hand.length === 0 ? (
          <p className="text-[9px] text-muted">{copy.game.noTacticalCards}</p>
        ) : (
          hand.map((card, index) => row(card, index, 'active'))
        )}
        {achieved.length > 0 && (
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            <p className="app-dash-label mb-1">{copy.game.tacticalAchieved}</p>
            {achieved.map((card, index) => row(card, index, 'achieved'))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">{copy.game.deckRemaining(deckCount)}</span>
        <button
          type="button"
          onClick={onDraw}
          disabled={!canDraw}
          title={drawBlockedReason}
          className="app-btn rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-40"
        >
          {drawCount > 0 && drawCount < 2 ? `Draw ${drawCount}` : copy.game.drawTactical}
        </button>
      </div>
      {hand.length === 0 ? (
        <p className="text-xs text-muted">{copy.game.noTacticalCards}</p>
      ) : (
        <div className="space-y-2">{hand.map((card, index) => row(card, index, 'active'))}</div>
      )}
      {achieved.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <p className="text-xs font-medium text-muted">{copy.game.tacticalAchieved}</p>
          {achieved.map((card, index) => row(card, index, 'achieved'))}
        </div>
      )}
    </div>
  )
}
