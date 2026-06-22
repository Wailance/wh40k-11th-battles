import { NavLink } from 'react-router-dom'
import { copy } from '../lib/copy'
import { loadActiveGame } from '../lib/storage'

function navLinks() {
  const active = loadActiveGame()?.status === 'active'
const links = [
    { to: '/', label: copy.nav.home, end: true },
    { to: '/mission-sequence', label: copy.nav.missionSequence, end: false },
    { to: '/history', label: copy.nav.history, end: false },
  ]
  if (active) {
    return [{ to: '/game', label: copy.nav.game, end: true }, ...links]
  }
  return links
}

function NavLabel({ label }: { label: string }) {
  if (label === 'Detachment Points') {
    return (
      <span className="text-center font-display text-micro uppercase leading-tight tracking-wide">
        <span className="block">Detachment</span>
        <span className="block opacity-80">Points</span>
      </span>
    )
  }
  if (label === 'Mission Sequence') {
    return (
      <span className="text-center font-display text-micro uppercase leading-tight tracking-wide">
        <span className="block">Mission</span>
        <span className="block opacity-80">Sequence</span>
      </span>
    )
  }
  if (label === 'Army Builder') {
    return (
      <span className="text-center font-display text-micro uppercase leading-tight tracking-wide">
        <span className="block">Army</span>
        <span className="block opacity-80">Builder</span>
      </span>
    )
  }
  return <span className="text-micro font-display uppercase tracking-wider">{label}</span>
}

export function BottomNav({ compact = false, hidden = false }: { compact?: boolean; hidden?: boolean }) {
  if (hidden) return null
  const links = navLinks()
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-void/90 backdrop-blur-xl">
      <div className={`mx-auto flex max-w-lg px-0.5 ${compact ? 'pb-0.5' : 'pb-1'}`}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 ${compact ? 'text-micro' : 'text-caption'} font-medium transition-colors ${
                compact ? 'min-h-[2.75rem]' : 'min-h-[3.25rem]'
              } ${isActive ? 'text-accent' : 'text-muted'} ${
                l.to === '/game' && !isActive ? 'text-crimson-bright' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="motion-nav-underline absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-crimson-bright/60 to-transparent" />
                )}
                <NavLabel label={l.label} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
