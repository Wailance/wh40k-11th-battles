import type { MissionScoreOption, ScoreValidation } from '../lib/mission-scoring'

export function MissionScoreButtons({
  title,
  options,
  getCount,
  canScore,
  onScore,
  color,
  formatTiming,
  compact = false,
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

  if (compact) {
    return (
      <div className="app-dash-box px-2 py-1.5">
        <p className="app-dash-label mb-1" style={{ color }}>
          {title}
        </p>
        <div>
          {options.map((opt) => {
            const count = getCount(opt.id)
            const plus = canScore(opt.id, 1)
            const minus = canScore(opt.id, -1)
            const inactive = !plus.allowed && count === 0
            const timing = formatTiming ? formatTiming(opt.timing) : opt.timing

            return (
              <div
                key={opt.id}
                className="app-score-row"
                data-inactive={inactive}
                title={inactive ? plus.reason : undefined}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] leading-tight text-bone">{opt.label}</p>
                  <p className="text-[9px] text-muted">
                    +{opt.vp} · {timing}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => minus.allowed && onScore(opt.id, -1)}
                  disabled={!minus.allowed}
                  className="app-score-row-btn"
                  aria-label={`Undo ${opt.label}`}
                >
                  −
                </button>
                <span className="w-4 shrink-0 text-center text-[11px] tabular-nums" style={{ color }}>
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => plus.allowed && onScore(opt.id, 1)}
                  disabled={!plus.allowed}
                  className="app-score-row-btn app-score-row-btn-plus"
                  aria-label={`Score ${opt.label}`}
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
