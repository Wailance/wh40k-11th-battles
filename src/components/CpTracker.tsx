import { copy } from '../lib/copy'

export function CpTracker({
  extraCpThisRound,
  rerollUsed,
  phase,
  onPhaseChange,
  compact = false,
}: {
  extraCpThisRound: number
  rerollUsed: boolean
  phase: 'command' | 'turn' | 'end-turn'
  onPhaseChange: (p: 'command' | 'turn' | 'end-turn') => void
  compact?: boolean
}) {
  const extraLeft = Math.max(0, 1 - extraCpThisRound)

  return (
    <div className={`app-dash-box ${compact ? 'px-2 py-1.5' : 'p-3'}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="app-dash-label">{copy.cp.title}</p>
        <span className="text-[9px] tabular-nums text-muted">
          {copy.cp.extraRemaining(extraLeft)}
          {rerollUsed ? ` · ${copy.game.rerollUsed}` : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {(['command', 'turn', 'end-turn'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPhaseChange(p)}
            data-active={phase === p}
            className={`rounded-md border px-2 py-0.5 text-[9px] ${
              phase === p
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-white/10 text-muted'
            }`}
          >
            {copy.cp.phase(p)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[9px] leading-snug text-muted">{copy.cp.hint(phase)}</p>
    </div>
  )
}
