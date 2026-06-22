import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DetachmentSheet } from '../components/DetachmentSheet'
import { AppSegment, AppSegmentButton } from '../components/AppSegment'
import { ListSetupWizard, type SetupStep } from '../components/ListSetupWizard'
import { RosterUnitEditSheet } from '../components/RosterUnitEditSheet'
import { UnitDetailSheet } from '../components/UnitDetailSheet'
import { PageLoading } from '../components/PageLoading'
import { copy } from '../lib/copy'
import { allegianceOf, type Allegiance } from '../lib/army-allegiance'
import { findArmyForBuilder } from '../lib/space-marine-chapters'
import {
  enhancementsForRoster,
  loadArmyEntryForBuilder,
  loadFactionCatalog,
} from '../lib/faction-loader'
import { loadFactionLoadouts } from '../lib/loadout-loader'
import { unitHasEditableLoadout } from '../lib/loadout-engine'
import {
  addUnit,
  canAddUnit,
  BATTLE_SIZE_LIMITS,
  createEmptyRoster,
  displayUnitPoints,
  filterUnits,
  filterLegendsVisibility,
  isLegendsUnit,
  refreshRoster,
  removeRosterLine,
  rosterSummaryText,
  toggleEnhancement,
  updateRosterLine,
  validateRoster,
} from '../lib/list-engine'
import { deleteRoster, loadRoster, saveRoster } from '../lib/roster-storage'
import { groupRosterLinesByBucket, groupUnitsByBucket, maxCopiesForUnit, unitBucket, type RosterLineEntry, type UnitBucketId } from '../lib/unit-buckets'
import type { CuratedUnit, Enhancement } from '../types/faction-data'
import type { Army } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import type { FactionLoadouts } from '../types/loadout'

type BuilderTab = 'units' | 'enhancements'

function bucketLabel(bucket: UnitBucketId): string {
  const map: Record<UnitBucketId, string> = {
    'epic-hero': copy.armyLists.bucketEpicHero,
    hero: copy.armyLists.bucketHero,
    battleline: copy.armyLists.bucketBattleline,
    transport: copy.armyLists.bucketTransport,
    vehicle: copy.armyLists.bucketVehicle,
    mounted: copy.armyLists.bucketMounted,
    other: copy.armyLists.bucketOther,
  }
  return map[bucket]
}

export function ListBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNewRoute = !id || id === 'new'

  const [roster, setRoster] = useState<ArmyRoster | null>(null)
  const [catalog, setCatalog] = useState<CuratedUnit[]>([])
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [armyEntry, setArmyEntry] = useState<Army | undefined>()
  const [loading, setLoading] = useState(!isNewRoute)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('allegiance')
  const [allegiance, setAllegiance] = useState<Allegiance | null>(null)
  const [query, setQuery] = useState('')
  const [showLegends, setShowLegends] = useState(false)
  const [detailUnit, setDetailUnit] = useState<CuratedUnit | null>(null)
  const [editEntry, setEditEntry] = useState<RosterLineEntry | null>(null)
  const [rosterViewUnit, setRosterViewUnit] = useState<CuratedUnit | null>(null)
  const [loadouts, setLoadouts] = useState<FactionLoadouts>({})
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
        const loadoutData = await loadFactionLoadouts(existing.army)
        if (cancelled) return
        setCatalog(data.units)
        setEnhancements(data.enhancements)
        setLoadouts(loadoutData)
        setRoster(refreshRoster(existing, data.units))
        const army = findArmyForBuilder(existing.army)
        if (army) setAllegiance(allegianceOf(army))
        const entry = await loadArmyEntryForBuilder(existing.army, army)
        setArmyEntry(entry)
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

  const hasLegendsUnits = useMemo(() => catalog.some(isLegendsUnit), [catalog])

  const filtered = useMemo(() => {
    const visible = filterLegendsVisibility(catalog, showLegends)
    return filterUnits(visible, query, '')
  }, [catalog, query, showLegends])

  const catalogGroups = useMemo(() => groupUnitsByBucket(filtered), [filtered])

  const rosterGroups = useMemo(() => {
    if (!roster) return []
    const catalogById = new Map(catalog.map((u) => [u.id, u]))
    const lines = roster.units.flatMap((line) => {
      const cu = catalogById.get(line.unitId)
      return cu ? [{ line, catalog: cu }] : []
    })
    return groupRosterLinesByBucket(lines)
  }, [roster, catalog])

  const rosterPointsByBucket = useMemo(() => {
    const m = new Map<UnitBucketId, number>()
    if (!roster) return m
    const catalogById = new Map(catalog.map((u) => [u.id, u]))
    for (const line of roster.units) {
      const cu = catalogById.get(line.unitId)
      if (!cu) continue
      const bucket = unitBucket(cu)
      m.set(bucket, (m.get(bucket) ?? 0) + line.points)
    }
    return m
  }, [roster, catalog])

  const issues = useMemo(
    () => (roster ? validateRoster(roster, catalog) : []),
    [roster, catalog],
  )

  const dpUsed = roster?.detachments.reduce((s, d) => s + d.dp, 0) ?? 0
  const rosterCountById = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of roster?.units ?? []) {
      m.set(u.unitId, (m.get(u.unitId) ?? 0) + 1)
    }
    return m
  }, [roster?.units])

  const enhancementNames = useMemo(() => enhancements.map((e) => e.name), [enhancements])
  const visibleEnhancements = useMemo(
    () => enhancementsForRoster(enhancements, roster?.detachments.map((d) => d.name) ?? []),
    [enhancements, roster?.detachments],
  )

  function persist(next: ArmyRoster) {
    const updated = refreshRoster(next, catalog)
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
      const loadoutData = await loadFactionLoadouts(armyName)
      setCatalog(data.units)
      setEnhancements(data.enhancements)
      setLoadouts(loadoutData)
      const entry = await loadArmyEntryForBuilder(armyName, findArmyForBuilder(armyName))
      setArmyEntry(entry)
      persist(refreshRoster(r, data.units))
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
          armyEntry={armyEntry}
          dpUsed={dpUsed}
          onAllegiance={handleAllegiance}
          onFaction={(army) => void handleFaction(army)}
          onStep={setSetupStep}
          onPersist={persist}
          onComplete={() => setSetupComplete(true)}
        />
        {catalogLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <p className="text-body text-muted">{copy.armyLists.loading}</p>
          </div>
        )}
      </>
    )
  }

  if (!roster) return <PageLoading label={copy.armyLists.loading} />

  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]
  const pct = Math.min(100, Math.round((roster.pointsTotal / limit) * 100))
  const overLimit = roster.pointsTotal > limit
  const rosterUnitCount = roster.units.length

  function handleEditLine(entry: RosterLineEntry) {
    const loadout = loadouts[entry.catalog.id] ?? null
    if (unitHasEditableLoadout(entry.catalog, loadout)) {
      setRosterViewUnit(null)
      setEditEntry(entry)
    } else {
      setEditEntry(null)
      setRosterViewUnit(entry.catalog)
    }
  }

  function closeUnitSheets() {
    setDetailUnit(null)
    setEditEntry(null)
    setRosterViewUnit(null)
  }

  const sheetUnit = detailUnit ?? rosterViewUnit

  return (
    <div className="bf-viewport bf-builder -mx-2">
      <header className="bf-header shrink-0 px-2 py-2">
        <div className="flex items-center gap-2">
          <Link to="/lists" className="text-caption text-muted hover:text-accent">
            ← {copy.armyLists.back}
          </Link>
          <div className="min-w-0 flex-1">
            <input
              value={roster.name}
              onChange={(e) => persist({ ...roster, name: e.target.value })}
              className="w-full truncate bg-transparent font-display text-title tracking-wide text-accent outline-none"
            />
            <p className="truncate text-micro uppercase tracking-widest text-muted">{roster.army}</p>
          </div>
          <PointsRing total={roster.pointsTotal} limit={limit} pct={pct} over={overLimit} />
        </div>

        <button
          type="button"
          onClick={() => setDetachmentSheetOpen(true)}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-widest text-muted">
              {copy.armyLists.tabDetachments}
            </p>
            <p className="truncate text-caption font-medium text-bone">
              {roster.detachments.length > 0
                ? roster.detachments.map((d) => d.name).join(' · ')
                : copy.armyLists.noDetachment}
            </p>
          </div>
          <span className="shrink-0 text-micro font-semibold uppercase tracking-wide text-crimson-bright">
            {copy.armyLists.changeDetachment}
          </span>
        </button>

        <AppSegment className="mt-2">
          <AppSegmentButton active={builderTab === 'units'} onClick={() => setBuilderTab('units')}>
            {copy.armyLists.tabUnits}
          </AppSegmentButton>
          <AppSegmentButton
            active={builderTab === 'enhancements'}
            onClick={() => setBuilderTab('enhancements')}
          >
            {copy.armyLists.tabEnhancements}
          </AppSegmentButton>
        </AppSegment>
      </header>

      {issues.length > 0 && (
        <ul className="shrink-0 space-y-0.5 px-2 pt-1">
          {issues.map((issue) => (
            <li
              key={issue.message}
              className={`rounded-lg px-3 py-1.5 text-caption ${
                issue.level === 'error'
                  ? 'bg-crimson-soft text-status-danger'
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
            showLegends={showLegends}
            hasLegendsUnits={hasLegendsUnits}
            rosterCountById={rosterCountById}
            onQuery={setQuery}
            onShowLegends={setShowLegends}
            onOpen={(u) => {
              setRosterViewUnit(null)
              setEditEntry(null)
              setDetailUnit(u)
            }}
            onQuickAdd={(u) => persist(addUnit(roster, u))}
          />
          <RosterPanel
            roster={roster}
            groups={rosterGroups}
            unitCount={rosterUnitCount}
            bucketPoints={rosterPointsByBucket}
            onRemoveLine={(lineId) => persist(removeRosterLine(roster, lineId))}
            onDuplicateLine={(entry) => {
              if (canAddUnit(roster, entry.catalog)) persist(addUnit(roster, entry.catalog))
            }}
            onEditLine={handleEditLine}
          />
        </div>
      )}

      {builderTab === 'enhancements' && (
        <div className="bf-scroll px-2 py-2">
          <EnhancementsPanel roster={roster} enhancements={visibleEnhancements} onPersist={persist} />
        </div>
      )}

      <footer className="shrink-0 border-t border-white/8 bg-void/95 px-2 py-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={exportJson} className="app-btn-ghost px-3 py-2 text-caption">
            {copy.armyLists.exportJson}
          </button>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(rosterSummaryText(roster, catalog))}
            className="app-btn-ghost px-3 py-2 text-caption"
          >
            {copy.armyLists.exportText}
          </button>
          {!isNewRoute && (
            <button type="button" onClick={handleDelete} className="app-btn-ghost app-btn-ghost-danger px-3 py-2 text-caption">
              Delete
            </button>
          )}
        </div>
      </footer>

      <RosterUnitEditSheet
        line={editEntry?.line ?? null}
        unit={editEntry?.catalog ?? null}
        loadout={editEntry ? (loadouts[editEntry.catalog.id] ?? null) : null}
        open={Boolean(editEntry)}
        enhancementNames={enhancementNames}
        onClose={() => setEditEntry(null)}
        onSave={(patch) => {
          if (!editEntry?.line.lineId) return
          persist(updateRosterLine(roster, editEntry.line.lineId, patch, catalog))
        }}
      />

      <UnitDetailSheet
        unit={sheetUnit}
        open={Boolean(sheetUnit)}
        enhancementNames={enhancementNames}
        onClose={closeUnitSheets}
        showAdd={Boolean(detailUnit)}
        onAdd={() => {
          if (detailUnit && canAddUnit(roster, detailUnit)) persist(addUnit(roster, detailUnit))
        }}
        addDisabled={detailUnit ? !canAddUnit(roster, detailUnit) : false}
        inRoster={detailUnit ? rosterCountById.get(detailUnit.id) : undefined}
        maxCopies={detailUnit ? maxCopiesForUnit(detailUnit) : undefined}
      />

      <DetachmentSheet
        roster={roster}
        armyEntry={armyEntry}
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
          stroke={over ? 'var(--color-crimson-bright)' : 'var(--color-gw-gold)'}
          strokeWidth="6"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-body tabular-nums ${over ? 'text-status-danger' : 'text-bone'}`}>
          {total}
        </span>
        <span className="text-micro text-muted">/{limit}</span>
      </div>
    </div>
  )
}

function UnitBucketAccordion<T>({
  groups,
  query,
  expandAllDefault = false,
  bucketPoints,
  itemKey,
  renderItem,
}: {
  groups: { bucket: UnitBucketId; items: T[] }[]
  query?: string
  expandAllDefault?: boolean
  bucketPoints?: Map<UnitBucketId, number>
  itemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}) {
  const [openBuckets, setOpenBuckets] = useState<Set<UnitBucketId>>(() => new Set())
  const groupKey = groups.map((g) => g.bucket).join(',')
  const prevGroupKey = useRef('')

  useEffect(() => {
    if (groupKey !== prevGroupKey.current) {
      prevGroupKey.current = groupKey
      if (groups.length === 0) {
        setOpenBuckets(new Set())
      } else if (expandAllDefault) {
        setOpenBuckets(new Set(groups.map((g) => g.bucket)))
      } else {
        setOpenBuckets(new Set([groups[0].bucket]))
      }
    }
  }, [groupKey, groups, expandAllDefault])

  useEffect(() => {
    if (query?.trim()) {
      setOpenBuckets(new Set(groups.map((g) => g.bucket)))
    }
  }, [query, groups])

  function toggleBucket(bucket: UnitBucketId) {
    setOpenBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      return next
    })
  }

  return (
    <div className="bf-bucket-accordion">
      {groups.map(({ bucket, items }) => {
        const open = openBuckets.has(bucket)
        const bucketPts = bucketPoints?.get(bucket) ?? 0
        return (
          <section key={bucket} className={`bf-bucket-section${open ? ' is-open' : ''}`}>
            <button
              type="button"
              className="bf-bucket-trigger"
              aria-expanded={open}
              onClick={() => toggleBucket(bucket)}
            >
              <span className="bf-bucket-trigger-label">
                <span>{bucketLabel(bucket)}</span>
                {bucketPts > 0 && (
                  <span className="bf-bucket-trigger-pts tabular-nums">{bucketPts} pts</span>
                )}
              </span>
              <span className="bf-bucket-trigger-meta">
                <span className="tabular-nums">{items.length}</span>
                <span className="bf-bucket-chevron" aria-hidden />
              </span>
            </button>
            {open && (
              <div className="bf-bucket-panel">
                {items.map((item) => (
                  <div key={itemKey(item)}>{renderItem(item)}</div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function CatalogPanel({
  groups,
  query,
  showLegends,
  hasLegendsUnits,
  rosterCountById,
  onQuery,
  onShowLegends,
  onOpen,
  onQuickAdd,
}: {
  groups: { bucket: UnitBucketId; units: CuratedUnit[] }[]
  query: string
  showLegends: boolean
  hasLegendsUnits: boolean
  rosterCountById: Map<string, number>
  onQuery: (q: string) => void
  onShowLegends: (show: boolean) => void
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
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-caption"
        />
        {hasLegendsUnits && (
          <label className="flex items-center gap-2 text-caption text-muted">
            <input
              type="checkbox"
              checked={showLegends}
              onChange={(e) => onShowLegends(e.target.checked)}
            />
            {copy.armyLists.showLegends}
          </label>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-6 text-center text-caption text-muted">{copy.common.noResults}</p>
      ) : (
        <UnitBucketAccordion
          groups={groups.map((g) => ({ bucket: g.bucket, items: g.units }))}
          query={query}
          itemKey={(u) => u.id}
          renderItem={(u) => {
            const inArmy = rosterCountById.get(u.id) ?? 0
            const atMax = inArmy >= maxCopiesForUnit(u)
            return (
              <div className="bf-unit-row">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpen(u)}
                >
                  <p className="truncate text-caption font-medium leading-tight text-bone">{u.name}</p>
                  <p className="text-micro tabular-nums text-accent-dim">{displayUnitPoints(u)}</p>
                </button>
                <button
                  type="button"
                  className="bf-add-fab"
                  aria-label={copy.armyLists.addUnit}
                  disabled={atMax}
                  onClick={() => onQuickAdd(u)}
                >
                  +
                </button>
              </div>
            )
          }}
        />
      )}
    </div>
  )
}

function RosterUnitRow({
  line,
  canDuplicate,
  onEdit,
  onRemove,
  onDuplicate,
}: {
  line: RosterLineEntry['line']
  canDuplicate: boolean
  onEdit: () => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const loadoutSummary =
    typeof line.options?.loadoutSummary === 'string' ? line.options.loadoutSummary : ''

  return (
    <div className="bf-unit-row">
      <button
        type="button"
        className="bf-roster-line-btn"
        aria-label={copy.armyLists.viewUnit}
        onClick={onEdit}
      >
        <p className="truncate text-caption font-medium text-bone">{line.name}</p>
        {loadoutSummary ? (
          <p className="truncate text-micro text-muted">
            {loadoutSummary} · {line.points} pts
          </p>
        ) : (
          <p className="text-micro tabular-nums text-accent-dim">{line.points} pts</p>
        )}
      </button>
      {line.lineId && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="bf-row-menu-btn"
            aria-label={copy.armyLists.unitActions}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 4 16" className="h-3.5 w-1" aria-hidden>
              <circle cx="2" cy="2" r="1.35" fill="currentColor" />
              <circle cx="2" cy="8" r="1.35" fill="currentColor" />
              <circle cx="2" cy="14" r="1.35" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="bf-row-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="bf-row-menu-item"
                disabled={!canDuplicate}
                onClick={() => {
                  if (!canDuplicate) return
                  onDuplicate()
                  setMenuOpen(false)
                }}
              >
                {copy.armyLists.duplicateUnit}
              </button>
              <button
                type="button"
                role="menuitem"
                className="bf-row-menu-item bf-row-menu-item-danger"
                onClick={() => {
                  onRemove()
                  setMenuOpen(false)
                }}
              >
                {copy.armyLists.deleteUnit}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RosterPanel({
  roster,
  groups,
  unitCount,
  bucketPoints,
  onRemoveLine,
  onDuplicateLine,
  onEditLine,
}: {
  roster: ArmyRoster
  groups: ReturnType<typeof groupRosterLinesByBucket>
  unitCount: number
  bucketPoints: Map<UnitBucketId, number>
  onRemoveLine: (lineId: string) => void
  onDuplicateLine: (entry: RosterLineEntry) => void
  onEditLine: (entry: RosterLineEntry) => void
}) {
  return (
    <div className="bf-split-panel bg-black/20">
      <p className="bf-panel-head">
        {copy.armyLists.panelRoster} ({unitCount})
      </p>
      {roster.units.length === 0 ? (
        <p className="px-3 py-6 text-center text-caption text-muted">{copy.armyLists.emptyList}</p>
      ) : (
        <UnitBucketAccordion
          groups={groups.map((g) => ({ bucket: g.bucket, items: g.lines }))}
          expandAllDefault
          bucketPoints={bucketPoints}
          itemKey={(entry) => entry.line.lineId ?? `${entry.line.unitId}-${entry.line.points}`}
          renderItem={(entry) => (
            <RosterUnitRow
              line={entry.line}
              canDuplicate={canAddUnit(roster, entry.catalog)}
              onEdit={() => onEditLine(entry)}
              onRemove={() => entry.line.lineId && onRemoveLine(entry.line.lineId)}
              onDuplicate={() => onDuplicateLine(entry)}
            />
          )}
        />
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
        <p className="text-body text-muted">{copy.armyLists.noEnhancements}</p>
      ) : (
        enhancements.map((e) => {
          const on = roster.enhancements.some((x) => x.name === e.name)
          return (
            <button
              key={e.name}
              type="button"
              onClick={() => onPersist(toggleEnhancement(roster, e.name, e.points))}
              className={`w-full rounded-xl border p-3 text-left ${
                on ? 'border-crimson/35 bg-crimson-soft ring-1 ring-crimson/20' : 'border-white/8'
              }`}
            >
              <div className="flex justify-between">
                <p className="text-body font-medium text-bone">{e.name}</p>
                <span className="text-caption tabular-nums text-accent-dim">{e.points} pts</span>
              </div>
              <p className="mt-1 line-clamp-2 text-caption text-muted">{e.description}</p>
            </button>
          )
        })
      )}
    </div>
  )
}
