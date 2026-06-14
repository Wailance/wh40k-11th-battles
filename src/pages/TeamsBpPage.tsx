import { useEffect, useState } from 'react'
import { battlePointsFromVp, teamMatchResult } from '../lib/teams-scoring'
import { copy } from '../lib/copy'
import {
  addRoundToActiveMatch,
  clearActiveTeamMatch,
  clearActiveTeamRound,
  deleteTeamMatchFromHistory,
  deleteTeamRoundFromHistory,
  finishTeamMatch,
  loadActiveTeamMatch,
  loadActiveTeamRound,
  loadTeamMatchHistory,
  loadTeamRoundHistory,
  matchStanding,
  saveActiveTeamRound,
  sumTeamBp,
  type ActiveTeamMatch,
  type ActiveTeamRound,
  type SavedTeamMatch,
  type SavedTeamRound,
  type TeamSize,
} from '../lib/teams-storage'
import { ConfirmDialog } from '../components/ConfirmDialog'

const TEAM_SIZES = [3, 4, 5, 6, 7, 8] as const

export function TeamsBpPage() {
  const [round, setRound] = useState<ActiveTeamRound>(() => loadActiveTeamRound())
  const [match, setMatch] = useState<ActiveTeamMatch>(() => loadActiveTeamMatch())
  const [roundHistory, setRoundHistory] = useState<SavedTeamRound[]>(() => loadTeamRoundHistory())
  const [matchHistory, setMatchHistory] = useState<SavedTeamMatch[]>(() => loadTeamMatchHistory())
  const [p1Vp, setP1Vp] = useState('')
  const [p2Vp, setP2Vp] = useState('')
  const [deleteRoundId, setDeleteRoundId] = useState<string | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)

  useEffect(() => {
    saveActiveTeamRound(round)
  }, [round])

  const v1 = Number(p1Vp) || 0
  const v2 = Number(p2Vp) || 0
  const bp1 = battlePointsFromVp(v1, v2)
  const bp2 = battlePointsFromVp(v2, v1)

  const { teamABp: runningA, teamBBp: runningB } = sumTeamBp(round.games)
  const roundResult = teamMatchResult(runningA, runningB, round.teamSize)
  const standing = matchStanding(match)

  const updateRound = (patch: Partial<ActiveTeamRound>) => setRound((r) => ({ ...r, ...patch }))

  const addGame = () => {
    if (v1 === 0 && v2 === 0) return
    updateRound({ games: [...round.games, { p1: v1, p2: v2 }] })
    setP1Vp('')
    setP2Vp('')
  }

  const saveRoundToMatch = () => {
    if (round.games.length === 0) return
    const { match: next } = addRoundToActiveMatch(round)
    setMatch(next)
    setRoundHistory(loadTeamRoundHistory())
    setRound(clearActiveTeamRound())
  }

  const completeMatch = () => {
    finishTeamMatch()
    setMatch(loadActiveTeamMatch())
    setMatchHistory(loadTeamMatchHistory())
    setConfirmFinish(false)
  }

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{copy.teams.title}</h1>
        <p className="mt-1 text-body text-muted">{copy.teams.subtitle}</p>
        <p className="mt-2 text-caption text-muted">{copy.teams.matchHint}</p>
      </div>

      <section className="app-panel space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body font-semibold text-bone">{copy.teams.matchTitle}</h2>
          {match.rounds.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmFinish(true)}
              className="app-btn-ghost px-2 py-1 text-micro"
            >
              {copy.teams.finishMatch}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-accent/30 bg-accent/10 p-3">
            <p className="text-micro text-muted">{match.teamAName || copy.teams.teamAName}</p>
            <p className="font-display text-stat tabular-nums">{match.teamATp}</p>
            <p className="text-micro text-muted">TP</p>
          </div>
          <div className="rounded-lg border border-accent/30 bg-accent/10 p-3">
            <p className="text-micro text-muted">{match.teamBName || copy.teams.teamBName}</p>
            <p className="font-display text-stat tabular-nums">{match.teamBTp}</p>
            <p className="text-micro text-muted">TP</p>
          </div>
        </div>
        <p className="text-center text-caption text-bone">
          {copy.teams.matchTp(match.teamATp, match.teamBTp)}
          {match.rounds.length > 0 &&
            (standing.leader === 'draw'
              ? ' · Tied'
              : ` · ${standing.leader === 'A' ? match.teamAName : match.teamBName} leads`)}
        </p>
        {match.rounds.length > 0 && (
          <ul className="space-y-1 border-t border-border pt-2 text-caption text-muted">
            {match.rounds.map((r, i) => (
              <li key={r.id} className="flex justify-between tabular-nums">
                <span>
                  {copy.teams.roundInMatch(match.rounds.length - i)}: {r.teamABp}–{r.teamBBp} BP
                </span>
                <span>
                  +{r.teamAP} / +{r.teamBP} TP
                </span>
              </li>
            ))}
          </ul>
        )}
        {match.rounds.length === 0 && (
          <p className="text-center text-caption text-muted">{copy.teams.activeRoundHint}</p>
        )}
        {match.rounds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearActiveTeamMatch()
              setMatch(loadActiveTeamMatch())
            }}
            className="app-btn-ghost w-full py-2 text-caption"
          >
            {copy.teams.clearMatch}
          </button>
        )}
      </section>

      <section className="app-panel grid grid-cols-2 gap-3 p-4">
        <label className="block text-caption text-muted">
          {copy.teams.teamAName}
          <input
            value={round.teamAName}
            onChange={(e) => updateRound({ teamAName: e.target.value })}
            className="app-input mt-1 w-full"
          />
        </label>
        <label className="block text-caption text-muted">
          {copy.teams.teamBName}
          <input
            value={round.teamBName}
            onChange={(e) => updateRound({ teamBName: e.target.value })}
            className="app-input mt-1 w-full"
          />
        </label>
      </section>

      <section className="app-panel space-y-3 p-4">
        <h2 className="text-body font-semibold text-bone">{copy.teams.singleGame}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-caption text-muted">
            {copy.teams.player1Vp}
            <input
              type="number"
              min={0}
              value={p1Vp}
              onChange={(e) => setP1Vp(e.target.value)}
              className="app-input mt-1 w-full"
            />
          </label>
          <label className="block text-caption text-muted">
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
        <div className="grid grid-cols-2 gap-2 text-center text-body">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-micro text-muted">{round.teamAName} BP</p>
            <p className="font-display text-display tabular-nums text-accent">{bp1}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <p className="text-micro text-muted">{round.teamBName} BP</p>
            <p className="font-display text-display tabular-nums text-accent">{bp2}</p>
          </div>
        </div>
        <p className="text-center text-micro text-muted">{copy.teams.bpSum(bp1 + bp2)}</p>
        <button type="button" onClick={addGame} className="app-btn w-full py-2 text-body">
          {copy.teams.addToRound}
        </button>
      </section>

      {round.games.length > 0 && (
        <section className="app-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-body font-semibold text-bone">{copy.teams.roundTotal}</h2>
            <select
              value={round.teamSize}
              onChange={(e) => updateRound({ teamSize: Number(e.target.value) as TeamSize })}
              className="app-input text-caption"
            >
              {TEAM_SIZES.map((n) => (
                <option key={n} value={n}>
                  {copy.teams.teamSize(n)}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-1 text-caption text-muted">
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
              <p className="text-micro text-muted">{round.teamAName} total</p>
              <p className="font-display text-lg tabular-nums">{runningA} BP</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-2">
              <p className="text-micro text-muted">{round.teamBName} total</p>
              <p className="font-display text-lg tabular-nums">{runningB} BP</p>
            </div>
          </div>
          <p className="text-center text-body text-bone">
            {roundResult.winner === 'draw'
              ? copy.teams.matchDraw(roundResult.teamAP)
              : roundResult.winner === 'A'
                ? copy.teams.matchWin(round.teamAName, roundResult.teamAP, roundResult.teamBP)
                : copy.teams.matchWin(round.teamBName, roundResult.teamBP, roundResult.teamAP)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={saveRoundToMatch} className="app-btn py-2 text-caption">
              {copy.teams.saveRound}
            </button>
            <button
              type="button"
              onClick={() => setRound(clearActiveTeamRound())}
              className="app-btn-ghost py-2 text-caption"
            >
              {copy.teams.clearRound}
            </button>
          </div>
        </section>
      )}

      {matchHistory.length > 0 && (
        <section className="app-panel space-y-3 p-4">
          <h2 className="text-body font-semibold text-bone">{copy.teams.savedMatches}</h2>
          <ul className="space-y-2">
            {matchHistory.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-panel p-3 text-caption">
                <p className="font-medium text-bone">
                  {item.teamAName} vs {item.teamBName}
                </p>
                <p className="mt-0.5 text-muted">
                  {item.rounds.length} rounds · {item.teamATp}–{item.teamBTp} TP ·{' '}
                  {item.winner === 'draw'
                    ? 'Draw'
                    : `${item.winner === 'A' ? item.teamAName : item.teamBName} wins`}
                </p>
                <p className="mt-0.5 text-micro text-muted">{copy.teams.savedAt(item.savedAt)}</p>
                <button
                  type="button"
                  onClick={() => {
                    deleteTeamMatchFromHistory(item.id)
                    setMatchHistory(loadTeamMatchHistory())
                  }}
                  className="mt-2 text-micro text-warning"
                >
                  {copy.teams.deleteRound}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {roundHistory.length > 0 && (
        <section className="app-panel space-y-3 p-4">
          <h2 className="text-body font-semibold text-bone">{copy.teams.savedRounds}</h2>
          <ul className="space-y-2">
            {roundHistory.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-panel p-3 text-caption">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-bone">
                      {item.teamAName} vs {item.teamBName}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {item.games.length} games · {item.teamABp}–{item.teamBBp} BP
                    </p>
                    <p className="mt-0.5 text-micro text-muted">{copy.teams.savedAt(item.savedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteRoundId(item.id)}
                    className="shrink-0 text-micro text-warning"
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
        open={Boolean(deleteRoundId)}
        title={copy.teams.deleteRound}
        body={copy.teams.deleteRoundConfirm}
        confirmLabel={copy.teams.deleteRound}
        danger
        onCancel={() => setDeleteRoundId(null)}
        onConfirm={() => {
          if (deleteRoundId) deleteTeamRoundFromHistory(deleteRoundId)
          setRoundHistory(loadTeamRoundHistory())
          setDeleteRoundId(null)
        }}
      />

      <ConfirmDialog
        open={confirmFinish}
        title={copy.teams.finishMatch}
        body={copy.teams.finishMatchConfirm}
        confirmLabel={copy.teams.finishMatch}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={completeMatch}
      />
    </div>
  )
}
