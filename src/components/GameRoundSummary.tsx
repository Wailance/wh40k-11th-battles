import { MissionNameButton } from './MissionNameButton'
import { copy } from '../lib/copy'
import {
  DEFAULT_CAPS,
  getMissionScoreOptions,
  getTallyCount,
  roundCombinedVp,
  secondaryScoreKey,
} from '../lib/mission-scoring'
import { battleReadyBonus } from '../lib/game-utils'
import type { GameState, PlayerSetup } from '../types/game'

function playerRoundLines(
  player: PlayerSetup,
  scores: GameState['scores']['player1'],
  round: number,
  color: string,
) {
  const primaryOpts = getMissionScoreOptions(player.primaryMission)
  const primaryLines = primaryOpts
    .map((o) => ({
      label: o.label,
      vp: getTallyCount(scores.primaryScoreTally, o.id, round) * o.vp,
    }))
    .filter((l) => l.vp > 0)

  const secondaryLines: { card: string; label: string; vp: number }[] = []
  const cards = new Set<string>()
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    cards.add(card)
  }
  if (player.secondaryMode === 'tactical') {
    for (const c of scores.tacticalHand) cards.add(c)
  } else {
    for (const c of player.secondaries) cards.add(c)
  }

  for (const card of cards) {
    const opts = getMissionScoreOptions(card, player.secondaryMode)
    for (const o of opts) {
      const count = getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, o.id), round)
      if (count > 0) {
        secondaryLines.push({ card, label: o.label, vp: count * o.vp })
      }
    }
  }

  const roundPrimary = scores.primaryRoundVp[round - 1] ?? 0
  const roundSecondary = scores.secondaryRoundVp[round - 1] ?? 0

  return (
    <div className="app-panel app-compact-panel p-3" data-allow-select>
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-subtle pb-1">
        <p className="truncate text-caption font-semibold" style={{ color }}>
          {player.name}
        </p>
        <p className="shrink-0 text-micro tabular-nums text-muted">
          {roundPrimary + roundSecondary} VP
        </p>
      </div>
      <p className="mb-2 truncate text-micro text-muted">
        P {roundPrimary} · S {roundSecondary}
      </p>
      {primaryLines.length > 0 && (
        <div className="mb-2">
          <p className="app-dash-label mb-1">{copy.game.primaryScoring}</p>
          {primaryLines.map((l) => (
            <div key={l.label} className="flex justify-between gap-2 text-micro text-muted">
              <span className="min-w-0 truncate">{l.label}</span>
              <span className="tabular-nums text-bone">+{l.vp}</span>
            </div>
          ))}
        </div>
      )}
      {secondaryLines.length > 0 && (
        <div>
          <p className="app-dash-label mb-1">{copy.game.secondaryScoring}</p>
          {secondaryLines.map((l) => (
            <div
              key={`${l.card}-${l.label}`}
              className="flex justify-between gap-2 text-micro text-muted"
            >
              <span className="min-w-0 truncate">
                <MissionNameButton name={l.card} className="text-micro" showIcon={false} />
                {' · '}
                {l.label}
              </span>
              <span className="tabular-nums text-bone">+{l.vp}</span>
            </div>
          ))}
        </div>
      )}
      {primaryLines.length === 0 && secondaryLines.length === 0 && (
        <p className="text-micro text-muted">{copy.game.roundEmpty}</p>
      )}
    </div>
  )
}

export function GameRoundSummary({
  game,
  round,
  showTotal = false,
}: {
  game: GameState
  round: number
  showTotal?: boolean
}) {
  const p1Round = roundCombinedVp(game.scores.player1, round)
  const p2Round = roundCombinedVp(game.scores.player2, round)

  return (
    <div className="space-y-2">
      <div className="game-round-banner">
        {copy.game.roundSummaryTitle(round)} · {game.player1.name}: {p1Round} · {game.player2.name}:{' '}
        {p2Round} VP
      </div>
      {playerRoundLines(game.player1, game.scores.player1, round, 'var(--color-p1)')}
      {playerRoundLines(game.player2, game.scores.player2, round, 'var(--color-p2)')}

      {showTotal && <GameTotalSummary game={game} />}
    </div>
  )
}

export function GameTotalSummary({ game }: { game: GameState }) {
  const br1 = battleReadyBonus(game.player1.battleReady)
  const br2 = battleReadyBonus(game.player2.battleReady)

  return (
    <section className="app-panel space-y-3 p-4">
      <h2 className="font-display text-body tracking-wide text-accent">{copy.game.totalSummaryTitle}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-micro">
          <thead>
            <tr className="border-b border-white/10 text-muted">
              <th className="pb-2 pr-2 font-medium">Round</th>
              <th className="pb-2 pr-2 font-medium" style={{ color: 'var(--color-p1)' }}>
                {game.player1.name}
              </th>
              <th className="pb-2 font-medium" style={{ color: 'var(--color-p2)' }}>
                {game.player2.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((r) => (
              <tr key={r} className="border-b border-white/[0.04]">
                <td className="py-1.5 pr-2 tabular-nums text-muted">R{r}</td>
                <td className="py-1.5 pr-2 tabular-nums">{roundCombinedVp(game.scores.player1, r)}</td>
                <td className="py-1.5 tabular-nums">{roundCombinedVp(game.scores.player2, r)}</td>
              </tr>
            ))}
            <tr className="border-b border-white/[0.04] text-muted">
              <td className="py-1.5 pr-2">Primary</td>
              <td className="py-1.5 pr-2 tabular-nums">{game.scores.player1.primaryVp}</td>
              <td className="py-1.5 tabular-nums">{game.scores.player2.primaryVp}</td>
            </tr>
            <tr className="border-b border-white/[0.04] text-muted">
              <td className="py-1.5 pr-2">Secondary</td>
              <td className="py-1.5 pr-2 tabular-nums">{game.scores.player1.secondaryVp}</td>
              <td className="py-1.5 tabular-nums">{game.scores.player2.secondaryVp}</td>
            </tr>
            {(br1 > 0 || br2 > 0) && (
              <tr className="border-b border-white/[0.04] text-muted">
                <td className="py-1.5 pr-2">Battle Ready</td>
                <td className="py-1.5 pr-2 tabular-nums">{br1 ? `+${br1}` : '—'}</td>
                <td className="py-1.5 tabular-nums">{br2 ? `+${br2}` : '—'}</td>
              </tr>
            )}
            <tr className="font-semibold text-bone">
              <td className="pt-2 pr-2">Total</td>
              <td className="pt-2 pr-2 tabular-nums" style={{ color: 'var(--color-p1)' }}>
                {game.scores.player1.vp}
              </td>
              <td className="pt-2 tabular-nums" style={{ color: 'var(--color-p2)' }}>
                {game.scores.player2.vp}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-micro text-muted">
        Caps: Primary {DEFAULT_CAPS.primaryMaxGame} · Secondary {DEFAULT_CAPS.tacticalSecondaryMaxGame} ·
        Battle Ready +{DEFAULT_CAPS.battleReadyVp}
      </p>
    </section>
  )
}
