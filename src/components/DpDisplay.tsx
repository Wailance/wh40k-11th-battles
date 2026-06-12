import { copy } from '../lib/copy'
import { MAX_DP } from '../lib/game-utils'

/** Filled / empty detachment point pips (max 3 per 11th ed roster). */
export function DpPips({
  value,
  max = MAX_DP,
  size = 'md',
  color,
  dimUnused = true,
}: {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
  dimUnused?: boolean
}) {
  const clamped = Math.max(0, Math.min(max, value))
  const sizeClass =
    size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`rounded-full border transition-colors ${sizeClass} ${
            i < clamped
              ? 'border-accent/60 bg-accent shadow-[0_0_6px_rgba(155,44,44,0.35)]'
              : dimUnused
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-white/20 bg-white/[0.08]'
          }`}
          style={i < clamped && color ? { backgroundColor: color, borderColor: color } : undefined}
        />
      ))}
    </span>
  )
}

export function DpCost({
  dp,
  size = 'md',
}: {
  dp: number
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <DpPips value={dp} size={size} dimUnused={false} />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-accent tabular-nums">
        {dp}
      </span>
    </span>
  )
}

export function DpBudget({
  used,
  max = MAX_DP,
  color,
  label,
}: {
  used: number
  max?: number
  color?: string
  label?: string
}) {
  const remaining = max - used
  const full = used >= max

  return (
    <div
      className="space-y-2"
      aria-label={`${used} of ${max} detachment points used`}
    >
      <div className="flex items-center justify-between gap-2">
        {label && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
        )}
        <div className="flex items-center gap-2">
          <DpPips value={used} max={max} size="md" color={color} />
          <span
            className={`text-sm font-semibold tabular-nums ${full ? 'text-accent' : 'text-bone'}`}
          >
            {used}
            <span className="text-muted/70">/{max}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 overflow-hidden rounded-full ${
              i < used ? 'bg-accent/25' : 'bg-white/[0.06]'
            }`}
          >
            <div
              className="h-full rounded-full bg-crimson-bright transition-all duration-300"
              style={{
                width: i < used ? '100%' : '0%',
                opacity: i < used ? 1 : 0,
                ...(color && i < used ? { backgroundColor: color } : {}),
              }}
            />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted">
        {full ? (
          <span className="text-accent">{copy.dp.full}</span>
        ) : (
          copy.dp.remaining(remaining)
        )}
      </p>
    </div>
  )
}
