import { MissionNameButton } from './MissionNameButton'
import { canReturnSecondaryToDeck } from '../lib/mission-scoring'
import { copy } from '../lib/copy'

export function SecondaryCardHand({
  hand,
  deckCount,
  battleRound,
  drawCount,
  canDraw,
  drawBlockedReason,
  onDraw,
  onReturnToDeck,
  onDiscard,
}: {
  hand: string[]
  deckCount: number
  battleRound: number
  drawCount: number
  canDraw: boolean
  drawBlockedReason?: string
  onDraw: () => void
  onReturnToDeck: (card: string, index: number) => void
  onDiscard: (card: string, index: number) => void
}) {
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
        <div className="space-y-2">
          {hand.map((card, index) => (
            <div
              key={`${card}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
            >
              <MissionNameButton name={card} className="text-xs font-medium" showIcon />
              <div className="flex gap-1">
                {canReturnSecondaryToDeck(card, battleRound, hand) && (
                  <button
                    type="button"
                    onClick={() => onReturnToDeck(card, index)}
                    className="app-btn-ghost rounded-lg px-2 py-0.5 text-[11px]"
                    title={copy.game.returnToDeckHint}
                  >
                    {copy.game.returnToDeck}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDiscard(card, index)}
                  className="app-btn-ghost rounded-lg px-2 py-0.5 text-[11px] text-muted"
                >
                  {copy.game.discardCard}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
