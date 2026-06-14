import type { ForceDisposition } from '../types/game'
import { FD_COLORS, FD_SHORT } from '../lib/game-utils'

const colorClass: Record<string, string> = {
  red: 'bg-fd-red/25 text-red-300/90 border-fd-red/50',
  green: 'bg-fd-green/25 text-green-300/80 border-fd-green/50',
  yellow: 'bg-fd-yellow/25 text-yellow-200/80 border-fd-yellow/50',
  teal: 'bg-fd-teal/25 text-teal-300/80 border-fd-teal/50',
  blue: 'bg-fd-blue/25 text-blue-300/80 border-fd-blue/50',
}

export function ForceDispositionBadge({
  fd,
  short = false,
  size = 'sm',
}: {
  fd: ForceDisposition
  short?: boolean
  size?: 'sm' | 'md'
}) {
  const c = colorClass[FD_COLORS[fd]] ?? 'bg-panel text-muted border-border'
  const pad = size === 'md' ? 'px-3 py-1 text-caption' : 'px-2 py-0.5 text-micro'
  return (
    <span
      className={`inline-block rounded-sm border font-semibold uppercase tracking-wide ${c} ${pad}`}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {short ? FD_SHORT[fd] : fd}
    </span>
  )
}
