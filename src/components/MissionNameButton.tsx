import { useState, type CSSProperties } from 'react'
import { hasMissionDetail } from '../lib/mission-details'
import { MissionDetailSheet } from './MissionDetailSheet'

export function MissionNameButton({
  name,
  className = '',
  showIcon = true,
  variant = 'link',
  accentColor,
}: {
  name: string
  className?: string
  showIcon?: boolean
  variant?: 'link' | 'pill'
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const canView = hasMissionDetail(name)
  const pillStyle = accentColor ? ({ '--mission-btn-color': accentColor } as CSSProperties) : undefined

  if (!canView) {
    if (variant === 'pill') {
      return (
        <span
          className={`app-mission-name-btn app-mission-name-btn--pill ${className}`}
          style={pillStyle}
        >
          <span className="truncate">{name}</span>
        </span>
      )
    }
    return <span className={className}>{name}</span>
  }

  const linkClass =
    'group inline-flex max-w-full items-center gap-1 text-left underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/60'
  const pillClass =
    'app-mission-name-btn app-mission-name-btn--pill group touch-manipulation'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${variant === 'pill' ? pillClass : linkClass} ${className}`}
        style={pillStyle}
        title="View mission details"
      >
        <span className="truncate">{name}</span>
        {showIcon && (
          <span
            className={`shrink-0 ${variant === 'pill' ? 'text-caption opacity-80 group-hover:opacity-100' : 'text-micro text-accent-dim opacity-70 group-hover:opacity-100'}`}
            aria-hidden
          >
            ⓘ
          </span>
        )}
      </button>
      <MissionDetailSheet name={name} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
