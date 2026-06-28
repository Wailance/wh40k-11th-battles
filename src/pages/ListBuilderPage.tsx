import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DetachmentSheet, type DetachmentSheetSection } from '../components/DetachmentSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NoticeDialog } from '../components/NoticeDialog'
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
import { BuilderToast, WoBuilderMobileDock, WoBuilderTabs } from '../components/WoBuilderTabs'
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
import { formatWoDisplayName, reconcileRosterDetachments, woNamesMatch } from '../lib/warorgan-names'
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
  applyBattleSizeChange,
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
  const [detachmentSheetSection, setDetachmentSheetSection] =
    useState<DetachmentSheetSection>('detachments')
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [addToast, setAddToast] = useState<{ message: string; kind: 'ok' | 'err' } | null>(null)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingFaction, setPendingFaction] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [confirmRemoveLineId, setConfirmRemoveLineId] = useState<string | null>(null)
  const [listNameDraft, setListNameDraft] = useState('')
  const prevErrorMessages = useRef(new Set<string>())
  const factionLoadGen = useRef(0)
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
        setLoadFailed(false)
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
        if (!cancelled) {
          setLoadFailed(true)
          setRoster(existing)
          setSetupComplete(true)
          setNotice({ title: copy.armyLists.loadError, body: copy.armyLists.loadError })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [id, isNewRoute, navigate, loadAttempt])

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

  const orphanLines = useMemo(() => {
    if (!roster) return []
    const catalogById = new Map(catalog.map((u) => [u.id, u]))
    return roster.units.filter((line) => !catalogById.has(line.unitId))
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
    const base = woBundle
      ? validateWarOrganRoster(roster, catalog, woBundle)
      : validateRoster(roster, catalog)
    if (orphanLines.length === 0) return base
    return [
      { level: 'error' as const, message: copy.armyLists.orphanUnits(orphanLines.length) },
      ...base,
    ]
  }, [roster, catalog, woBundle, orphanLines.length])

  useEffect(() => {
    const errorMessages = issues.filter((i) => i.level === 'error').map((i) => i.message)
    const current = new Set(errorMessages)
    const hasNew = errorMessages.some((m) => !prevErrorMessages.current.has(m))
    if (hasNew && errorMessages.length > 0) setIssuesOpen(true)
    prevErrorMessages.current = current
  }, [issues])

  useEffect(() => {
    if (roster) setListNameDraft(roster.name)
  }, [roster?.id, roster?.name])

  useEffect(() => {
    if (!roster || listNameDraft === roster.name) return
    const timer = window.setTimeout(() => {
      persist({ ...roster, name: listNameDraft })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [listNameDraft, roster?.id])

  useEffect(() => {
    if (!addToast) return
    const timer = window.setTimeout(() => setAddToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [addToast])

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

  function handleBattleSizeChange(size: ArmyRoster['battleSize']) {
    if (!roster || roster.battleSize === size) return
    const before = roster
    const next = applyBattleSizeChange(roster, size, catalog, { catalogEnhancements: enhancements })
    persist(refreshRoster(next, catalog, woBundle?.unitDefs, enhancements))
    const trimmed =
      next.detachments.length < before.detachments.length ||
      next.units.length < before.units.length ||
      next.enhancements.length < before.enhancements.length
    if (trimmed) {
      setAddToast({ message: copy.armyLists.battleSizeTrimmed, kind: 'ok' })
    }
  }

  async function applyFaction(armyName: string) {
    const gen = ++factionLoadGen.current
    const snapshot = {
      roster,
      armyEntry,
      catalog,
      enhancements,
      woBundle,
      loadouts,
      setupStep,
    }
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
      if (gen !== factionLoadGen.current) return
      const bundle = await loadWarOrganBuilderBundle(armyName)
      if (gen !== factionLoadGen.current) return
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
      if (isNewRoute) navigate(`/lists/${refreshed.id}`, { replace: true })
    } catch {
      if (gen !== factionLoadGen.current) return
      setRoster(snapshot.roster)
      setArmyEntry(snapshot.armyEntry)
      setCatalog(snapshot.catalog)
      setEnhancements(snapshot.enhancements)
      setWoBundle(snapshot.woBundle)
      setLoadouts(snapshot.loadouts)
      setSetupStep(snapshot.setupStep)
      setFactionError(copy.armyLists.loadError)
    } finally {
      if (gen === factionLoadGen.current) setLoadingFaction(null)
    }
  }

  function handleFaction(armyName: string) {
    if (roster && roster.army !== armyName && roster.units.length > 0) {
      setPendingFaction(armyName)
      return
    }
    void applyFaction(armyName)
  }

  function finishSetup() {
    setSetupComplete(true)
    if (roster && isNewRoute) navigate(`/lists/${roster.id}`, { replace: true })
  }

  function exportJson() {
    if (!roster) return
    try {
      const blob = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${roster.name.replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setAddToast({ message: copy.armyLists.exportSuccess, kind: 'ok' })
    } catch {
      setNotice({ title: copy.armyLists.loadError, body: copy.armyLists.loadError })
    }
  }

  function exportWoJson() {
    if (!roster || !woBundle) return
    try {
      const blob = new Blob([JSON.stringify(exportWoArmyList(roster, woBundle, catalog), null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${roster.name.replace(/\s+/g, '-').toLowerCase()}-army-list.json`
      a.click()
      URL.revokeObjectURL(url)
      setAddToast({ message: copy.armyLists.exportSuccess, kind: 'ok' })
    } catch {
      setNotice({ title: copy.armyLists.loadError, body: copy.armyLists.loadError })
    }
  }

  function importFromClipboard() {
    void navigator.clipboard
      .readText()
      .then((text) => {
      const parsed = parseImportedListJson(text)
      if (!parsed || !roster) {
        setNotice({ title: copy.armyLists.importError, body: copy.armyLists.importError })
        return
      }
      if ('units' in parsed && parsed.army === roster.army) {
        persist(parsed)
        setNotice({ title: copy.armyLists.importSuccess, body: copy.armyLists.importSuccess })
        return
      }
      if ('Units' in parsed) {
        if (!woBundle) {
          setNotice({ title: copy.armyLists.importError, body: copy.armyLists.importError })
          return
        }
        if (!parsed.FactionName || !woNamesMatch(parsed.FactionName, roster.army)) {
          setNotice({
            title: copy.armyLists.importError,
            body: copy.armyLists.importFactionMismatch(
              formatWoDisplayName(parsed.FactionName ?? 'Unknown'),
            ),
          })
          return
        }
        const converted = convertWoArmyListToRoster(parsed, woBundle, roster)
        if (converted) {
          persist(refreshRoster(converted.roster, catalog, woBundle.unitDefs, enhancements))
          if (converted.skippedUnits.length > 0) {
            const preview = converted.skippedUnits.slice(0, 3).join(', ')
            const suffix =
              converted.skippedUnits.length > 3
                ? ` +${converted.skippedUnits.length - 3} more`
                : ''
            setNotice({
              title: copy.armyLists.importSuccess,
              body: copy.armyLists.importSkipped(
                converted.skippedUnits.length,
                `${preview}${suffix}`,
              ),
            })
          } else {
            setNotice({ title: copy.armyLists.importSuccess, body: copy.armyLists.importSuccess })
          }
          return
        }
      }
      setNotice({ title: copy.armyLists.importError, body: copy.armyLists.importError })
    })
      .catch(() => {
        setNotice({ title: copy.armyLists.importError, body: copy.armyLists.clipboardDenied })
      })
  }

  function handleDelete() {
    if (!roster || isNewRoute) return
    setConfirmDelete(true)
  }

  function confirmDeleteList() {
    if (!roster || isNewRoute) return
    deleteRoster(roster.id)
    setConfirmDelete(false)
    navigate('/lists')
  }

  if (loading && !setupComplete) {
    return (
      <PageLoading
        label={isNewRoute ? copy.armyLists.loading : copy.armyLists.loadingDetachments}
      />
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
          onBattleSize={handleBattleSizeChange}
          onComplete={finishSetup}
          detachmentsRaw={woBundle?.detachmentsRaw}
          catalogEnhancements={enhancements}
        />
      </>
    )
  }

  if (!roster) return <PageLoading label={copy.armyLists.loading} />

  if (loadFailed) {
    return (
      <div className="app-panel mx-auto mt-6 max-w-md space-y-4 p-6 text-center">
        <p className="font-display text-body tracking-wide text-bone">{copy.armyLists.loadError}</p>
        <p className="text-caption text-muted">
          {roster.name} · {roster.army}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            className="app-btn py-3"
            onClick={() => {
              setLoadFailed(false)
              setLoading(true)
              setLoadAttempt((n) => n + 1)
            }}
          >
            {copy.armyLists.retryLoad}
          </button>
          <Link to="/lists" className="app-btn-ghost py-3">
            {copy.armyLists.back}
          </Link>
        </div>
      </div>
    )
  }

  const activeRoster = roster
  const limit = BATTLE_SIZE_LIMITS[activeRoster.battleSize]
  const overLimit = activeRoster.pointsTotal > limit
  const rosterUnitCount = activeRoster.units.length
  const issueErrors = issues.filter((i) => i.level === 'error')
  const issueWarnings = issues.filter((i) => i.level === 'warning')
  const issueBadgeCount = issueErrors.length + issueWarnings.length

  function handleQuickAdd(u: CuratedUnit) {
    const max = maxCopiesForUnit(u, activeRoster.battleSize)
    if (!canAddUnit(activeRoster, u)) {
      setAddToast({ message: copy.armyLists.unitAtMaxCopies(max), kind: 'err' })
      return
    }
    const woUnit = woBundle ? getWarOrganUnitDef(woBundle, u.id) : undefined
    persist(addUnit(activeRoster, u, 1, woUnit))
    setAddToast({ message: copy.armyLists.addedUnit(formatWoDisplayName(u.name)), kind: 'ok' })
  }

  function handleEditLine(entry: RosterLineEntry) {
    setPreviewUnit(null)
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
    setPreviewUnit(null)
    setEditEntry(null)
    setRosterViewUnit(null)
  }

  const sheetUnit = detailUnit ?? rosterViewUnit

  return (
    <div
      className={`bf-viewport bf-builder wo-builder -mx-2${
        !isDesktopBuilder && builderTab === 'units' ? ' wo-builder--mobile-dock' : ''
      }${!isDesktopBuilder && builderTab === 'enhancements' ? ' wo-builder--mobile-pad' : ''}`}
      style={woThemeStyle(woPalette) as CSSProperties}
    >
      <header className="wo-builder-header shrink-0 px-2 py-2">
        <div className="wo-builder-header-row">
          <Link to="/lists" className="wo-builder-my-lists">
            {copy.armyLists.myLists}
          </Link>

          <div className="wo-builder-header-main min-w-0 flex-1">
            <input
              value={listNameDraft}
              onChange={(e) => setListNameDraft(e.target.value)}
              className="wo-builder-name w-full bg-transparent outline-none"
            />
            <p className="truncate text-micro uppercase tracking-widest text-muted">{roster.army}</p>
          </div>

          <div className="wo-builder-header-end">
            <div className="wo-builder-points">
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
              <div className="flex flex-col items-end">
                <p className={`wo-builder-points-total tabular-nums ${overLimit ? 'is-over' : ''}`}>
                  {roster.pointsTotal.toLocaleString()}
                </p>
                <p className="wo-builder-points-limit tabular-nums">/ {limit.toLocaleString()}</p>
              </div>
            </div>

            <WoBuilderMenu
              showLegends={showLegends}
              hasLegendsUnits={hasLegendsUnits}
              onToggleLegends={() => setShowLegends((v) => !v)}
              onOpenStratagems={
                woBundle
                  ? () => {
                      setDetachmentSheetSection('reference')
                      setDetachmentSheetOpen(true)
                    }
                  : undefined
              }
              onExportJson={exportJson}
              onExportWoJson={woBundle ? exportWoJson : undefined}
              onImportWo={importFromClipboard}
              onCopyText={() => {
                const text = woBundle
                  ? exportWoListText(roster, woBundle, catalog)
                  : rosterSummaryText(roster, catalog)
                void navigator.clipboard.writeText(text).then(
                  () => setAddToast({ message: copy.armyLists.copiedListText, kind: 'ok' }),
                  () =>
                    setNotice({
                      title: copy.armyLists.importError,
                      body: copy.armyLists.clipboardDenied,
                    }),
                )
              }}
              onDelete={!isNewRoute ? handleDelete : undefined}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!armyEntry}
          aria-disabled={!armyEntry}
          onClick={() => {
            if (!armyEntry) {
              setNotice({
                title: copy.armyLists.loadError,
                body: copy.armyLists.detachmentUnavailable,
              })
              return
            }
            setDetachmentSheetSection('detachments')
            setDetachmentSheetOpen(true)
          }}
          className={`wo-builder-detachment mt-2 flex w-full items-center justify-between gap-3 text-left${!armyEntry ? ' is-disabled' : ''}`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-micro uppercase tracking-widest text-muted">
              {copy.armyLists.tabDetachments}
            </p>
            <p className="truncate text-caption font-medium text-bone">
              {roster.detachments.length > 0
                ? roster.detachments.map((d) => formatWoDisplayName(d.name)).join(' · ')
                : copy.armyLists.noDetachment}
            </p>
          </div>
          <span className="wo-builder-detachment-action">
            {roster.detachments.length > 0
              ? copy.armyLists.changeDetachment
              : copy.armyLists.selectDetachment}
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
          <div className="wo-issues-head">
            <span>{copy.armyLists.validationIssues}</span>
            <button
              type="button"
              className="wo-issues-close"
              aria-label={copy.common.close}
              onClick={() => setIssuesOpen(false)}
            >
              ×
            </button>
          </div>
          {issues.map((issue, idx) => (
            <p
              key={`${issue.level}-${idx}-${issue.message}`}
              className={issue.level === 'error' ? 'wo-issues-item is-error' : 'wo-issues-item'}
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}

      {builderTab === 'units' && (
        <>
          <div
            className={`bf-split min-h-0 flex-1 overflow-hidden${isDesktopBuilder ? ' bf-split--desktop' : ` bf-split--pane-${unitsPane}`}`}
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
                setDetailUnit(u)
              }}
              onQuickAdd={handleQuickAdd}
            />
            <RosterPanel
              roster={roster}
              groups={rosterGroups}
              orphanLines={orphanLines}
              unitCount={rosterUnitCount}
              bucketPoints={rosterPointsByBucket}
              pointsTotal={roster.pointsTotal}
              compact={!isDesktopBuilder}
              onRemoveLine={(lineId) => setConfirmRemoveLineId(lineId)}
              onDuplicateLine={(entry) => {
                if (!canAddUnit(roster, entry.catalog)) {
                  setAddToast({
                    message: copy.armyLists.unitAtMaxCopies(
                      maxCopiesForUnit(entry.catalog, roster.battleSize),
                    ),
                    kind: 'err',
                  })
                  return
                }
                persist(duplicateRosterLine(roster, entry.line.lineId!, entry.catalog))
                setAddToast({
                  message: copy.armyLists.duplicatedUnit(formatWoDisplayName(entry.line.name)),
                  kind: 'ok',
                })
              }}
              onEditLine={handleEditLine}
            />
          </div>
          {!isDesktopBuilder && (
            <WoBuilderMobileDock
              active={unitsPane}
              armyCount={rosterUnitCount}
              onCatalog={() => setUnitsPane('catalog')}
              onArmy={() => setUnitsPane('army')}
            />
          )}
        </>
      )}

      {builderTab === 'enhancements' && (
        <div className="bf-scroll wo-enhancements-scroll px-2 py-2">
          {woBundle ? (
            <WoEnhancementsPanel
              roster={roster}
              enhancements={visibleEnhancements}
              catalog={catalog}
              onEditLine={handleEditLine}
            />
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
        detachmentsRaw={woBundle?.detachmentsRaw}
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
        unit={sheetUnit}
        open={Boolean(sheetUnit)}
        enhancementNames={enhancementNames}
        onClose={closeUnitSheets}
        showAdd={Boolean(detailUnit && sheetUnit?.id === detailUnit.id)}
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
        section={detachmentSheetSection}
        onSectionChange={setDetachmentSheetSection}
        open={detachmentSheetOpen}
        onClose={() => setDetachmentSheetOpen(false)}
        onPersist={persist}
        onBattleSize={handleBattleSizeChange}
        catalogEnhancements={enhancements}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? ''}
        body={notice?.body ?? ''}
        onClose={() => setNotice(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={copy.armyLists.deleteConfirm}
        body={copy.armyLists.deleteConfirm}
        confirmLabel={copy.armyLists.deleteList}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteList}
      />

      <ConfirmDialog
        open={Boolean(pendingFaction)}
        title={copy.armyLists.factionChangeTitle}
        body={copy.armyLists.factionChangeBody}
        confirmLabel={copy.armyLists.factionChangeConfirm}
        danger
        onCancel={() => setPendingFaction(null)}
        onConfirm={() => {
          const army = pendingFaction
          setPendingFaction(null)
          if (army) void applyFaction(army)
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmRemoveLineId)}
        title={copy.armyLists.removeUnitConfirm}
        body={copy.armyLists.removeUnitConfirm}
        confirmLabel={copy.armyLists.deleteUnit}
        danger
        onCancel={() => setConfirmRemoveLineId(null)}
        onConfirm={() => {
          if (confirmRemoveLineId) persist(removeRosterLine(roster, confirmRemoveLineId))
          setConfirmRemoveLineId(null)
        }}
      />

      <BuilderToast toast={addToast} />
    </div>
  )
}

function UnitBucketAccordion<T>({
  groups,
  query,
  bucketPoints,
  openBucketsWithItems,
  defaultExpandAll,
  itemKey,
  renderItem,
}: {
  groups: { bucket: UnitBucketId; items: T[] }[]
  query?: string
  bucketPoints?: Map<UnitBucketId, number>
  openBucketsWithItems?: boolean
  defaultExpandAll?: boolean
  itemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}) {
  const [openBuckets, setOpenBuckets] = useState<Set<UnitBucketId>>(() => new Set())
  const groupKey = groups.map((g) => g.bucket).join(',')
  const prevGroupKey = useRef('')

  useEffect(() => {
    if (groupKey !== prevGroupKey.current) {
      prevGroupKey.current = groupKey
      if (defaultExpandAll) {
        setOpenBuckets(new Set(groups.map((g) => g.bucket)))
      } else if (openBucketsWithItems) {
        setOpenBuckets(new Set(groups.filter((g) => g.items.length > 0).map((g) => g.bucket)))
      } else {
        setOpenBuckets(new Set())
      }
    }
  }, [groupKey, groups, openBucketsWithItems, defaultExpandAll])

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
          defaultExpandAll
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
        <div className="bf-roster-card-actions">
          <button
            type="button"
            className="bf-roster-duplicate"
            aria-label={copy.armyLists.duplicateUnit}
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            ⧉
          </button>
          <button
            type="button"
            className="bf-roster-delete"
            aria-label={copy.armyLists.deleteUnit}
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

function RosterPanel({
  roster,
  groups,
  orphanLines,
  unitCount,
  bucketPoints,
  pointsTotal,
  compact,
  onRemoveLine,
  onDuplicateLine,
  onEditLine,
}: {
  roster: ArmyRoster
  groups: ReturnType<typeof groupRosterLinesByBucket>
  orphanLines: ArmyRoster['units']
  unitCount: number
  bucketPoints: Map<UnitBucketId, number>
  pointsTotal: number
  compact?: boolean
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
          <p className="bf-roster-head-meta truncate">{roster.army}</p>
        </div>
        <p className="bf-roster-head-pts tabular-nums">
          {pointsTotal.toLocaleString()} <span>pts</span>
        </p>
      </div>
      {roster.units.length === 0 ? (
        <p className="px-3 py-8 text-center text-caption text-muted">
          {compact ? copy.armyLists.emptyListMobile : copy.armyLists.emptyList}
        </p>
      ) : (
        <>
          {orphanLines.length > 0 && (
            <div className="bf-orphan-section px-2 pb-2">
              {orphanLines.map((line) => (
                <div key={line.lineId ?? `${line.unitId}-${line.points}`} className="bf-roster-card">
                  <div className="bf-roster-card-body min-w-0">
                    <p className="bf-roster-card-name">
                      <span className="truncate">{formatWoDisplayName(line.name)}</span>
                    </p>
                    <p className="bf-roster-card-meta truncate">{copy.armyLists.orphanUnits(1)}</p>
                  </div>
                  <span className="bf-roster-card-pts tabular-nums">{line.points}</span>
                  {line.lineId && (
                    <div className="bf-roster-card-actions">
                      <button
                        type="button"
                        className="bf-roster-delete"
                        aria-label={copy.armyLists.deleteUnit}
                        onClick={() => onRemoveLine(line.lineId!)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <UnitBucketAccordion
            openBucketsWithItems
            groups={groups.map((g) => ({ bucket: g.bucket, items: g.lines }))}
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
        </>
      )}
    </div>
  )
}

function WoEnhancementsPanel({
  roster,
  enhancements,
  catalog,
  onEditLine,
}: {
  roster: ArmyRoster
  enhancements: { name: string; points: number; description: string }[]
  catalog: CuratedUnit[]
  onEditLine: (entry: RosterLineEntry) => void
}) {
  const catalogById = useMemo(() => new Map(catalog.map((u) => [u.id, u])), [catalog])

  const assigned = roster.units
    .map((line) => {
      const meta = parseWoLineMeta(line.options)
      if (!meta.enhancementId) return null
      const enh = enhancements.find((e) => e.name === meta.enhancementId)
      const cu = catalogById.get(line.unitId)
      if (!enh || !cu) return null
      return { line, enh, catalog: cu }
    })
    .filter(Boolean) as {
    line: (typeof roster.units)[0]
    enh: (typeof enhancements)[0]
    catalog: CuratedUnit
  }[]

  return (
    <div className="space-y-3">
      <p className="text-caption text-muted">{copy.armyLists.enhancementsPerUnit}</p>
      {assigned.length === 0 ? (
        <p className="text-body text-muted">{copy.armyLists.noEnhancements}</p>
      ) : (
        assigned.map(({ line, enh, catalog: cu }) => (
          <button
            key={line.lineId}
            type="button"
            className="wo-enh-card w-full text-left"
            onClick={() => onEditLine({ line, catalog: cu })}
          >
            <p className="text-body font-medium text-bone">
              {formatWoDisplayName(enh.name)}{' '}
              <span className="text-muted">on {formatWoDisplayName(line.name)}</span>
            </p>
            <p className="text-caption tabular-nums text-accent-dim">{enh.points} pts</p>
            <p className="mt-1 line-clamp-3 text-caption text-muted">{enh.description}</p>
          </button>
        ))
      )}
      {enhancements.length > 0 && assigned.length < enhancements.length && (
        <details className="wo-enh-card">
          <summary className="cursor-pointer text-caption text-muted">
            {copy.armyLists.allDetachmentEnhancements(enhancements.length)}
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
