import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DetachmentSheet } from '../components/DetachmentSheet'
import { ListSetupWizard, type SetupStep } from '../components/ListSetupWizard'
import { UnitDetailSheet } from '../components/UnitDetailSheet'
import { PageLoading } from '../components/PageLoading'
import { copy } from '../lib/copy'
import { allegianceOf, findArmy, type Allegiance } from '../lib/army-allegiance'
import { loadFactionCatalog } from '../lib/faction-loader'
import {
  addUnit,
  BATTLE_SIZE_LIMITS,
  createEmptyRoster,
  filterUnits,
  refreshRoster,
  removeUnit,
  rosterSummaryText,
  toggleEnhancement,
  validateRoster,
} from '../lib/list-engine'
import { deleteRoster, loadRoster, saveRoster } from '../lib/roster-storage'
import { filterByBucket, groupUnitsByBucket, type UnitBucketId } from '../lib/unit-buckets'
import type { CuratedUnit } from '../types/faction-data'
import type { ArmyRoster } from '../types/roster'

type BuilderTab = 'units' | 'enhancements'

const BUCKET_FILTERS: { id: UnitBucketId | ''; labelKey: keyof typeof copy.armyLists }[] = [
  { id: '', labelKey: 'bucketAll' },
  { id: 'epic-hero', labelKey: 'bucketEpicHero' },
  { id: 'hero', labelKey: 'bucketHero' },
  { id: 'battleline', labelKey: 'bucketBattleline' },
  { id: 'vehicle', labelKey: 'bucketVehicle' },
  { id: 'mounted', labelKey: 'bucketMounted' },
]

function bucketLabel(bucket: UnitBucketId): string {
  const map: Record<UnitBucketId, keyof typeof copy.armyLists> = {
    'epic-hero': 'bucketEpicHero',
    hero: 'bucketHero',
    battleline: 'bucketBattleline',
    vehicle: 'bucketVehicle',
    mounted: 'bucketMounted',
    other: 'bucketOther',
  }
  return copy.armyLists[map[bucket]]
}

export function ListBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNewRoute = !id || id === 'new'

  const [roster, setRoster] = useState<ArmyRoster | null>(null)
  const [catalog, setCatalog] = useState<CuratedUnit[]>([])
  const [enhancements, setEnhancements] = useState<
    { name: string; points: number; description: string; detachment?: string }[]
  >([])
  const [loading, setLoading] = useState(!isNewRoute)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('allegiance')
  const [allegiance, setAllegiance] = useState<Allegiance | null>(null)
  const [query, setQuery] = useState('')
  const [bucketFilter, setBucketFilter] = useState<UnitBucketId | ''>('')
  const [detailUnit, setDetailUnit] = useState<CuratedUnit | null>(null)
  const [builderTab, setBuilderTab] = useState<BuilderTab>('units')
  const [detachmentSheetOpen, setDetachmentSheetOpen] = useState(false)

  useEffect(() => {
    if (isNewRoute) return

    let cancelled = false
    async function init() {
      setLoading(true)
      const existing = loadRoster(id!)
      if (!existing) {
        navigate('/lists')
        return
      }
      try {
        const data = await loadFactionCatalog(existing.army)
        if (cancelled) return
        setCatalog(data.units)
        setEnhancements(data.enhancements)
        setRoster(refreshRoster(existing))
        const army = findArmy(existing.army)
        if (army) setAllegiance(allegianceOf(army))
        if (existing.detachments.length === 0) {
          setSetupComplete(false)
          setSetupStep('detachment')
        } else {
          setSetupComplete(true)
        }
      } catch {
        if (!cancelled) alert(copy.armyLists.loadError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [id, isNewRoute, navigate])

  const filtered = useMemo(() => {
    const searched = filterUnits(catalog, query, '')
    return filterByBucket(searched, bucketFilter)
  }, [catalog, query, bucketFilter])

  const catalogGroups = useMemo(() => groupUnitsByBucket(filtered), [filtered])

  const rosterGroups = useMemo(() => {
    if (!roster) return []
    const inRoster = catalog.filter((u) => roster.units.some((ru) => ru.unitId === u.id))
    return groupUnitsByBucket(inRoster)
  }, [roster, catalog])

  const issues = useMemo(
    () => (roster ? validateRoster(roster, catalog) : []),
    [roster, catalog],
  )

  const dpUsed = roster?.detachments.reduce((s, d) => s + d.dp, 0) ?? 0
  const rosterCountById = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of roster?.units ?? []) m.set(u.unitId, u.count)
    return m
  }, [roster?.units])

  function persist(next: ArmyRoster) {
    const updated = refreshRoster(next)
    setRoster(updated)
    saveRoster(updated)
  }

  function handleAllegiance(a: Allegiance) {
    if (allegiance !== a) setRoster(null)
    setAllegiance(a)
    setSetupStep('faction')
  }

  async function handleFaction(armyName: string) {
    setCatalogLoading(true)
    try {
      let r: ArmyRoster
      if (roster && roster.army === armyName) {
        r = roster
      } else if (roster?.id) {
        r = {
          ...createEmptyRoster(armyName, roster.battleSize),
          id: roster.id,
          createdAt: roster.createdAt,
          name: `${armyName} list`,
          units: [],
          detachments: [],
          enhancements: [],
        }
      } else {
        r = createEmptyRoster(armyName)
      }

      const data = await loadFactionCatalog(armyName)
      setCatalog(data.units)
      setEnhancements(data.enhancements)
      persist(r)
      setSetupStep('detachment')
      if (isNewRoute) navigate(`/lists/${r.id}`, { replace: true })
    } catch {
      alert(copy.armyLists.loadError)
    } finally {
      setCatalogLoading(false)
    }
  }

  function exportJson() {
    if (!roster) return
    const blob = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${roster.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDelete() {
    if (!roster || isNewRoute) return
    if (!window.confirm(copy.armyLists.deleteConfirm)) return
    deleteRoster(roster.id)
    navigate('/lists')
  }

  if (loading && !setupComplete) return <PageLoading label={copy.armyLists.loading} />

  if (!setupComplete) {
    return (
      <>
        <ListSetupWizard
          step={setupStep}
          allegiance={allegiance}
          roster={roster}
          dpUsed={dpUsed}
          onAllegiance={handleAllegiance}
          onFaction={(army) => void handleFaction(army)}
          onStep={setSetupStep}
          onPersist={persist}
          onComplete={() => setSetupComplete(true)}
        />
        {catalogLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <p className="text-sm text-muted">{copy.armyLists.loading}</p>
          </div>
        )}
      </>
    )
  }

  if (!roster) return <PageLoading label={copy.armyLists.loading} />

  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]
  const pct = Math.min(100, Math.round((roster.pointsTotal / limit) * 100))
  const overLimit = roster.pointsTotal > limit
  const rosterUnitCount = roster.units.reduce((s, u) => s + u.count, 0)

  return (
    <div className="bf-viewport bf-builder -mx-2">
      <header className="bf-header shrink-0 px-2 py-2">
        <div className="flex items-center gap-2">
          <Link to="/lists" className="text-xs text-muted hover:text-[var(--color-gw-gold)]">
            ← {copy.armyLists.back}
          </Link>
          <div className="min-w-0 flex-1">
            <input
              value={roster.name}
              onChange={(e) => persist({ ...roster, name: e.target.value })}
              className="w-full truncate bg-transparent font-display text-base tracking-wide text-[var(--color-gw-gold)] outline-none"
            />
            <p className="truncate text-[10px] uppercase tracking-widest text-muted">{roster.army}</p>
          </div>
          <PointsRing total={roster.pointsTotal} limit={limit} pct={pct} over={overLimit} />
        </div>

        <button
          type="button"
          onClick={() => setDetachmentSheetOpen(true)}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-muted">
              {copy.armyLists.tabDetachments}
            </p>
            <p className="truncate text-xs font-medium text-bone">
              {roster.detachments.length > 0
                ? roster.detachments.map((d) => d.name).join(' · ')
                : copy.armyLists.noDetachment}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-gw-gold)]">
            {copy.armyLists.changeDetachment}
          </span>
        </button>

        <div className="bf-segment mt-2">
          <button
            type="button"
            data-active={builderTab === 'units'}
            onClick={() => setBuilderTab('units')}
            className="!py-1.5 !text-[10px]"
          >
            {copy.armyLists.tabUnits}
          </button>
          <button
            type="button"
            data-active={builderTab === 'enhancements'}
            onClick={() => setBuilderTab('enhancements')}
            className="!py-1.5 !text-[10px]"
          >
            {copy.armyLists.tabEnhancements}
          </button>
        </div>
      </header>

      {issues.length > 0 && (
        <ul className="shrink-0 space-y-0.5 px-2 pt-1">
          {issues.map((issue) => (
            <li
              key={issue.message}
              className={`rounded-lg px-3 py-1.5 text-[11px] ${
                issue.level === 'error'
                  ? 'bg-red-500/10 text-red-300'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {builderTab === 'units' && (
        <div className="bf-split min-h-0 flex-1 overflow-hidden">
          <CatalogPanel
            groups={catalogGroups}
            query={query}
            bucketFilter={bucketFilter}
            rosterCountById={rosterCountById}
            onQuery={setQuery}
            onBucket={setBucketFilter}
            onOpen={setDetailUnit}
            onQuickAdd={(u) => persist(addUnit(roster, u))}
          />
          <RosterPanel
            roster={roster}
            groups={rosterGroups}
            unitCount={rosterUnitCount}
            onPersist={persist}
          />
        </div>
      )}

      {builderTab === 'enhancements' && (
        <div className="bf-scroll px-2 py-2">
          <EnhancementsPanel roster={roster} enhancements={enhancements} onPersist={persist} />
        </div>
      )}

      <footer className="shrink-0 border-t border-white/8 bg-void/95 px-2 py-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={exportJson} className="app-btn-ghost px-3 py-2 text-xs">
            {copy.armyLists.exportJson}
          </button>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(rosterSummaryText(roster))}
            className="app-btn-ghost px-3 py-2 text-xs"
          >
            {copy.armyLists.exportText}
          </button>
          {!isNewRoute && (
            <button type="button" onClick={handleDelete} className="app-btn-ghost px-3 py-2 text-xs text-red-400">
              Delete
            </button>
          )}
        </div>
      </footer>

      <UnitDetailSheet
        unit={detailUnit}
        open={Boolean(detailUnit)}
        onClose={() => setDetailUnit(null)}
        onAdd={() => {
          if (detailUnit) persist(addUnit(roster, detailUnit))
        }}
        inRoster={detailUnit ? rosterCountById.get(detailUnit.id) : 0}
      />

      <DetachmentSheet
        roster={roster}
        dpUsed={dpUsed}
        open={detachmentSheetOpen}
        onClose={() => setDetachmentSheetOpen(false)}
        onPersist={persist}
      />
    </div>
  )
}

function PointsRing({
  total,
  limit,
  pct,
  over,
}: {
  total: number
  limit: number
  pct: number
  over: boolean
}) {
  const r = 30
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="bf-points-ring bf-points-ring-sm shrink-0 text-center">
      <svg width="56" height="56" viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={over ? '#ef4444' : 'var(--color-gw-gold)'}
          strokeWidth="6"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-sm tabular-nums ${over ? 'text-red-300' : 'text-bone'}`}>
          {total}
        </span>
        <span className="text-[9px] text-muted">/{limit}</span>
      </div>
    </div>
  )
}

function CatalogPanel({
  groups,
  query,
  bucketFilter,
  rosterCountById,
  onQuery,
  onBucket,
  onOpen,
  onQuickAdd,
}: {
  groups: { bucket: UnitBucketId; units: CuratedUnit[] }[]
  query: string
  bucketFilter: UnitBucketId | ''
  rosterCountById: Map<string, number>
  onQuery: (q: string) => void
  onBucket: (b: UnitBucketId | '') => void
  onOpen: (u: CuratedUnit) => void
  onQuickAdd: (u: CuratedUnit) => void
}) {
  return (
    <div className="bf-split-panel">
      <p className="bf-panel-head">{copy.armyLists.panelCatalog}</p>
      <div className="space-y-2 px-2 pb-2 pt-2">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={copy.armyLists.searchUnits}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs"
        />
        <div className="flex flex-wrap gap-1">
          {BUCKET_FILTERS.map(({ id, labelKey }) => (
            <button
              key={id || 'all'}
              type="button"
              onClick={() => onBucket(id)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                bucketFilter === id
                  ? 'bg-[var(--color-gw-gold)]/20 text-[var(--color-gw-gold)]'
                  : 'bg-white/5 text-muted'
              }`}
            >
              {copy.armyLists[labelKey]}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted">{copy.common.noResults}</p>
      ) : (
        groups.map(({ bucket, units }) => (
          <section key={bucket}>
            <h3 className="bf-bucket-head">
              {bucketLabel(bucket)} ({units.length})
            </h3>
            {units.map((u) => {
              const inArmy = rosterCountById.get(u.id) ?? 0
              return (
                <div key={u.id} className="bf-unit-row">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpen(u)}
                  >
                    <p className="truncate text-[11px] font-medium leading-tight text-bone">{u.name}</p>
                    <p className="text-[10px] tabular-nums text-[var(--color-gw-gold)]">{u.points}</p>
                  </button>
                  {inArmy > 0 && (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted">×{inArmy}</span>
                  )}
                  <button
                    type="button"
                    className="bf-add-fab"
                    aria-label={copy.armyLists.addUnit}
                    onClick={() => onQuickAdd(u)}
                  >
                    +
                  </button>
                </div>
              )
            })}
          </section>
        ))
      )}
    </div>
  )
}

function RosterPanel({
  roster,
  groups,
  unitCount,
  onPersist,
}: {
  roster: ArmyRoster
  groups: { bucket: UnitBucketId; units: CuratedUnit[] }[]
  unitCount: number
  onPersist: (r: ArmyRoster) => void
}) {
  const rosterById = new Map(roster.units.map((u) => [u.unitId, u]))

  return (
    <div className="bf-split-panel bg-black/20">
      <p className="bf-panel-head">
        {copy.armyLists.panelRoster} ({unitCount})
      </p>
      {roster.units.length === 0 ? (
        <p className="px-3 py-6 text-center text-[11px] text-muted">{copy.armyLists.emptyList}</p>
      ) : (
        groups.map(({ bucket, units }) => (
          <section key={bucket}>
            <h3 className="bf-bucket-head">{bucketLabel(bucket)}</h3>
            {units.map((cu) => {
              const u = rosterById.get(cu.id)
              if (!u) return null
              return (
                <div key={cu.id} className="bf-unit-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-bone">{u.name}</p>
                    <p className="text-[10px] tabular-nums text-[var(--color-gw-gold)]">
                      {u.points * u.count}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-muted"
                      onClick={() => onPersist(removeUnit(roster, u.unitId))}
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-[11px] tabular-nums">{u.count}</span>
                    <button
                      type="button"
                      className="bf-add-fab"
                      onClick={() => onPersist(addUnit(roster, cu))}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
        ))
      )}
    </div>
  )
}

function EnhancementsPanel({
  roster,
  enhancements,
  onPersist,
}: {
  roster: ArmyRoster
  enhancements: { name: string; points: number; description: string; detachment?: string }[]
  onPersist: (r: ArmyRoster) => void
}) {
  return (
    <div className="space-y-2">
      {enhancements.length === 0 ? (
        <p className="text-sm text-muted">{copy.armyLists.noEnhancements}</p>
      ) : (
        enhancements.map((e) => {
          const on = roster.enhancements.some((x) => x.name === e.name)
          return (
            <button
              key={e.name}
              type="button"
              onClick={() => onPersist(toggleEnhancement(roster, e.name, e.points))}
              className={`w-full rounded-xl border p-3 text-left ${
                on ? 'border-[var(--color-gw-gold)]/40' : 'border-white/8'
              }`}
            >
              <div className="flex justify-between">
                <p className="text-sm font-medium text-bone">{e.name}</p>
                <span className="text-xs text-[var(--color-gw-gold)]">{e.points} pts</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{e.description}</p>
            </button>
          )
        })
      )}
    </div>
  )
}
