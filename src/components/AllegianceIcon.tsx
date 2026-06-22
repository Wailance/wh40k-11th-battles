import type { CSSProperties } from 'react'
import type { Allegiance } from '../lib/army-allegiance'
import {
  ALLEGIANCE_ICON_COLORS,
  ALLEGIANCE_ICON_SRC,
  armyIconSrc,
} from '../lib/faction-icons'

function IconShell({
  src,
  color,
  className = 'h-9 w-9',
}: {
  src: string
  color: string
  className?: string
}) {
  const maskStyle = {
    color,
    '--allegiance-icon-color': color,
    '--faction-icon-url': `url("${src}")`,
  } as CSSProperties

  return (
    <span
      className={`allegiance-icon faction-icon-mask flex shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 ${className}`}
      style={maskStyle}
      role="img"
      aria-hidden
    />
  )
}

export function AllegianceIcon({ id, className }: { id: Allegiance; className?: string }) {
  return (
    <IconShell
      src={ALLEGIANCE_ICON_SRC[id]}
      color={ALLEGIANCE_ICON_COLORS[id]}
      className={className}
    />
  )
}

export function FactionIcon({
  army,
  allegiance,
  className,
}: {
  army: string
  allegiance?: Allegiance
  className?: string
}) {
  const color = allegiance ? ALLEGIANCE_ICON_COLORS[allegiance] : ALLEGIANCE_ICON_COLORS.imperium
  return (
    <IconShell src={armyIconSrc(army)} color={color} className={className} />
  )
}

export function allegianceIconColor(id: Allegiance): string {
  return ALLEGIANCE_ICON_COLORS[id]
}
