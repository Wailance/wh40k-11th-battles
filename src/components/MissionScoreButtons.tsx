import type { MissionScoreOption, ScoreValidation } from '../lib/mission-scoring'

export function MissionScoreButtons({
  title,
  options,
  getCount,
  canScore,
  onScore,
  color,
  formatTiming,
}: {
  title: string
  options: MissionScoreOption[]
  getCount: (optionId: string) => number
  canScore: (optionId: string, delta: 1 | -1) => ScoreValidation
  onScore: (optionId: string, delta: 1 | -1) => void
  color?: string
  compact?: boolean
  formatTiming?: (timing: string) => string
}) {
  if (!options.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted" style={{ color }}>
        {title}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const count = getCount(opt.id)
          const roundVp = count * opt.vp
          const plus = canScore(opt.id, 1)
          const minus = canScore(opt.id, -1)
          const inactive = !plus.allowed && count === 0

          return (
            <div
              key={opt.id}
              data-inactive={inactive}
              className="app-score-btn flex items-stretch gap-0.5 p-0.5"
              title={inactive ? plus.reason : undefined}
            >
              <button
                type="button"
                onClick={() => minus.allowed && onScore(opt.id, -1)}
                disabled={!minus.allowed}
                className="app-btn-ghost app-score-touch shrink-0 rounded-l-[10px] text-lg disabled:opacity-25"
                aria-label={`Undo ${opt.label}`}
                title={minus.reason}
              >
                −
              </button>
              <div className="min-w-0 flex-1 px-2 py-2">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-accent-dim">
                  {formatTiming ? formatTiming(opt.timing) : opt.timing}
                </span>
                <span className="block text-sm leading-snug text-bone">{opt.label}</span>
                <span className="mt-1 block text-sm font-semibold tabular-nums" style={{ color }}>
                  +{opt.vp} VP
                  {count > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      ×{count} = {roundVp}
                    </span>
                  )}
                </span>
                {!plus.allowed && count === 0 && plus.reason && (
                  <span className="mt-1 block text-xs text-warning">{plus.reason}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => plus.allowed && onScore(opt.id, 1)}
                disabled={!plus.allowed}
                className="app-btn app-score-touch m-0.5 shrink-0 rounded-[10px] text-xl font-bold disabled:opacity-30"
                aria-label={`Score ${opt.label}`}
                title={plus.reason}
              >
                +
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
