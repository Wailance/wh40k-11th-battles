import { useEffect, useState } from 'react'
import { battlePointsFromVp, teamMatchResult } from '../lib/teams-scoring'
import { copy } from '../lib/copy'
import {
  clearActiveTeamRound,
  deleteTeamRoundFromHistory,
  loadActiveTeamRound,
  loadTeamRoundHistory,
  saveActiveTeamRound,
  saveTeamRoundToHistory,
  sumTeamBp,
  type ActiveTeamRound,
  type SavedTeamRound,
  type TeamSize,
} from '../lib/teams-storage'
import { ConfirmDialog } from '../components/ConfirmDialog'

const TEAM_SIZES = [3, 4, 5, 6, 7, 8] as const

export function TeamsBpPage() {
  const [round, setRound] = useState<ActiveTeamRound>(() => loadActiveTeamRound())
  const [history, setHistory] = useState<SavedTeamRound[]>(() => loadTeamRoundHistory())
  const [p1Vp, setP1Vp] = useState('')
  const [p2Vp, setP2Vp] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    saveActiveTeamRound(round)
  }, [round])

  const v1 = Number(p1Vp) || 0
  const v2 = Number(p2Vp) || 0
  const bp1 = battlePointsFromVp(v1, v2)
  const bp2 = battlePointsFromVp(v2, v1)

  const { teamABp: runningA, teamBBp: runningB } = sumTeamBp(round.games)
  const match = teamMatchResult(runningA, runningB, round.teamSize)

  const updateRound = (patch: Partial<ActiveTeamRound>) => setRound((r) => ({ ...r, ...patch }))

  const addGame = () => {
    if (v1 === 0 && v2 === 0) return
    updateRound({ games: [...round.games, { p1: v1, p2: v2 }] })
    setP1Vp('')
    setP2Vp('')
  }

  const saveRound = () => {
    if (round.games.length === 0) return
    saveTeamRoundToHistory(round)
    setHistory(loadTeamRoundHistory())
    setRound(clearActiveTeamRound())
  }

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{copy.teams.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.teams.subtitle}</p>
        <p className="mt-2 text-[11px] text-muted">{copy.teams.activeRoundHint}</p>
      </div>

      <section className="app-panel grid grid-cols-2 gap-3 p-4">
        <label className="block text-xs text-muted">
          {copy.teams.teamAName}
          <input
            value={round.teamAName}
            onChange={(e) => updateRound({ teamAName: e.target.value })}
            className="app-input mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-muted">
          {copy.teams.teamBName}
          <input
            value={round.teamBName}
            onChange={(e) => updateRound({ teamBName: e.target.value })}
            className="app-input mt-1 w-full"
          />
        </label>
      </section>

      <section className="app-panel space-y-3 p-4">
        <h2 className="text-sm font-semibold text-bone">{copy.teams.singleGame}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            {copy.teams.player1Vp}
            <input
              type="number"
              min={0}
              value={p1Vp}
              onChange={(e) => setP1Vp(e.target.value)}
              className="app-input mt-1 w-full"
            />
          </label>
          <label className="block text-xs text-muted">
            {copy.teams.player2Vp}
            <input
              type="number"
              min={0}
              value={p2Vp}
              onChange={(e) => setP2Vp(e.target.value)}
              className="app-input mt-1 w-full"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-[10px] text-muted">{round.teamAName} BP</p>
            <p className="font-display text-xl tabular-nums text-accent">{bp1}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-[10px] text-muted">{round.teamBName} BP</p>
            <p className="font-display text-xl tabular-nums text-accent">{bp2}</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-muted">{copy.teams.bpSum(bp1 + bp2)}</p>
        <button type="button" onClick={addGame} className="app-btn w-full py-2 text-sm">
          {copy.teams.addToRound}
        </button>
      </section>

      {round.games.length > 0 && (
        <section className="app-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-bone">{copy.teams.roundTotal}</h2>
            <select
              value={round.teamSize}
              onChange={(e) => updateRound({ teamSize: Number(e.target.value) as TeamSize })}
              className="app-input text-xs"
            >
              {TEAM_SIZES.map((n) => (
                <option key={n} value={n}>
                  {copy.teams.teamSize(n)}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-1 text-xs text-muted">
            {round.games.map((g, i) => (
              <li key={i} className="flex justify-between tabular-nums">
                <span>
                  Game {i + 1}: {g.p1}–{g.p2} VP
                </span>
                <span>
                  {battlePointsFromVp(g.p1, g.p2)}–{battlePointsFromVp(g.p2, g.p1)} BP
                </span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-2">
              <p className="text-[10px] text-muted">{round.teamAName} total</p>
              <p className="font-display text-lg tabular-nums">{runningA} BP</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-2">
              <p className="text-[10px] text-muted">{round.teamBName} total</p>
              <p className="font-display text-lg tabular-nums">{runningB} BP</p>
            </div>
          </div>
          <p className="text-center text-sm text-bone">
            {match.winner === 'draw'
              ? copy.teams.matchDraw(match.teamAP)
              : match.winner === 'A'
                ? copy.teams.matchWin(round.teamAName, match.teamAP, match.teamBP)
                : copy.teams.matchWin(round.teamBName, match.teamBP, match.teamAP)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={saveRound} className="app-btn py-2 text-xs">
              {copy.teams.saveRound}
            </button>
            <button
              type="button"
              onClick={() => setRound(clearActiveTeamRound())}
              className="app-btn-ghost py-2 text-xs"
            >
              {copy.teams.clearRound}
            </button>
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="app-panel space-y-3 p-4">
          <h2 className="text-sm font-semibold text-bone">{copy.teams.savedRounds}</h2>
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-panel p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-bone">
                      {item.teamAName} vs {item.teamBName}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {item.games.length} games · {item.teamABp}–{item.teamBBp} BP ·{' '}
                      {item.winner === 'draw'
                        ? `Draw ${item.teamAP}–${item.teamBP} TP`
                        : `${item.winner === 'A' ? item.teamAName : item.teamBName} ${item.teamAP}–${item.teamBP} TP`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">{copy.teams.savedAt(item.savedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteId(item.id)}
                    className="shrink-0 text-[10px] text-warning"
                  >
                    {copy.teams.deleteRound}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={copy.teams.deleteRound}
        body={copy.teams.deleteRoundConfirm}
        confirmLabel={copy.teams.deleteRound}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteTeamRoundFromHistory(deleteId)
          setHistory(loadTeamRoundHistory())
          setDeleteId(null)
        }}
      />
    </div>
  )
}
