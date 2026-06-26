import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DetachmentSheet } from '../components/DetachmentSheet'
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
import { WoBuilderMenu } from '../components/WoBuilderMenu'
import { WoBuilderTabs, WoPaneTabs } from '../components/WoBuilderTabs'
import { WoUnitInfoPanel } from '../components/WoUnitInfoPanel'
import { WarOrganUnitEditSheet } from '../components/WarOrganUnitEditSheet'
import { useMinWidth } from '../hooks/useMediaQuery'
import {
  factionPalette,
  loadWarOrganMeta,
  woThemeStyle,
  type WoFactionPalette,
} from '../lib/warorgan-theme'
import {
  getWarOrganUnitDef,
  loadWarOrganBuilderBundle,
} from '../lib/warorgan-loader'
import type { WarOrganBuilderBundle } from '../types/warorgan'
import { formatWoDisplayName, reconcileRosterDetachments } from '../lib/warorgan-names'
import { validateWarOrganRoster } from '../lib/warorgan-validation'
import {
  convertWoArmyListToRoster,
  exportWoArmyList,
  exportWoListText,
  parseImportedListJson,
} from '../lib/warorgan-import-export'
import { parseWoLineMeta, setWarlordOnLine } from '../lib/warorgan-roster'
import {
  addUnit,
  canAddUnit,
  BATTLE_SIZE_LIMITS,
  createEmptyRoster,
  displayUnitPoints,
  duplicateRosterLine,
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
type UnitsPane = 'catalog' | 'army'

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
  const [loadingFaction, setLoadingFaction] = useState<string | null>(null)
  const [factionError, setFactionError] = useState<string | null>(null)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStep>('allegiance')
  const [allegiance, setAllegiance] = useState<Allegiance | null>(null)
  const [query, setQuery] = useState('')
  const [showLegends, setShowLegends] = useState(false)
  const [detailUnit, setDetailUnit] = useState<CuratedUnit | null>(null)
  const [editEntry, setEditEntry] = useState<RosterLineEntry | null>(null)
  const [rosterViewUnit, setRosterViewUnit] = useState<CuratedUnit | null>(null)
  const [loadouts, setLoadouts] = useState<FactionLoadouts>({})
  const [woBundle, setWoBundle] = useState<WarOrganBuilderBundle | null>(null)
  const [builderTab, setBuilderTab] = useState<BuilderTab>('units')
  const [unitsPane, setUnitsPane] = useState<UnitsPane>('catalog')
  const [previewUnit, setPreviewUnit] = useState<CuratedUnit | null>(null)
  const [woPalette, setWoPalette] = useState<WoFactionPalette | null>(null)
  const [detachmentSheetOpen, setDetachmentSheetOpen] = useState(false)
  const [issuesOpen, setIssuesOpen] = useState(false)
  const isDesktopBuilder = useMinWidth(1024)

  useEffect(() => {
    if (!isNewRoute) return
    setSetupComplete(false)
    setSetupStep('allegiance')
    setRoster(null)
    setAllegiance(null)
    setArmyEntry(undefined)
    setWoBundle(null)
    setCatalog([])
    setEnhancements([])
    setLoadouts({})
    setFactionError(null)
    setLoadingFaction(null)
    setLoading(false)
    setQuery('')
    setDetailUnit(null)
    setEditEntry(null)
    setRosterViewUnit(null)
    setPreviewUnit(null)
    setBuilderTab('units')
    setUnitsPane('catalog')
    setDetachmentSheetOpen(false)
    setIssuesOpen(false)
  }, [isNewRoute, id])

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
        const bundle = await loadWarOrganBuilderBundle(existing.army)
        if (cancelled) return
        setCatalog(data.units)
        setEnhancements(data.enhancements)
        setWoBundle(bundle)
        if (!data.warOrgan) {
          const loadoutData = await loadFactionLoadouts(existing.army)
          if (!cancelled) setLoadouts(loadoutData)
        } else {
          setLoadouts({})
        }
        if (cancelled) return
        const reconciled =
          bundle && existing.detachments.length
            ? reconcileRosterDetachments(existing, bundle)
            : existing
        setRoster(refreshRoster(reconciled, data.units, bundle?.unitDefs, data.enhancements))
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

  useEffect(() => {
    let cancelled = false
    void loadWarOrganMeta().then((meta) => {
      if (cancelled || !roster) return
      setWoPalette(factionPalette(meta, roster.army))
    })
    return () => {
      cancelled = true
    }
  }, [roster?.army])

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

  const issues = useMemo(() => {
    if (!roster) return []
    if (woBundle) return validateWarOrganRoster(roster, catalog, woBundle)
    return validateRoster(roster, catalog)
  }, [roster, catalog, woBundle])

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
    const base =
      woBundle && next.detachments.length
        ? reconcileRosterDetachments(next, woBundle)
        : next
    const updated = refreshRoster(base, catalog, woBundle?.unitDefs, enhancements)
    setRoster(updated)
    saveRoster(updated)
  }

  function handleAllegiance(a: Allegiance) {
    if (allegiance !== a) setRoster(null)
    setAllegiance(a)
    setFactionError(null)
    setSetupStep('faction')
  }

  async function handleFaction(armyName: string) {
    setFactionError(null)
    setLoadingFaction(armyName)
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

      setArmyEntry(undefined)
      setRoster(r)
      setSetupStep('detachment')

      const data = await loadFactionCatalog(armyName)
      const bundle = await loadWarOrganBuilderBundle(armyName)
      const refreshed = refreshRoster(r, data.units, bundle?.unitDefs, data.enhancements)
      const entry = await loadArmyEntryForBuilder(armyName, findArmyForBuilder(armyName))

      setCatalog(data.units)
      setEnhancements(data.enhancements)
      setWoBundle(bundle)
      if (!data.warOrgan) {
        const loadoutData = await loadFactionLoadouts(armyName)
        setLoadouts(loadoutData)
      } else {
        setLoadouts({})
      }
      setArmyEntry(entry)
      setRoster(refreshed)
      saveRoster(refreshed)
    } catch {
      setFactionError(copy.armyLists.loadError)
      setSetupStep('faction')
    } finally {
      setLoadingFaction(null)
    }
  }

  function finishSetup() {
    setSetupComplete(true)
    if (roster && isNewRoute) navigate(`/lists/${roster.id}`, { replace: true })
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

  function exportWoJson() {
    if (!roster || !woBundle) return
    const blob = new Blob([JSON.stringify(exportWoArmyList(roster, woBundle, catalog), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${roster.name.replace(/\s+/g, '-').toLowerCase()}-army-list.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importFromClipboard() {
    void navigator.clipboard.readText().then((text) => {
      const parsed = parseImportedListJson(text)
      if (!parsed || !roster) {
        alert(copy.armyLists.importError)
        return
      }
      if ('units' in parsed && parsed.army === roster.army) {
        persist(parsed)
        return
      }
      if (woBundle && 'Units' in parsed) {
        const converted = convertWoArmyListToRoster(parsed, woBundle, roster)
        if (converted) {
          if (converted.skippedUnits.length > 0) {
            console.warn('Import skipped units:', converted.skippedUnits)
          }
          persist(refreshRoster(converted.roster, catalog, woBundle.unitDefs, enhancements))
          return
        }
      }
      alert(copy.armyLists.importError)
    })
  }

  function handleDelete() {
    if (!roster || isNewRoute) return
    if (!window.confirm(copy.armyLists.deleteConfirm)) return
    deleteRoster(roster.id)
    navigate('/lists')
  }

  if (loading && !setupComplete) {
    return (
      <PageLoading
        label={isNewRoute ? copy.armyLists.loading : copy.armyLists.loadingDetachments}
      />
    )
  }

  if (!setupComplete && loadingFaction) {
    return (
      <PageLoading label={`${copy.armyLists.loadingDetachments} — ${loadingFaction}`} />
    )
  }

  if (!setupComplete) {
    return (
      <>
        <ListSetupWizard
          step={setupStep}
          allegiance={allegiance}
          roster={roster}
          armyEntry={armyEntry}
          dpUsed={dpUsed}
          loadingFaction={loadingFaction}
          factionError={factionError}
          onAllegiance={handleAllegiance}
          onFaction={(army) => void handleFaction(army)}
          onStep={setSetupStep}
          onPersist={persist}
          onComplete={finishSetup}
          detachmentsRaw={woBundle?.detachmentsRaw}
          catalogEnhancements={enhancements}
        />
      </>
    )
  }

  if (!roster) return <PageLoading label={copy.armyLists.loading} />

  const limit = BATTLE_SIZE_LIMITS[roster.battleSize]
  const overLimit = roster.pointsTotal > limit
  const rosterUnitCount = roster.units.length
  const issueErrors = issues.filter((i) => i.level === 'error')
  const issueWarnings = issues.filter((i) => i.level === 'warning')
  const issueBadgeCount = issueErrors.length || issueWarnings.length

  function handleEditLine(entry: RosterLineEntry) {
    const woUnit = woBundle ? getWarOrganUnitDef(woBundle, entry.catalog.id) : undefined
    if (woUnit) {
      setRosterViewUnit(null)
      setEditEntry(entry)
      return
    }
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
    <div
      className="bf-viewport bf-builder wo-builder -mx-2"
      style={woThemeStyle(woPalette) as CSSProperties}
    >
      <header className="wo-builder-header shrink-0 px-2 py-2">
        <div className="flex items-center gap-2">
          <WoBuilderMenu
            showLegends={showLegends}
            hasLegendsUnits={hasLegendsUnits}
            onToggleLegends={() => setShowLegends((v) => !v)}
            onOpenDetachments={() => setDetachmentSheetOpen(true)}
            onOpenStratagems={() => setDetachmentSheetOpen(true)}
            onExportJson={exportJson}
            onExportWoJson={woBundle ? exportWoJson : undefined}
            onImportWo={woBundle ? importFromClipboard : undefined}
            onCopyText={() =>
              void navigator.clipboard.writeText(
                woBundle
                  ? exportWoListText(roster, woBundle, catalog)
                  : rosterSummaryText(roster, catalog),
              )
            }
            onDelete={!isNewRoute ? handleDelete : undefined}
          />
          <div className="min-w-0 flex-1">
            <input
              value={roster.name}
              onChange={(e) => persist({ ...roster, name: e.target.value })}
              className="wo-builder-name w-full truncate bg-transparent outline-none"
            />
            <p className="truncate text-micro uppercase tracking-widest text-muted">{roster.army}</p>
          </div>
          <div className="wo-builder-points shrink-0 text-right">
            {issueBadgeCount > 0 && (
              <button
                type="button"
                className={`wo-validation-btn${issueErrors.length ? ' is-error' : ' is-warning'}`}
                aria-expanded={issuesOpen}
                onClick={() => setIssuesOpen((o) => !o)}
              >
                {issueBadgeCount}
              </button>
            )}
            <p className={`wo-builder-points-total tabular-nums ${overLimit ? 'is-over' : ''}`}>
              {roster.pointsTotal.toLocaleString()}
            </p>
            <p className="wo-builder-points-limit tabular-nums">/ {limit.toLocaleString()}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetachmentSheetOpen(true)}
          className="wo-builder-detachment mt-2 flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-widest text-muted">
              {copy.armyLists.tabDetachments}
            </p>
            <p className="truncate text-caption font-medium text-bone">
              {roster.detachments.length > 0
                ? roster.detachments.map((d) => formatWoDisplayName(d.name)).join(' · ')
                : copy.armyLists.noDetachment}
            </p>
          </div>
          <span className="shrink-0 text-micro font-semibold uppercase tracking-wide text-[var(--wo-accent)]">
            {copy.armyLists.changeDetachment}
          </span>
        </button>

        <WoBuilderTabs
          active={builderTab}
          onUnits={() => setBuilderTab('units')}
          onEnhancements={() => setBuilderTab('enhancements')}
        />
      </header>

      {issuesOpen && issues.length > 0 && (
        <div className="wo-issues-panel shrink-0 px-2 pb-1">
          {issues.map((issue) => (
            <p
              key={issue.message}
              className={issue.level === 'error' ? 'wo-issues-item is-error' : 'wo-issues-item'}
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}

      {builderTab === 'units' && (
        <>
          <div className="shrink-0 px-2 lg:hidden">
            <WoPaneTabs
              active={unitsPane}
              onCatalog={() => setUnitsPane('catalog')}
              onArmy={() => setUnitsPane('army')}
              armyCount={rosterUnitCount}
            />
          </div>
          <div
            className={`bf-split min-h-0 flex-1 overflow-hidden bf-split--pane-${unitsPane}${isDesktopBuilder ? ' bf-split--wo-desktop' : ''}`}
          >
            <CatalogPanel
              groups={catalogGroups}
              query={query}
              battleSize={roster.battleSize}
              selectedUnitId={previewUnit?.id}
              rosterCountById={rosterCountById}
              onQuery={setQuery}
              onOpen={(u) => {
                setRosterViewUnit(null)
                setEditEntry(null)
                setPreviewUnit(u)
                if (!isDesktopBuilder) setDetailUnit(u)
              }}
              onQuickAdd={(u) => {
                const woUnit = woBundle ? getWarOrganUnitDef(woBundle, u.id) : undefined
                persist(addUnit(roster, u, 1, woUnit))
                setUnitsPane('army')
              }}
            />
            {isDesktopBuilder && (
              <div className="bf-split-panel bf-split-panel--info">
                <WoUnitInfoPanel
                unit={previewUnit}
                roster={roster}
                rosterCount={previewUnit ? (rosterCountById.get(previewUnit.id) ?? 0) : 0}
                enhancementNames={enhancementNames}
                onAdd={() => {
                  if (!previewUnit) return
                  const woUnit = woBundle ? getWarOrganUnitDef(woBundle, previewUnit.id) : undefined
                  if (canAddUnit(roster, previewUnit)) {
                    persist(addUnit(roster, previewUnit, 1, woUnit))
                  }
                }}
                />
              </div>
            )}
            <RosterPanel
              roster={roster}
              groups={rosterGroups}
              unitCount={rosterUnitCount}
              bucketPoints={rosterPointsByBucket}
              pointsTotal={roster.pointsTotal}
              onRemoveLine={(lineId) => persist(removeRosterLine(roster, lineId))}
              onDuplicateLine={(entry) => {
                if (canAddUnit(roster, entry.catalog)) {
                  persist(duplicateRosterLine(roster, entry.line.lineId!, entry.catalog))
                }
              }}
              onEditLine={handleEditLine}
            />
          </div>
        </>
      )}

      {builderTab === 'enhancements' && (
        <div className="bf-scroll wo-enhancements-scroll px-2 py-2">
          {woBundle ? (
            <WoEnhancementsPanel roster={roster} enhancements={visibleEnhancements} />
          ) : (
            <EnhancementsPanel roster={roster} enhancements={visibleEnhancements} onPersist={persist} />
          )}
        </div>
      )}

      <WarOrganUnitEditSheet
        line={editEntry?.line ?? null}
        unit={editEntry?.catalog ?? null}
        woUnit={
          editEntry && woBundle ? getWarOrganUnitDef(woBundle, editEntry.catalog.id) ?? null : null
        }
        rosterUnits={roster.units}
        unitDefs={woBundle?.unitDefs}
        enhancements={enhancements}
        detachmentNames={roster.detachments.map((d) => d.name)}
        open={Boolean(
          editEntry && woBundle && getWarOrganUnitDef(woBundle, editEntry.catalog.id),
        )}
        instanceIndex={
          editEntry
            ? roster.units.filter((u) => u.unitId === editEntry.catalog.id).findIndex(
                (u) => u.lineId === editEntry.line.lineId,
              ) + 1
            : 1
        }
        enhancementNames={enhancementNames}
        onClose={() => setEditEntry(null)}
        onSave={(patch) => {
          if (!editEntry?.line.lineId) return
          let units = roster.units.map((line) =>
            line.lineId === editEntry.line.lineId ? { ...line, ...patch } : line,
          )
          if (patch.clearOtherWarlord) {
            units = setWarlordOnLine(units, editEntry.line.lineId!, true)
          }
          persist(refreshRoster({ ...roster, units }, catalog, woBundle?.unitDefs, enhancements))
        }}
      />

      <RosterUnitEditSheet
        line={editEntry?.line ?? null}
        unit={editEntry?.catalog ?? null}
        loadout={editEntry ? (loadouts[editEntry.catalog.id] ?? null) : null}
        open={Boolean(
          editEntry &&
            (!woBundle || !getWarOrganUnitDef(woBundle, editEntry.catalog.id)) &&
            unitHasEditableLoadout(editEntry.catalog, loadouts[editEntry.catalog.id] ?? null),
        )}
        enhancementNames={enhancementNames}
        onClose={() => setEditEntry(null)}
        onSave={(patch) => {
          if (!editEntry?.line.lineId) return
          persist(
            updateRosterLine(
              roster,
              editEntry.line.lineId,
              patch,
              catalog,
              woBundle?.unitDefs,
              enhancements,
            ),
          )
        }}
      />

      <UnitDetailSheet
        unit={isDesktopBuilder ? detailUnit : sheetUnit}
        open={Boolean(isDesktopBuilder ? detailUnit : sheetUnit)}
        enhancementNames={enhancementNames}
        onClose={closeUnitSheets}
        showAdd={Boolean(detailUnit)}
        onAdd={() => {
          if (detailUnit && canAddUnit(roster, detailUnit)) {
            const woUnit = woBundle ? getWarOrganUnitDef(woBundle, detailUnit.id) : undefined
            persist(addUnit(roster, detailUnit, 1, woUnit))
          }
        }}
        addDisabled={detailUnit ? !canAddUnit(roster, detailUnit) : false}
        inRoster={detailUnit ? rosterCountById.get(detailUnit.id) : undefined}
        maxCopies={detailUnit ? maxCopiesForUnit(detailUnit, roster.battleSize) : undefined}
      />

      <DetachmentSheet
        roster={roster}
        armyEntry={armyEntry}
        woBundle={woBundle}
        dpUsed={dpUsed}
        open={detachmentSheetOpen}
        onClose={() => setDetachmentSheetOpen(false)}
        onPersist={persist}
        catalogEnhancements={enhancements}
      />
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
  battleSize,
  selectedUnitId,
  rosterCountById,
  onQuery,
  onOpen,
  onQuickAdd,
}: {
  groups: { bucket: UnitBucketId; units: CuratedUnit[] }[]
  query: string
  battleSize: ArmyRoster['battleSize']
  selectedUnitId?: string
  rosterCountById: Map<string, number>
  onQuery: (q: string) => void
  onOpen: (u: CuratedUnit) => void
  onQuickAdd: (u: CuratedUnit) => void
}) {
  return (
    <div className="bf-split-panel bf-split-panel--catalog">
      <div className="bf-panel-head-row">
        <p className="bf-panel-head">{copy.armyLists.panelCatalog}</p>
        <p className="bf-panel-sub">{copy.armyLists.catalogStep}</p>
      </div>
      <div className="bf-catalog-search px-2 pb-2 pt-2">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={copy.armyLists.searchUnits}
          className="bf-catalog-search-input"
        />
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
            const maxCopies = maxCopiesForUnit(u, battleSize)
            const atMax = inArmy >= maxCopies
            const pts = displayUnitPoints(u)
            return (
              <div className={`bf-catalog-card${selectedUnitId === u.id ? ' is-selected' : ''}`}>
                <button
                  type="button"
                  className="bf-catalog-card-body"
                  onClick={() => onOpen(u)}
                >
                  <p className="bf-catalog-card-name">{formatWoDisplayName(u.name)}</p>
                  {inArmy > 0 && (
                    <p className="bf-catalog-card-meta">
                      {copy.armyLists.unitInArmy(inArmy, maxCopies)}
                    </p>
                  )}
                </button>
                <div className="bf-catalog-card-actions">
                  <span className="bf-catalog-card-pts tabular-nums">{pts}</span>
                  <button
                    type="button"
                    className="bf-catalog-add"
                    aria-label={copy.armyLists.addUnit}
                    disabled={atMax}
                    onClick={() => onQuickAdd(u)}
                  >
                    +
                  </button>
                </div>
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
  rosterUnits,
  canDuplicate,
  onEdit,
  onRemove,
  onDuplicate,
}: {
  line: RosterLineEntry['line']
  rosterUnits: RosterLineEntry['line'][]
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
  const meta = parseWoLineMeta(line.options)
  const attachTarget = meta.attachedToLineId
    ? rosterUnits.find((u) => u.lineId === meta.attachedToLineId)?.name
    : undefined
  const subParts = [
    loadoutSummary,
    meta.warlord ? copy.armyLists.warlord : '',
    meta.enhancementId ? formatWoDisplayName(meta.enhancementId) : '',
    meta.upgradeName ? formatWoDisplayName(meta.upgradeName) : '',
    attachTarget ? `→ ${formatWoDisplayName(attachTarget)}` : '',
  ].filter(Boolean)

  return (
    <div className="bf-roster-card">
      <button
        type="button"
        className="bf-roster-card-body"
        aria-label={copy.armyLists.viewUnit}
        onClick={onEdit}
      >
        <p className="bf-roster-card-name">
          {meta.warlord && (
            <span className="bf-warlord-crown" aria-label={copy.armyLists.warlord} title={copy.armyLists.warlord}>
              <svg viewBox="0 0 16 12" aria-hidden>
                <path fill="currentColor" d="M1 10h14v2H1v-2zm1.2-8 2.3 4.2L8 2.4l3.5 3.8L13.8 2 16 10H0L2.2 2z" />
              </svg>
            </span>
          )}
          <span className="truncate">{formatWoDisplayName(line.name)}</span>
        </p>
        {subParts.length > 0 ? (
          <p className="bf-roster-card-meta truncate">{subParts.join(' · ')}</p>
        ) : null}
      </button>
      <span className="bf-roster-card-pts tabular-nums">{line.points}</span>
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
  pointsTotal,
  onRemoveLine,
  onDuplicateLine,
  onEditLine,
}: {
  roster: ArmyRoster
  groups: ReturnType<typeof groupRosterLinesByBucket>
  unitCount: number
  bucketPoints: Map<UnitBucketId, number>
  pointsTotal: number
  onRemoveLine: (lineId: string) => void
  onDuplicateLine: (entry: RosterLineEntry) => void
  onEditLine: (entry: RosterLineEntry) => void
}) {
  return (
    <div className="bf-split-panel bf-split-panel--roster">
      <div className="bf-panel-head-row">
        <div className="min-w-0">
          <p className="bf-panel-head">
            {copy.armyLists.panelRoster}
            {unitCount > 0 && <span className="bf-panel-head-count"> ({unitCount})</span>}
          </p>
          <p className="bf-roster-head-meta truncate">{roster.name}</p>
        </div>
        <p className="bf-roster-head-pts tabular-nums">
          {pointsTotal.toLocaleString()} <span>pts</span>
        </p>
      </div>
      {roster.units.length === 0 ? (
        <p className="px-3 py-8 text-center text-caption text-muted">{copy.armyLists.emptyList}</p>
      ) : (
        <UnitBucketAccordion
          groups={groups.map((g) => ({ bucket: g.bucket, items: g.lines }))}
          expandAllDefault
          bucketPoints={bucketPoints}
          itemKey={(entry) => entry.line.lineId ?? `${entry.line.unitId}-${entry.line.points}`}
          renderItem={(entry) => (
            <RosterUnitRow
              line={entry.line}
              rosterUnits={roster.units}
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

function WoEnhancementsPanel({
  roster,
  enhancements,
}: {
  roster: ArmyRoster
  enhancements: { name: string; points: number; description: string }[]
}) {
  const assigned = roster.units
    .map((line) => {
      const meta = parseWoLineMeta(line.options)
      if (!meta.enhancementId) return null
      const enh = enhancements.find((e) => e.name === meta.enhancementId)
      return { line, enh }
    })
    .filter(Boolean) as { line: (typeof roster.units)[0]; enh: (typeof enhancements)[0] }[]

  return (
    <div className="space-y-3">
      <p className="text-caption text-muted">{copy.armyLists.enhancementsPerUnit}</p>
      {assigned.length === 0 ? (
        <p className="text-body text-muted">{copy.armyLists.noEnhancements}</p>
      ) : (
        assigned.map(({ line, enh }) => (
          <div key={line.lineId} className="wo-enh-card">
            <p className="text-body font-medium text-bone">
              {formatWoDisplayName(enh.name)}{' '}
              <span className="text-muted">on {formatWoDisplayName(line.name)}</span>
            </p>
            <p className="text-caption tabular-nums text-accent-dim">{enh.points} pts</p>
            <p className="mt-1 line-clamp-3 text-caption text-muted">{enh.description}</p>
          </div>
        ))
      )}
      {enhancements.length > 0 && assigned.length < enhancements.length && (
        <details className="wo-enh-card">
          <summary className="cursor-pointer text-caption text-muted">
            All detachment enhancements ({enhancements.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {enhancements.map((e) => (
              <li key={e.name} className="text-micro text-muted">
                <span className="text-bone">{formatWoDisplayName(e.name)}</span> — {e.points} pts
              </li>
            ))}
          </ul>
        </details>
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
              className={`wo-enh-card w-full text-left${on ? ' is-active' : ''}`}
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
