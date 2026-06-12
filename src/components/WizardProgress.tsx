import { copy } from '../lib/copy'

export function WizardProgress({
  step,
  total,
  labels,
}: {
  step: number
  total: number
  labels: string[]
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-medium uppercase tracking-wide text-muted">
          {copy.wizard.stepOf(step, total)}
        </span>
        <span className="font-display text-accent">{labels[step]}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-crimson-bright' : i === step ? 'bg-accent/40' : 'bg-border'
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}
