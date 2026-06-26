import type { CSSProperties } from 'react'
import { MissionNameButton } from './MissionNameButton'
import { copy } from '../lib/copy'
import { FD_COLORS, FD_SHORT } from '../lib/game-utils'
import { secondaryBriefBuckets, secondaryEndGameByRound } from '../lib/mission-scoring'
import type { GameState, PlayerScores, PlayerSetup } from '../types/game'

function PlayerSecondaryRecap({
  player,
  scores,
  battleRound,
  color,
}: {
  player: PlayerSetup
  scores: PlayerScores
  battleRound: number
  color: string
}) {
  const rounds = secondaryEndGameByRound(player, scores, battleRound)
  const { discarded } = secondaryBriefBuckets(player, scores)
  const fdTone = FD_COLORS[player.forceDisposition] ?? 'red'
  const modeLabel =
    player.secondaryMode === 'tactical' ? copy.newGame.secondaryTactical : copy.newGame.secondaryFixed

  const hasAnyActivity = rounds.some((r) => r.items.length > 0)

  return (
    <article
      className="game-end-recap-card"
      style={{ '--player-accent': color } as CSSProperties}
    >
      <header className="game-end-recap-head">
        <div className="game-end-recap-head-row">
          <p className="game-end-recap-player truncate">{player.name}</p>
          <span className={`game-mission-brief-fd game-mission-brief-fd--${fdTone}`}>
            {FD_SHORT[player.forceDisposition]}
          </span>
        </div>
        <p className="game-end-recap-meta">
          {modeLabel} · {copy.game.secondaryScoring}{' '}
          <span className="tabular-nums text-bone">{scores.secondaryVp}</span> VP
        </p>
      </header>

      <div className="game-end-recap-rounds">
        {rounds.map(({ round, items }) => (
          <div key={round} className="game-end-recap-round-block">
            <span className="game-end-recap-round-badge tabular-nums">R{round}</span>
            <div className="game-end-recap-round-body">
              {items.length === 0 ? (
                <span className="game-end-recap-round-empty">{copy.game.endGameSecondaryRoundEmpty}</span>
              ) : (
                <ul className="game-end-recap-round-list">
                  {items.map(({ card, vp }) => (
                    <li
                      key={card}
                      className={`game-end-recap-round-row${vp === null ? ' game-end-recap-round-row--pending' : ''}`}
                    >
                      <MissionNameButton
                        name={card}
                        className="game-end-recap-card-name"
                        showIcon={false}
                      />
                      {vp === null ? (
                        <span className="game-end-recap-round-pending">{copy.game.endGameSecondaryUncompleted}</span>
                      ) : (
                        <span className="game-end-recap-round-vp tabular-nums">+{vp}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {!hasAnyActivity && (
          <p className="game-end-recap-empty">{copy.game.endGameSecondaryEmpty}</p>
        )}
      </div>

      {discarded.length > 0 && (
        <footer className="game-end-recap-discarded">
          <p className="game-end-recap-foot-label">{copy.game.missionBriefDiscarded}</p>
          <div className="game-mission-brief-foot-chips">
            {discarded.map((card) => (
              <span key={card} className="game-mission-brief-foot-chip game-mission-brief-foot-chip--off">
                <MissionNameButton name={card} className="game-mission-brief-chip-label" showIcon={false} />
              </span>
            ))}
          </div>
        </footer>
      )}
    </article>
  )
}

export function GameEndSecondaryRecap({ game }: { game: GameState }) {
  return (
    <section className="game-end-recap">
      <h3 className="game-end-recap-title">{copy.game.endGameSecondaryTitle}</h3>
      <div className="game-end-recap-grid">
        <PlayerSecondaryRecap
          player={game.player1}
          scores={game.scores.player1}
          battleRound={game.battleRound}
          color="var(--color-p1)"
        />
        <PlayerSecondaryRecap
          player={game.player2}
          scores={game.scores.player2}
          battleRound={game.battleRound}
          color="var(--color-p2)"
        />
      </div>
    </section>
  )
}
