import { copy } from '../lib/copy'

const MAX_ROUNDS = 5

export function GameRoundNav({
  viewRound,
  battleRound,
  onSelectRound,
  onAdvanceRound,
}: {
  viewRound: number
  battleRound: number
  onSelectRound: (round: number) => void
  onAdvanceRound: () => void
}) {
  const canPrev = viewRound > 1
  const canNext = viewRound < battleRound || (viewRound === battleRound && battleRound < 5)
  const progressPct = (viewRound / MAX_ROUNDS) * 100

  function goNext() {
    if (viewRound < battleRound) {
      onSelectRound(viewRound + 1)
      return
    }
    if (viewRound === battleRound && battleRound < 5) {
      onAdvanceRound()
    }
  }

  return (
    <nav className="game-round-nav" aria-label={copy.game.selectRound}>
      <div className="game-round-nav-row">
        <button
          type="button"
          className="game-round-nav-arrow"
          disabled={!canPrev}
          onClick={() => onSelectRound(viewRound - 1)}
          aria-label={copy.game.roundPrev(viewRound - 1)}
        >
          ‹
        </button>

        <div className="game-round-nav-center">
          <div
            className="game-round-progress"
            role="progressbar"
            aria-valuenow={viewRound}
            aria-valuemin={1}
            aria-valuemax={MAX_ROUNDS}
            aria-label={copy.game.roundVp(viewRound)}
          >
            <div className="game-round-progress-fill" style={{ width: `${progressPct}%` }} />
            <div className="game-round-progress-ticks" aria-hidden>
              {Array.from({ length: MAX_ROUNDS - 1 }, (_, i) => (
                <span
                  key={i}
                  className="game-round-progress-tick"
                  style={{ left: `${((i + 1) / MAX_ROUNDS) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <p className="game-round-nav-title">{copy.game.roundVp(viewRound)}</p>
        </div>

        <button
          type="button"
          className="game-round-nav-arrow"
          disabled={!canNext}
          onClick={goNext}
          aria-label={
            viewRound === battleRound && battleRound < 5
              ? copy.game.advanceRound(battleRound + 1)
              : copy.game.roundNext(viewRound + 1)
          }
        >
          ›
        </button>
      </div>
    </nav>
  )
}
