import type { ReactNode } from 'react'

export function AppSegment({
  children,
  compact = false,
  gold = false,
  className = '',
  role,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  compact?: boolean
  gold?: boolean
  className?: string
  role?: string
  'aria-label'?: string
}) {
  const classes = [
    'app-segment',
    compact ? 'app-segment-compact' : '',
    gold ? 'app-segment-gold' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role={role} aria-label={ariaLabel}>
      {children}
    </div>
  )
}

export function AppSegmentButton({
  active,
  disabled,
  onClick,
  children,
  tabId,
  controlsId,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  tabId?: string
  controlsId?: string
}) {
  return (
    <button
      type="button"
      role={tabId ? 'tab' : undefined}
      id={tabId}
      aria-selected={tabId ? active : undefined}
      aria-controls={controlsId}
      data-active={active || undefined}
      disabled={disabled}
      className="app-segment-btn"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
