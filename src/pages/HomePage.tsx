import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { publicUrl } from '../lib/public-url'
import { loadActiveGame, loadHistory } from '../lib/storage'
import { getWinner } from '../lib/game-utils'
import { calculateWtcScores } from '../lib/wtc-scoring'

export function HomePage() {
  const active = loadActiveGame()
  const history = loadHistory()
  const hasActive = active?.status === 'active'
  const p1Wins = history.filter((g) => getWinner(g) === 1).length
  const p2Wins = history.filter((g) => getWinner(g) === 2).length
  const draws = history.filter((g) => getWinner(g) === 0).length
  const activeWtc =
    hasActive && active
      ? calculateWtcScores(active.scores.player1.vp, active.scores.player2.vp)
      : null

  return (
    <div className="space-y-5">
      <Hero />

      <div className="space-y-3">
        {hasActive && activeWtc && active && (
          <Link
            to="/game"
            className="app-btn flex w-full min-h-[4.5rem] flex-col items-stretch justify-center gap-1 py-4 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/80">
              {copy.home.activeGame}
            </span>
            <span className="truncate font-display text-base tracking-wide">
              {active.player1.name} vs {active.player2.name}
            </span>
            <span className="text-sm font-normal text-white/75">
              R{active.battleRound} · {active.scores.player1.vp}–{active.scores.player2.vp} VP · WTC{' '}
              {activeWtc.player1}–{activeWtc.player2}
            </span>
          </Link>
        )}

        <Link
          to="/new"
          className={hasActive ? 'app-btn-ghost flex w-full py-3.5 text-sm' : 'app-btn flex w-full py-3.5 text-sm'}
        >
          {copy.home.cta}
        </Link>
      </div>

      {history.length > 0 && (
        <section className="app-panel p-4">
          <h2 className="mb-1 font-display text-xs tracking-wide text-accent-dim">{copy.home.statsTitle}</h2>
          <p className="mb-3 text-[10px] text-muted">Wins by seat (Player 1 / Player 2)</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label={copy.home.statGames} value={history.length} />
            <Stat label={copy.home.statWins} value={p1Wins} color="var(--color-p1)" />
            <Stat label={copy.home.statLosses} value={p2Wins} color="var(--color-p2)" />
            <Stat label={copy.home.statDraws} value={draws} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xs tracking-wide text-accent-dim">{copy.formats.sectionTitle}</h2>
          <p className="mt-1 text-[11px] text-muted">{copy.formats.sectionHint}</p>
        </div>

        <Link
          to="/teams"
          className="app-btn flex w-full min-h-[4.5rem] flex-col items-stretch justify-center gap-1 py-4 text-left"
        >
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/80">
            {copy.formats.teams.badge}
          </span>
          <span className="font-display text-base tracking-wide">{copy.formats.teams.title}</span>
          <span className="text-sm font-normal text-white/75">{copy.formats.teams.subtitle}</span>
        </Link>

        <Link
          to="/formats/dominatus"
          className="app-btn-ghost flex w-full min-h-[4rem] flex-col items-stretch justify-center gap-1 py-3.5 text-left"
        >
          <span className="font-display text-sm tracking-wide text-bone">{copy.formats.dominatus.title}</span>
          <span className="text-xs text-muted">{copy.formats.dominatus.subtitle}</span>
        </Link>

        <Link
          to="/formats/doubles"
          className="app-btn-ghost flex w-full min-h-[4rem] flex-col items-stretch justify-center gap-1 py-3.5 text-left"
        >
          <span className="font-display text-sm tracking-wide text-bone">{copy.formats.doubles.title}</span>
          <span className="text-xs text-muted">{copy.formats.doubles.subtitle}</span>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <FeatureCard
          to="/mission-sequence"
          title={copy.missionSequence.title}
          desc={copy.missionSequence.subtitle}
          glyph="MS"
        />
      </section>

      <p className="text-center text-xs text-muted">
        <Link to="/lists" className="text-accent underline-offset-2 hover:underline">
          {copy.home.armyListsCta}
        </Link>
        {' · '}
        <span className="text-muted/70">{copy.home.armyListsBadge}</span>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-muted/80">
        {copy.home.credit}
        <br />
        <span className="text-muted/70">{copy.home.photoCredit}</span>
      </p>
    </div>
  )
}

function Hero() {
  const [photoOk, setPhotoOk] = useState(true)

  return (
    <div className="dw-hero">
      {photoOk && (
        <img
          src={publicUrl('/deathwatch/team-deathwatch.jpg')}
          alt=""
          className="dw-hero-photo"
          onError={() => setPhotoOk(false)}
        />
      )}
      <h1 className="dw-hero-title">
        40k <span className="dw-hero-accent">XI</span> Battles
      </h1>
      <p className="dw-hero-sub">{copy.home.tagline}</p>
      <span className="dw-hero-tag">{copy.home.subtitle}</span>
      <p className="dw-hero-credit">{copy.home.creditBy}</p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="font-display text-2xl tabular-nums" style={{ color: color ?? 'var(--color-accent)' }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function FeatureCard({
  to,
  title,
  desc,
  glyph,
}: {
  to: string
  title: string
  desc: string
  glyph: string
}) {
  return (
    <Link
      to={to}
      className="app-panel flex min-h-[4.5rem] items-center gap-3 p-4 transition-colors active:bg-panel-hover"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-crimson/25 bg-crimson-soft font-display text-sm tracking-wider text-crimson-bright">
        {glyph}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-sm tracking-wide text-accent">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{desc}</p>
      </div>
    </Link>
  )
}
