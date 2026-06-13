import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DOMINATUS_ALLIANCE_LABELS,
  DOMINATUS_ALLIANCES,
  DOMINATUS_GUIDANCE,
  DOMINATUS_MISSION_SEQUENCE,
  DOMINATUS_POST_BATTLE,
  DOMINATUS_COMPANION_PDF,
  type DominatusAlliance,
} from '../data/dominatus-companion'
import { copy } from '../lib/copy'
import {
  addDominatusPlayer,
  loadDominatusCampaign,
  saveDominatusCampaign,
  type DominatusCampaignState,
} from '../lib/dominatus-storage'
import {
  FormatPdfLink,
  FormatSectionTabs,
  FormatSequenceList,
  FormatStartBattleLink,
  useFormatSection,
} from '../components/FormatCompanionShell'

export function DominatusPage() {
  const [section, setSection] = useFormatSection('sequence')
  const [campaign, setCampaign] = useState<DominatusCampaignState>(() => loadDominatusCampaign())
  const [newPlayer, setNewPlayer] = useState('')
  const [newAlliance, setNewAlliance] = useState<DominatusAlliance>('liberator')

  useEffect(() => {
    saveDominatusCampaign(campaign)
  }, [campaign])

  const sections = [
    { id: 'sequence' as const, label: 'Sequence' },
    { id: 'guidance' as const, label: 'Guidance' },
    { id: 'campaign' as const, label: 'Campaign' },
  ]

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{copy.formats.dominatus.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.formats.dominatus.subtitle}</p>
        <FormatPdfLink href={DOMINATUS_COMPANION_PDF} label={copy.formats.pdfLink} />
      </div>

      <FormatStartBattleLink to="/new/dominatus" label={copy.formats.startDominatusBattle} />

      <FormatSectionTabs sections={sections} section={section} onSection={setSection} />

      {section === 'sequence' && <FormatSequenceList steps={DOMINATUS_MISSION_SEQUENCE} />}

      {section === 'guidance' && (
        <div className="space-y-2">
          {DOMINATUS_GUIDANCE.map((g) => (
            <article key={g.title} className="app-panel p-4">
              <h2 className="text-sm font-semibold text-bone">{g.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">{g.body}</p>
            </article>
          ))}
          <article className="app-panel p-4">
            <h2 className="text-sm font-semibold text-bone">{copy.formats.dominatus.postBattleTitle}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
              {DOMINATUS_POST_BATTLE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        </div>
      )}

      {section === 'campaign' && (
        <div className="space-y-3">
          <section className="app-panel grid grid-cols-2 gap-3 p-4">
            <label className="text-xs text-muted">
              {copy.formats.dominatus.phase}
              <select
                value={campaign.phase}
                onChange={(e) =>
                  setCampaign((c) => ({ ...c, phase: Number(e.target.value) as 1 | 2 | 3 }))
                }
                className="app-input mt-1 w-full"
              >
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p}>
                    Phase {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted">
              {copy.formats.dominatus.location}
              <input
                value={campaign.locationName}
                onChange={(e) => setCampaign((c) => ({ ...c, locationName: e.target.value }))}
                className="app-input mt-1 w-full"
              />
            </label>
            <label className="col-span-2 text-xs text-muted">
              {copy.formats.dominatus.locationNotes}
              <textarea
                value={campaign.locationNotes}
                onChange={(e) => setCampaign((c) => ({ ...c, locationNotes: e.target.value }))}
                className="app-input mt-1 min-h-[4rem] w-full"
              />
            </label>
          </section>

          <section className="app-panel space-y-3 p-4">
            <h2 className="text-sm font-semibold text-bone">{copy.formats.dominatus.players}</h2>
            <div className="flex gap-2">
              <input
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder={copy.formats.dominatus.playerName}
                className="app-input min-w-0 flex-1"
              />
              <select
                value={newAlliance}
                onChange={(e) => setNewAlliance(e.target.value as DominatusAlliance)}
                className="app-input shrink-0"
              >
                {DOMINATUS_ALLIANCES.map((a) => (
                  <option key={a} value={a}>
                    {DOMINATUS_ALLIANCE_LABELS[a]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!newPlayer.trim()) return
                  setCampaign((c) => addDominatusPlayer(c, newPlayer, newAlliance))
                  setNewPlayer('')
                }}
                className="app-btn shrink-0 px-3 text-xs"
              >
                {copy.formats.dominatus.addPlayer}
              </button>
            </div>

            {campaign.players.length === 0 ? (
              <p className="text-xs text-muted">{copy.formats.dominatus.noPlayers}</p>
            ) : (
              <ul className="space-y-2">
                {campaign.players.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border bg-panel p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-bone">{p.name}</p>
                        <p className="text-muted">{DOMINATUS_ALLIANCE_LABELS[p.alliance]}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCampaign((c) => ({
                            ...c,
                            players: c.players.filter((x) => x.id !== p.id),
                          }))
                        }
                        className="text-[10px] text-warning"
                      >
                        {copy.common.close}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(
                        [
                          ['battleHonours', copy.formats.dominatus.bh],
                          ['battleSkills', copy.formats.dominatus.bs],
                          ['agendaAchieved', copy.formats.dominatus.aa],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="text-center">
                          <p className="text-[10px] text-muted">{label}</p>
                          <div className="mt-1 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="h-7 w-7 rounded border border-border"
                              onClick={() =>
                                setCampaign((c) => ({
                                  ...c,
                                  players: c.players.map((x) =>
                                    x.id === p.id
                                      ? { ...x, [key]: Math.max(0, x[key] - 1) }
                                      : x,
                                  ),
                                }))
                              }
                            >
                              −
                            </button>
                            <span className="w-4 tabular-nums">{p[key]}</span>
                            <button
                              type="button"
                              className="h-7 w-7 rounded border border-border"
                              onClick={() =>
                                setCampaign((c) => ({
                                  ...c,
                                  players: c.players.map((x) =>
                                    x.id === p.id ? { ...x, [key]: x[key] + 1 } : x,
                                  ),
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Link to="/" className="app-btn-ghost flex w-full py-3 text-sm">
        {copy.formats.backHome}
      </Link>
    </div>
  )
}
