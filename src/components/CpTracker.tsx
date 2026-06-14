import { copy } from '../lib/copy'
import { AppSegment, AppSegmentButton } from './AppSegment'

export function CpTracker({
  rerollUsed,
  phase,
  onPhaseChange,
  commandsFirstName,
  compact = false,
}: {
  rerollUsed: boolean
  phase: 'command' | 'turn' | 'end-turn'
  onPhaseChange: (p: 'command' | 'turn' | 'end-turn') => void
  commandsFirstName?: string
  compact?: boolean
}) {
  return (
    <div className={`app-dash-box ${compact ? 'px-2 py-2' : 'p-3'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-micro font-semibold uppercase tracking-wide text-bone">
          {copy.game.tablePhaseTitle}
        </p>
        {rerollUsed && (
          <span className="rounded border border-faint px-1.5 py-0.5 text-micro text-muted">
            {copy.game.rerollUsed}
          </span>
        )}
      </div>
      <AppSegment compact aria-label={copy.game.tablePhaseTitle}>
        {(['command', 'turn', 'end-turn'] as const).map((p) => (
          <AppSegmentButton key={p} active={phase === p} onClick={() => onPhaseChange(p)}>
            {copy.cp.phase(p)}
          </AppSegmentButton>
        ))}
      </AppSegment>
      <p className="mt-2 text-micro leading-snug text-muted">
        {commandsFirstName && phase === 'command' ? (
          <span className="mb-0.5 block text-accent-dim">{copy.cp.commandsFirst(commandsFirstName)}</span>
        ) : null}
        {copy.cp.hint(phase)}
      </p>
    </div>
  )
}
