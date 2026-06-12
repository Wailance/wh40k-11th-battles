import { Link, useLocation } from 'react-router-dom'
import { copy } from '../lib/copy'
import { loadActiveGame } from '../lib/storage'

export function ActiveGameBanner() {
  const { pathname } = useLocation()
  const active = loadActiveGame()

  if (!active || active.status !== 'active' || pathname === '/game') return null

  return (
    <Link
      to="/game"
      className="mb-4 flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-crimson/30 bg-crimson-soft px-3 py-2.5 text-sm transition-colors hover:border-crimson/45"
    >
      <span className="shrink-0 font-display text-[10px] uppercase tracking-wider text-crimson-bright">
        {copy.nav.backToGame}
      </span>
      <span className="min-w-0 flex-1 truncate text-bone">
        {active.player1.name} vs {active.player2.name}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted">
        R{active.battleRound} · {active.scores.player1.vp}–{active.scores.player2.vp}
      </span>
    </Link>
  )
}
