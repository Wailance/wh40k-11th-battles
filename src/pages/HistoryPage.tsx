import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { copy } from '../lib/copy'
import { getWinner } from '../lib/game-utils'
import { calculateWtcScores } from '../lib/wtc-scoring'
import { deleteFromHistory, loadActiveGame, loadHistory } from '../lib/storage'

export function HistoryPage() {
  const [history, setHistory] = useState(() => loadHistory())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const active = loadActiveGame()

  const refresh = () => setHistory(loadHistory())

  const remove = (id: string) => {
    deleteFromHistory(id)
    refresh()
    setDeleteId(null)
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl text-muted">
          ◆
        </div>
        <h1 className="app-page-title">{copy.history.empty}</h1>
        <p className="max-w-xs text-sm text-muted">Finished games appear here with scores and missions.</p>
        <Link to="/new" className="app-btn rounded-xl px-6 py-3 text-sm">
          {copy.history.emptyCta}
        </Link>
      </div>
    )
  }

  const avgVp = history.reduce((s, g) => s + g.scores.player1.vp, 0) / history.length

  return (
    <div className="space-y-4">
      {active?.status === 'active' && (
        <Link
          to="/game"
          className="app-panel block border-crimson/20 bg-crimson-soft/30 p-3 text-sm text-accent"
        >
          {copy.home.resumeCta} — {active.player1.name} vs {active.player2.name} →
        </Link>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title={copy.history.delete}
        body={copy.history.deleteConfirm}
        confirmLabel={copy.history.delete}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
      />

      <div>
        <h1 className="app-page-title">{copy.history.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {history.length} games · average {avgVp.toFixed(0)} VP (Player 1)
        </p>
        <div className="app-divider mt-4" />
      </div>

      <div className="space-y-3">
        {history.map((g) => {
          const winner = getWinner(g)
          const wtc = calculateWtcScores(g.scores.player1.vp, g.scores.player2.vp)
          const date = new Date(g.createdAt).toLocaleDateString()
          return (
            <div key={g.id} className="app-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <span style={{ color: winner === 1 ? 'var(--color-p1)' : undefined }}>{g.player1.name}</span>
                    {' vs '}
                    <span style={{ color: winner === 2 ? 'var(--color-p2)' : undefined }}>{g.player2.name}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {g.player1.army} vs {g.player2.army}
                  </p>
                  <p className="mt-1 font-display text-lg tabular-nums text-accent">
                    {g.scores.player1.vp} – {g.scores.player2.vp} VP
                  </p>
                  {(g.player1.battleReady || g.player2.battleReady) && (
                    <p className="text-[11px] text-muted">
                      {g.player1.battleReady && `${g.player1.name} +10 BR`}
                      {g.player1.battleReady && g.player2.battleReady && ' · '}
                      {g.player2.battleReady && `${g.player2.name} +10 BR`}
                    </p>
                  )}
                  <p className="text-sm tabular-nums text-muted">
                    WTC {wtc.player1}–{wtc.player2}
                  </p>
                  <p className="text-xs text-muted">{date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(g.id)}
                  className="app-btn-ghost rounded-lg px-2 py-1 text-[11px]"
                >
                  {copy.history.delete}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted">
                <span>{g.player1.primaryMission}</span>
                <span>·</span>
                <span>{g.player2.primaryMission}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
