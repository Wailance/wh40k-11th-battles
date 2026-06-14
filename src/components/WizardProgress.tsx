import { copy } from '../lib/copy'

export function WizardProgress({
  step,
  total,
  labels,
  onStepClick,
}: {
  step: number
  total: number
  labels: string[]
  onStepClick?: (index: number) => void
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-caption">
        <span className="font-medium uppercase tracking-wide text-muted">
          {copy.wizard.stepOf(step, total)}
        </span>
        <span className="font-display text-accent">{labels[step]}</span>
      </div>
      <div className="flex gap-1.5" role="list" aria-label={copy.wizard.progressLabel}>
        {Array.from({ length: total }, (_, i) => {
          const done = i < step
          const current = i === step
          const clickable = Boolean(onStepClick && done)
          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              title={labels[i]}
              aria-label={copy.wizard.stepLabel(labels[i], i + 1)}
              aria-current={current ? 'step' : undefined}
              className={`rounded-full transition-all duration-300 ease-out ${
                i === step ? 'h-1.5' : 'h-1'
              } ${
                i < step ? 'bg-crimson-bright' : i === step ? 'bg-accent/50' : 'bg-border'
              } ${clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            />
          )
        })}
      </div>
    </div>
  )
}
