import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { copy } from '../lib/copy'
import { publicUrl } from '../lib/public-url'
import { loadActiveGame, loadHistory } from '../lib/storage'
import { getWinner } from '../lib/game-utils'

export function HomePage() {
  const navigate = useNavigate()
  const [confirmNew, setConfirmNew] = useState(false)
  const active = loadActiveGame()
  const history = loadHistory()
  const hasActive = active?.status === 'active'
  const p1Wins = history.filter((g) => getWinner(g) === 1).length
  const p2Wins = history.filter((g) => getWinner(g) === 2).length
  const draws = history.filter((g) => getWinner(g) === 0).length

  return (
    <div className="motion-stagger space-y-5">
      <Hero />

      <div>
        {hasActive ? (
          <button
            type="button"
            onClick={() => setConfirmNew(true)}
            className="app-btn w-full"
          >
            {copy.home.cta}
          </button>
        ) : (
          <Link to="/new" className="app-btn w-full">
            {copy.home.cta}
          </Link>
        )}
      </div>

      <ArmyBuilderCta to="/lists/new" />

      <TournamentListsCta to="/lists/meta" />

      <ConfirmDialog
        open={confirmNew}
        title={copy.home.newGameWhileActive}
        body={copy.home.newGameWhileActiveBody}
        confirmLabel={copy.home.newGameWhileActiveConfirm}
        danger
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false)
          navigate('/new')
        }}
      />

      {history.length > 0 && (
        <section className="app-panel p-4">
          <h2 className="mb-1 font-display text-caption tracking-wide text-accent-dim">{copy.home.statsTitle}</h2>
          <p className="mb-3 text-micro text-muted">Wins by seat (Seat 1 / Seat 2 at the table)</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label={copy.home.statGames} value={history.length} />
            <Stat label={copy.home.statWins} value={p1Wins} color="var(--color-p1)" />
            <Stat label={copy.home.statLosses} value={p2Wins} color="var(--color-p2)" />
            <Stat label={copy.home.statDraws} value={draws} />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3">
        <FeatureCard
          to="/mission-sequence"
          title={copy.missionSequence.title}
          desc={copy.missionSequence.subtitle}
          glyph="MS"
        />
        <FeatureCard
          to="/in-dev"
          title={copy.inDev.title}
          desc={copy.inDev.homeDesc}
          glyph="ID"
          muted
        />
      </section>

      <p className="text-center text-caption leading-relaxed text-muted">
        {copy.home.credit}
        <br />
        <span className="text-muted">{copy.home.photoCredit}</span>
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
      <p className="font-display text-stat tabular-nums" style={{ color: color ?? 'var(--color-accent)' }}>
        {value}
      </p>
      <p className="text-micro uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function ArmyBuilderCta({ to }: { to: string }) {
  return (
    <Link to={to} className="home-builder-cta motion-card">
      <span className="home-builder-cta-icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M4 7.5h16M4 12h10M4 16.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M15.5 14.5 20 10l-2-2-4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <span className="home-builder-cta-body">
        <span className="home-builder-cta-kicker">{copy.home.armyListsKicker}</span>
        <span className="home-builder-cta-title-row">
          <span className="home-builder-cta-title">{copy.home.armyListsTitle}</span>
        </span>
        <span className="home-builder-cta-desc">{copy.home.armyListsDesc}</span>
      </span>
      <span className="home-builder-cta-chevron" aria-hidden />
    </Link>
  )
}

function TournamentListsCta({ to }: { to: string }) {
  return (
    <Link to={to} className="home-meta-cta motion-card">
      <span className="home-meta-cta-icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M8 4h8l1 3h3v2h-1.2c-.5 4.2-2.8 7.4-6.8 9.1L12 20l-2-1.9C6 16.4 3.7 13.2 3.2 9H2V7h3l1-3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9.5 10h5M9.5 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="home-meta-cta-body">
        <span className="home-meta-cta-kicker">{copy.home.tournamentListsKicker}</span>
        <span className="home-meta-cta-title">{copy.home.tournamentListsTitle}</span>
        <span className="home-meta-cta-desc">{copy.home.tournamentListsDesc}</span>
      </span>
      <span className="home-meta-cta-chevron" aria-hidden />
    </Link>
  )
}

function FeatureCard({
  to,
  title,
  desc,
  glyph,
  badge,
  muted,
}: {
  to: string
  title: string
  desc: string
  glyph: string
  badge?: string
  muted?: boolean
}) {
  return (
    <Link
      to={to}
      className={
        muted
          ? 'app-panel-muted motion-card flex min-h-[3.25rem] items-center gap-2.5 p-3 text-left'
          : 'app-panel motion-card flex min-h-[4.5rem] items-center gap-3 p-4 text-left'
      }
    >
      <div
        className={
          muted
            ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-faint bg-white/[0.03] font-display text-micro tracking-wider text-muted'
            : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-crimson/25 bg-crimson-soft font-display text-body tracking-wider text-crimson-bright'
        }
      >
        {glyph}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={
              muted
                ? 'truncate font-display text-caption tracking-wide text-accent-dim'
                : 'truncate font-display text-body tracking-wide text-accent'
            }
          >
            {title}
          </span>
          {badge && (
            <span className="rounded border border-faint px-1.5 py-0.5 text-micro uppercase tracking-wide text-muted/80">
              {badge}
            </span>
          )}
        </p>
        <p
          className={
            muted
              ? 'mt-0.5 line-clamp-2 text-caption leading-snug text-muted/75'
              : 'mt-0.5 line-clamp-2 text-caption leading-snug text-muted'
          }
        >
          {desc}
        </p>
      </div>
    </Link>
  )
}
