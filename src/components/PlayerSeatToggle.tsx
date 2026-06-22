import type { CSSProperties } from 'react'

export function PlayerSeatToggle({
  label,
  hint,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string
  hint?: string
  options: { value: 1 | 2; label: string }[]
  value: 1 | 2
  onChange: (v: 1 | 2) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? 'mt-2' : ''}>
      <p className={`font-medium text-bone ${compact ? 'text-micro' : 'mb-1 text-body'}`}>{label}</p>
      {hint && <p className={`text-muted ${compact ? 'mt-0.5 text-micro leading-snug' : 'mb-2 text-caption'}`}>{hint}</p>}
      <div className={`flex gap-2 ${compact ? 'mt-1.5' : ''}`}>
        {options.map((o) => {
          const seatColor = o.value === 1 ? 'var(--color-p1)' : 'var(--color-p2)'
          const selected = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`player-seat-mode-btn flex-1 rounded-lg touch-manipulation ${
                compact ? 'py-2 text-micro font-medium' : 'py-3 text-body font-medium'
              } ${selected ? 'is-active' : ''}`}
              style={{ '--player-seat-color': seatColor } as CSSProperties}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
