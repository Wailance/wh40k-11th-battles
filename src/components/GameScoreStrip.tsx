import type { CSSProperties } from 'react'
import { copy } from '../lib/copy'
import type { DoublesBattleMeta } from '../types/game'

export function GameScoreTotals({
  player1Vp,
  player2Vp,
  wtcPlayer1,
  wtcPlayer2,
}: {
  player1Vp: number
  player2Vp: number
  wtcPlayer1: number
  wtcPlayer2: number
}) {
  return (
    <div className="game-score-totals">
      <p className="game-score-totals-vp game-score-totals-vp--p1 font-display tabular-nums">
        {player1Vp}
      </p>
      <div className="game-score-totals-center text-center">
        <p className="game-score-wtc font-display tabular-nums text-bone">
          {wtcPlayer1}–{wtcPlayer2}
        </p>
        <p className="game-score-wtc-label">{copy.game.wtcScore}</p>
      </div>
      <p className="game-score-totals-vp game-score-totals-vp--p2 font-display tabular-nums">
        {player2Vp}
      </p>
    </div>
  )
}

function PlayerSeat({
  side,
  label,
  meta,
  vp,
  color,
  active,
  selectable,
  onSelect,
}: {
  side: 'left' | 'right'
  label: string
  meta?: string
  vp: number
  color: string
  active: boolean
  selectable: boolean
  onSelect?: () => void
}) {
  const className = `game-score-seat game-score-seat-${side} ${active ? 'is-active' : ''} ${selectable ? 'is-selectable' : ''}`

  const content = (
    <>
      <p className="game-score-name truncate" style={{ color }}>
        {label}
      </p>
      {meta && <p className="game-score-meta truncate">{meta}</p>}
      {selectable && (
        <p className={`game-score-seat-hint ${active ? 'is-active' : ''}`}>
          {active ? copy.game.scoreSeatScoring : copy.game.scoreSeatSwitch}
        </p>
      )}
    </>
  )

  const seatStyle = { '--player-seat-color': color } as CSSProperties

  if (!selectable || !onSelect) {
    return (
      <div className={className} style={seatStyle}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={className}
      style={seatStyle}
      aria-pressed={active}
      aria-label={
        active
          ? `${label} · active player · ${vp} VP`
          : `${label} · tap to switch scoring · ${vp} VP`
      }
      onClick={onSelect}
    >
      {content}
    </button>
  )
}

export function GamePlayerSeatBar({
  player1Label,
  player1Meta,
  player1Vp,
  player2Label,
  player2Meta,
  player2Vp,
  activePlayer,
  onSelectPlayer,
}: {
  player1Label: string
  player1Meta?: string
  player1Vp: number
  player2Label: string
  player2Meta?: string
  player2Vp: number
  activePlayer?: 1 | 2 | null
  onSelectPlayer?: (player: 1 | 2) => void
}) {
  const selectable = activePlayer != null && onSelectPlayer != null

  return (
    <div className={`game-player-seat-bar ${selectable ? 'is-selectable' : ''}`}>
      {selectable && (
        <p className="game-score-strip-hint">{copy.game.scoreStripHint}</p>
      )}
      <div className="game-player-seat-bar-row">
        <PlayerSeat
          side="left"
          label={player1Label}
          meta={player1Meta}
          vp={player1Vp}
          color="var(--color-p1)"
          active={activePlayer === 1}
          selectable={selectable}
          onSelect={onSelectPlayer ? () => onSelectPlayer(1) : undefined}
        />
        <PlayerSeat
          side="right"
          label={player2Label}
          meta={player2Meta}
          vp={player2Vp}
          color="var(--color-p2)"
          active={activePlayer === 2}
          selectable={selectable}
          onSelect={onSelectPlayer ? () => onSelectPlayer(2) : undefined}
        />
      </div>
    </div>
  )
}

export function doublesPlayerLabels(
  doubles: DoublesBattleMeta | undefined,
  player1Name: string,
  player2Name: string,
): {
  player1Label: string
  player1Meta?: string
  player2Label: string
  player2Meta?: string
} {
  if (!doubles) {
    return { player1Label: player1Name, player2Label: player2Name }
  }
  return {
    player1Label: doubles.team1Name,
    player1Meta: [player1Name, doubles.team1Player2].filter(Boolean).join(' · '),
    player2Label: doubles.team2Name,
    player2Meta: [player2Name, doubles.team2Player2].filter(Boolean).join(' · '),
  }
}
