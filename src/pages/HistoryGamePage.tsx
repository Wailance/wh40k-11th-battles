import { Link, useNavigate, useParams } from 'react-router-dom'
import { GameTotalSummary } from '../components/GameRoundSummary'
import { GameEndSecondaryRecap } from '../components/GameEndSecondaryRecap'
import { copy } from '../lib/copy'
import { getWinner } from '../lib/game-utils'
import { calculateWtcScores } from '../lib/wtc-scoring'
import { loadHistory } from '../lib/storage'

export function HistoryGamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const game = loadHistory().find((g) => g.id === id)

  if (!game) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">{copy.history.notFound}</p>
        <Link to="/history" className="app-btn-ghost mt-4 inline-block text-body">
          {copy.history.back}
        </Link>
      </div>
    )
  }

  const wtc = calculateWtcScores(game.scores.player1.vp, game.scores.player2.vp)
  const winner = getWinner(game)

  return (
    <div className="space-y-4 pb-2">
      <button type="button" onClick={() => navigate('/history')} className="app-btn-ghost text-caption">
        ← {copy.history.back}
      </button>

      <div>
        <h1 className="app-page-title">
          {game.player1.name} vs {game.player2.name}
        </h1>
        <p className="mt-1 text-body text-muted">
          {new Date(game.createdAt).toLocaleString()} ·{' '}
          {winner === 0
            ? copy.game.draw
            : copy.game.wins(winner === 1 ? game.player1.name : game.player2.name)}
        </p>
        <p className="mt-1 font-display text-display tabular-nums text-accent">
          {game.scores.player1.vp} – {game.scores.player2.vp} VP · WTC {wtc.player1}–{wtc.player2}
        </p>
      </div>

      <GameEndSecondaryRecap game={game} />
      <GameTotalSummary game={game} />
    </div>
  )
}
