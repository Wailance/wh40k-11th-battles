import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { copy } from '../lib/copy'
import { FD_COLORS, FD_ORDER, FD_SHORT, findMatchup, getPrimaryMission } from '../lib/game-utils'
import type { ForceDisposition } from '../types/game'

export function MatrixPage() {
  const [youFd, setYouFd] = useState<ForceDisposition>('DISRUPTION')
  const [oppFd, setOppFd] = useState<ForceDisposition>('PRIORITY ASSETS')
  const [viewMode, setViewMode] = useState<'picker' | 'grid'>('picker')

  const yourMission = getPrimaryMission(youFd, oppFd)
  const oppMission = getPrimaryMission(oppFd, youFd)
  const matchup = findMatchup(youFd, oppFd)

  const grid = useMemo(
    () =>
      FD_ORDER.map((rowFd) =>
        FD_ORDER.map((colFd) => ({
          you: rowFd,
          opp: colFd,
          mission: getPrimaryMission(rowFd, colFd),
          matchupId: findMatchup(rowFd, colFd)?.id ?? null,
        })),
      ),
    [],
  )

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <h1 className="app-page-title">{copy.reference.matrixTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.matrixSubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="app-filter-pill flex-1"
          data-active={viewMode === 'picker'}
          onClick={() => setViewMode('picker')}
        >
          {copy.reference.matrixPicker}
        </button>
        <button
          type="button"
          className="app-filter-pill flex-1"
          data-active={viewMode === 'grid'}
          onClick={() => setViewMode('grid')}
        >
          {copy.reference.matrixGrid}
        </button>
      </div>

      {viewMode === 'picker' ? (
        <>
          <FdPicker label={copy.reference.matrixYou} value={youFd} onChange={setYouFd} />
          <FdPicker label={copy.reference.matrixOpponent} value={oppFd} onChange={setOppFd} />

          <div className="ref-matrix-result app-panel p-4">
            {matchup && (
              <p className="mb-3 text-micro font-semibold uppercase tracking-widest text-accent">
                Layout #{matchup.id}
              </p>
            )}
            <div className="space-y-3">
              <ResultRow label={copy.reference.matrixYou} fd={youFd} mission={yourMission} />
              <ResultRow label={copy.reference.matrixOpponent} fd={oppFd} mission={oppMission} />
            </div>
            <Link to="/new" className="app-btn mt-4 w-full">
              {copy.home.cta}
            </Link>
          </div>
        </>
      ) : (
        <div className="ref-matrix-grid-wrap overflow-x-auto">
          <table className="ref-matrix-grid">
            <thead>
              <tr>
                <th className="ref-matrix-corner">{copy.reference.matrixYou}</th>
                {FD_ORDER.map((fd) => (
                  <th key={fd} className="ref-matrix-col-head">
                    <span className="text-micro">{FD_SHORT[fd]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, ri) => (
                <tr key={FD_ORDER[ri]}>
                  <th className="ref-matrix-row-head">
                    <span className="text-micro">{FD_SHORT[FD_ORDER[ri]]}</span>
                  </th>
                  {row.map((cell) => {
                    const active = cell.you === youFd && cell.opp === oppFd
                    return (
                      <td key={`${cell.you}-${cell.opp}`}>
                        <button
                          type="button"
                          className={`ref-matrix-cell${active ? ' is-active' : ''}`}
                          style={
                            {
                              '--fd-tone': `var(--color-fd-${FD_COLORS[cell.you] ?? 'red'})`,
                            } as CSSProperties
                          }
                          onClick={() => {
                            setYouFd(cell.you)
                            setOppFd(cell.opp)
                            setViewMode('picker')
                          }}
                          title={cell.mission}
                        >
                          <span className="ref-matrix-cell-mission">{cell.mission}</span>
                          {cell.matchupId && (
                            <span className="ref-matrix-cell-id">#{cell.matchupId}</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FdPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: ForceDisposition
  onChange: (fd: ForceDisposition) => void
}) {
  return (
    <div className="app-panel p-3">
      <p className="mb-2 text-micro font-semibold uppercase tracking-widest text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FD_ORDER.map((fd) => (
          <button
            key={fd}
            type="button"
            className={`min-h-[2.75rem] rounded-lg border p-2 touch-manipulation ${
              value === fd ? 'border-accent bg-crimson-soft/40' : 'border-faint bg-black/20'
            }`}
            onClick={() => onChange(fd)}
          >
            <ForceDispositionBadge fd={fd} short />
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultRow({
  label,
  fd,
  mission,
}: {
  label: string
  fd: ForceDisposition
  mission: string
}) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-micro text-muted">{label}</span>
        <ForceDispositionBadge fd={fd} short />
      </div>
      <MissionNameButton name={mission} className="text-body font-semibold" showIcon />
    </div>
  )
}
