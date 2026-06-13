import { PRE_BATTLE_STEPS } from '../data/pre-battle-steps'
import { copy } from '../lib/copy'

export function PreBattleChecklist({
  checks,
  onToggle,
  compact = false,
}: {
  checks: boolean[]
  onToggle: (index: number) => void
  compact?: boolean
}) {
  const done = checks.filter(Boolean).length
  const allDone = done === PRE_BATTLE_STEPS.length

  return (
    <section className={`app-panel ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-xs tracking-wide text-accent">{copy.preBattle.title}</h2>
        <span className="text-[10px] tabular-nums text-muted">
          {done}/{PRE_BATTLE_STEPS.length}
        </span>
      </div>
      {!allDone && (
        <p className="mb-2 text-[10px] leading-relaxed text-muted">{copy.preBattle.hint}</p>
      )}
      <ul className="space-y-2">
        {PRE_BATTLE_STEPS.map((step, i) => (
          <li key={step.id}>
            <label className="flex cursor-pointer items-start gap-2 touch-manipulation">
              <input
                type="checkbox"
                checked={checks[i] ?? false}
                onChange={() => onToggle(i)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span className="min-w-0">
                <span className="text-[10px] font-medium text-bone">
                  {step.step}. {step.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted">{step.body}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
