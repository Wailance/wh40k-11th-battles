import { useState } from 'react'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { BattlefieldMap } from '../components/BattlefieldMap'
import { GwTerrainReference } from '../components/GwTerrainReference'
import { getMatchupBattlefield } from '../lib/battlefield'
import { copy } from '../lib/copy'
import { GW_PDF_LABELS } from '../lib/gw-links'
import { FD_ORDER, gameData, getPrimaryMission } from '../lib/game-utils'
import type { ForceDisposition } from '../types/game'

const PHASES = [
  { id: 'core', label: 'Core' },
  { id: 'movement', label: 'Movement' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'charge', label: 'Charge' },
  { id: 'fight', label: 'Fight' },
  { id: 'command', label: 'Command' },
  { id: 'missions', label: 'Missions' },
  { id: 'terrain', label: 'Terrain' },
] as const

type PhaseId = (typeof PHASES)[number]['id']

export function RulesPage() {
  const [phase, setPhase] = useState<PhaseId>('core')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="app-page-title">{copy.rules.title}</h1>
        <p className="mt-1 text-sm text-muted">Warhammer 40,000 11th Edition · v{gameData.version}</p>
        {'rulesNote' in gameData && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {(gameData as { rulesNote?: string }).rulesNote}
          </p>
        )}
        <div className="app-divider mt-4" />
      </div>

      <GwSourcesPanel />

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPhase(p.id)}
            data-active={phase === p.id}
            className="app-filter-pill shrink-0"
          >
            {p.label}
          </button>
        ))}
      </div>

      {phase === 'missions' && <MissionsPanel />}
      {phase === 'terrain' && <TerrainPanel />}
      {phase !== 'missions' && phase !== 'terrain' && (
        <RulesList phase={phase as keyof typeof gameData.rules} />
      )}
    </div>
  )
}

function GwSourcesPanel() {
  const pdfs = (
    gameData as {
      rulesPdfs?: Record<string, { title: string; url: string }>
    }
  ).rulesPdfs
  if (!pdfs) return null
  const items = Object.values(pdfs)
  return (
    <section className="app-panel p-4">
      <h2 className="text-sm font-semibold text-bone">Official rulebooks (PDF)</h2>
      <p className="mt-1 text-xs text-muted">
        In-app text is extracted from these GW PDFs. Open for full authoritative wording.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {items.map((pdf) => (
          <a
            key={pdf.url}
            href={pdf.url}
            target="_blank"
            rel="noreferrer"
            className="app-btn-ghost flex-1 py-2.5 text-center text-sm"
          >
            {pdf.title} ↗
          </a>
        ))}
      </div>
    </section>
  )
}

function RulesList({ phase }: { phase: keyof typeof gameData.rules }) {
  const rules = gameData.rules[phase] ?? []
  if (!rules.length) {
    return <p className="text-sm text-muted">No rules for this phase yet.</p>
  }
  return (
    <div className="space-y-3">
      {rules.map((r, i) => (
        <div key={`${r.category}-${r.title}-${i}`} className="app-panel p-4">
          <p className="text-xs uppercase tracking-wide text-accent">{r.category}</p>
          {r.title && <p className="mt-1 font-bold text-bone">{r.title}</p>}
          {r.body && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{r.body}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function MissionsPanel() {
  const gwMissions = gameData.rules.missions ?? []
  const matrix = gameData.primaryMissionMatrix as string[][]
  const oppRows = gameData.opponentForceDispositionRow as Record<ForceDisposition, number>
  const oppLabels = FD_ORDER.map((fd) => ({ fd, row: oppRows[fd] }))

  return (
    <div className="space-y-4">
      {gwMissions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm tracking-wide text-accent">Tournament Companion (PDF)</h2>
          {gwMissions.map((r, i) => (
            <div key={`gw-m-${i}`} className="app-panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{r.category}</p>
              {r.title && <p className="mt-1 font-semibold text-bone">{r.title}</p>}
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
            </div>
          ))}
        </section>
      )}

      <section className="app-panel p-4 text-sm text-muted leading-relaxed">
        <p>
          Each player picks one Force Disposition from their detachments. The pairing
          determines both primary missions (Chapter Approved deck) and deployment layout.
        </p>
        <p className="mt-2">
          Primary: max {gameData.scoringCaps.primaryMaxGame} VP/game,{' '}
          {gameData.scoringCaps.primaryMaxRound} VP/round.
        </p>
        <p className="mt-2">
          Battle Ready armies score +{gameData.scoringCaps.battleReadyVp} VP (
          {GW_PDF_LABELS.tournament}).
        </p>
      </section>

      <section className="app-panel p-4">
        <h2 className="font-semibold">15 Matchups</h2>
        <div className="mt-3 space-y-3">
          {gameData.forceDispositionMatchups.map((m) => {
            const fd1 = m.player1 as ForceDisposition
            const fd2 = m.player2 as ForceDisposition
            return (
              <div key={m.id} className="border-b border-border pb-2 text-sm last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-accent">#{m.id}</span>
                  <ForceDispositionBadge fd={fd1} short />
                  <span className="text-muted">vs</span>
                  <ForceDispositionBadge fd={fd2} short />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 pl-8 text-xs">
                  <MissionNameButton name={getPrimaryMission(fd1, fd2)} className="text-xs" />
                  <span className="text-muted">/</span>
                  <MissionNameButton name={getPrimaryMission(fd2, fd1)} className="text-xs" />
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="app-panel p-4 overflow-x-auto">
        <h2 className="font-semibold">Primary Mission Matrix</h2>
        <p className="mt-1 text-xs text-muted">Row = opponent&apos;s Force Disposition</p>
        <table className="mt-3 w-full min-w-[28rem] text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-muted">Opp. FD ↓</th>
              {FD_ORDER.map((fd) => (
                <th key={fd} className="p-1 text-left"><ForceDispositionBadge fd={fd} short /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {oppLabels.map(({ fd, row }) => (
              <tr key={fd} className="border-t border-border">
                <td className="p-1"><ForceDispositionBadge fd={fd} short /></td>
                {FD_ORDER.map((colFd) => (
                  <td key={colFd} className="p-1">
                    <MissionNameButton
                      name={matrix[row][FD_ORDER.indexOf(colFd)]}
                      className="text-xs text-muted"
                      showIcon={false}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="app-panel p-4">
        <h2 className="font-semibold">Fixed Secondaries (pick 2)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(gameData.secondaries.fixedOptions as string[]).map((s) => (
            <span key={s} className="rounded border border-border px-2 py-1 text-xs">
              <MissionNameButton name={s} className="text-xs" showIcon={false} />
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Max {gameData.scoringCaps.fixedSecondaryMaxPerCard} VP per card,{' '}
          {gameData.scoringCaps.tacticalSecondaryMaxRound} VP/round,{' '}
          {gameData.scoringCaps.fixedSecondaryMaxGame} VP/game total.
        </p>
      </section>

      <section className="app-panel p-4">
        <h2 className="font-semibold">Tactical Deck ({gameData.secondaries.tacticalDeck.length} cards)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(gameData.secondaries.tacticalDeck as string[]).map((s) => (
            <span key={s} className="rounded border border-border px-2 py-1 text-xs">
              <MissionNameButton name={s} className="text-xs" showIcon={false} />
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Each Command phase, draw until you have 2 active cards. Achieved cards are
          discarded. Max {gameData.scoringCaps.tacticalSecondaryMaxGame} VP/game,{' '}
          {gameData.scoringCaps.tacticalSecondaryMaxRound} VP/round.
        </p>
      </section>
    </div>
  )
}

function TerrainPanel() {
  const [previewId, setPreviewId] = useState<number | null>(3)
  const [referenceId, setReferenceId] = useState<number | null>(null)
  const preview = previewId ? getMatchupBattlefield(previewId) : null
  const terrainRules = (gameData.rules as { terrain?: typeof gameData.rules.core }).terrain ?? []

  return (
    <div className="space-y-4">
      <GwTerrainReference />

      {terrainRules.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm tracking-wide text-accent">Core Rules — Terrain (PDF)</h2>
          {terrainRules.map((r, i) => (
            <div key={`terrain-rule-${i}`} className="app-panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{r.category}</p>
              {r.title && <p className="mt-1 font-semibold text-bone">{r.title}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{r.body}</p>
            </div>
          ))}
        </section>
      )}

      <section className="app-panel p-4">
        <h2 className="font-semibold">{copy.battlefield.title}</h2>
        <p className="mt-1 text-xs text-muted">
          15 Force Disposition pairings — Event Companion layouts with deployment zones and terrain
          footprints.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gameData.layouts.map((l) => {
            const hasMap = l.available && getMatchupBattlefield(l.id)?.variants.length
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setPreviewId(l.id)
                  setReferenceId(null)
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] touch-manipulation ${
                  previewId === l.id
                    ? 'border-accent/40 bg-accent/15 text-accent'
                    : hasMap
                      ? 'border-border text-muted'
                      : 'border-warning/25 text-warning/80'
                }`}
              >
                #{l.id}
                {!hasMap && ' · no map'}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          {gameData.layouts
            .filter((l) => previewId === l.id)
            .map((l) => (
              <span key={l.id} className="flex items-center gap-1">
                <ForceDispositionBadge fd={l.player1 as ForceDisposition} short />
                <span>vs</span>
                <ForceDispositionBadge fd={l.player2 as ForceDisposition} short />
              </span>
            ))}
        </div>
      </section>

      {preview && (
        <BattlefieldMap
          battlefield={preview}
          attacker={1}
          player1Name="Player 1"
          player2Name="Player 2"
          referenceMatchupId={referenceId}
          onReferenceMatchupChange={setReferenceId}
        />
      )}

      <section className="app-panel p-4">
        <h2 className="font-semibold">All matchups</h2>
        <div className="mt-2 space-y-1 text-sm">
          {gameData.layouts.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <span className="text-muted">#{l.id}</span>
              <ForceDispositionBadge fd={l.player1 as ForceDisposition} short />
              <span className="text-muted">/</span>
              <ForceDispositionBadge fd={l.player2 as ForceDisposition} short />
              {!l.available && <span className="text-xs text-muted">(map N/A)</span>}
              {l.available && (
                <span className="text-xs text-accent">
                  {getMatchupBattlefield(l.id)?.variants.length ?? 0} variants
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
