import { useState } from 'react'
import { hasMissionDetail } from '../lib/mission-details'
import { MissionDetailSheet } from './MissionDetailSheet'

export function MissionNameButton({
  name,
  className = '',
  showIcon = true,
}: {
  name: string
  className?: string
  showIcon?: boolean
}) {
  const [open, setOpen] = useState(false)
  const canView = hasMissionDetail(name)

  if (!canView) {
    return <span className={className}>{name}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group inline-flex max-w-full items-center gap-1 text-left underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent/60 ${className}`}
        title="View mission details"
      >
        <span className="truncate">{name}</span>
        {showIcon && (
          <span className="shrink-0 text-[10px] text-accent-dim opacity-70 group-hover:opacity-100" aria-hidden>
            ⓘ
          </span>
        )}
      </button>
      <MissionDetailSheet name={name} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
