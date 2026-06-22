import type { Enhancement } from '../types/faction-data'
import type { Detachment, ForceDisposition } from '../types/game'
import type { WarOrganBuilderBundle, WoFactionData, WoUnit } from '../types/warorgan'
import { isCodexChapter, MFM_SPACE_MARINES_ARMY } from './space-marine-chapters'
import { publicUrl } from './public-url'
import { warOrganFactionFile, warOrganUnitId } from './warorgan-army-map'
import { woUnitToCurated } from './warorgan-catalog'

const factionCache = new Map<string, WoFactionData>()
let metaVersion: string | null = null

async function loadMetaVersion(): Promise<string> {
  if (metaVersion) return metaVersion
  try {
    const res = await fetch(publicUrl('/data/warorgan/meta.json'))
    if (!res.ok) return 'unknown'
    const data = (await res.json()) as { Version?: string }
    metaVersion = data.Version ?? 'unknown'
    return metaVersion
  } catch {
    return 'unknown'
  }
}

function legendsFileName(mainFile: string): string {
  return mainFile.replace(/\.json$/, ' Legends.json')
}

async function loadFactionJson(file: string): Promise<WoFactionData | null> {
  const cached = factionCache.get(file)
  if (cached) return cached
  const res = await fetch(publicUrl(`/data/warorgan/factions/${encodeURIComponent(file)}`))
  if (!res.ok) return null
  let data: WoFactionData
  try {
    const text = await res.text()
    const trimmed = text.trimStart()
    if (!trimmed.startsWith('{')) return null
    data = JSON.parse(trimmed) as WoFactionData
  } catch {
    return null
  }
  factionCache.set(file, data)
  return data
}

export async function warOrganDataAvailable(army: string): Promise<boolean> {
  const file = warOrganFactionFile(army)
  if (!file) return false
  try {
    const res = await fetch(publicUrl(`/data/warorgan/factions/${encodeURIComponent(file)}`), {
      method: 'HEAD',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function loadWarOrganFaction(army: string): Promise<WoFactionData | null> {
  const file = warOrganFactionFile(army)
  if (!file) return null
  return loadFactionJson(file)
}

async function loadLegendsUnits(mainFile: string): Promise<WoUnit[]> {
  const legFile = legendsFileName(mainFile)
  const data = await loadFactionJson(legFile)
  if (!data?.Units?.length) return []
  return data.Units.map((u) => ({ ...u, Legends: true }))
}

function woDetachmentToGame(d: WoFactionData['Dettachments'][number]): Detachment {
  const fd = (d.ForceDispositions[0] ?? 'TAKE AND HOLD') as ForceDisposition
  return {
    name: d.Name,
    dp: d.Cost ?? 1,
    note: d.Rule?.Title ?? d.Rule?.Text?.slice(0, 120) ?? '',
    forceDisposition: fd,
  }
}

function collectEnhancements(faction: WoFactionData): Enhancement[] {
  const seen = new Set<string>()
  const out: Enhancement[] = []
  for (const det of faction.Dettachments) {
    for (const e of det.Enhancements ?? []) {
      if (seen.has(e.Name)) continue
      seen.add(e.Name)
      out.push({
        name: e.Name,
        points: e.Cost,
        description: e.Description,
        detachment: det.Name,
        ...e,
      } as Enhancement)
    }
  }
  return out
}

function mergeEnhancements(primary: Enhancement[], extra: Enhancement[]): Enhancement[] {
  const byName = new Map(extra.map((e) => [e.name, e]))
  for (const e of primary) byName.set(e.name, e)
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function mergeCodexChapterBundle(
  chapter: WarOrganBuilderBundle,
  sm: WarOrganBuilderBundle,
): WarOrganBuilderBundle {
  const unitDefs = new Map(sm.unitDefs)
  for (const [id, unit] of chapter.unitDefs) unitDefs.set(id, unit)

  const unitsById = new Map(sm.units.map((u) => [u.id, u]))
  for (const u of chapter.units) unitsById.set(u.id, u)
  const units = [...unitsById.values()].sort((a, b) => a.name.localeCompare(b.name))

  const detachmentsByName = new Map(sm.detachments.map((d) => [d.name, d]))
  for (const d of chapter.detachments) detachmentsByName.set(d.name, d)
  const detachments = [...detachmentsByName.values()].sort((a, b) => a.name.localeCompare(b.name))

  const rawByName = new Map(sm.detachmentsRaw.map((d) => [d.Name, d]))
  for (const d of chapter.detachmentsRaw) rawByName.set(d.Name, d)
  const detachmentsRaw = [...rawByName.values()].sort((a, b) => a.Name.localeCompare(b.Name))

  const armyRuleKeys = new Set(sm.armyRules.map((r) => r.Title ?? ''))
  const armyRules = [...sm.armyRules]
  for (const rule of chapter.armyRules) {
    const key = rule.Title ?? ''
    if (armyRuleKeys.has(key)) continue
    armyRuleKeys.add(key)
    armyRules.push(rule)
  }

  return {
    ...chapter,
    units,
    unitDefs,
    detachments,
    detachmentsRaw,
    enhancements: mergeEnhancements(chapter.enhancements, sm.enhancements),
    armyRules,
  }
}

async function bundleForFaction(army: string): Promise<WarOrganBuilderBundle | null> {
  const file = warOrganFactionFile(army)
  const faction = await loadWarOrganFaction(army)
  if (!file || !faction) return null

  const legendsUnits = await loadLegendsUnits(file)
  const allWoUnits = [...faction.Units, ...legendsUnits]

  const unitDefs = new Map<string, WoUnit>()
  const units = allWoUnits
    .map((u) => {
      const id = warOrganUnitId(u.Name)
      unitDefs.set(id, u)
      return woUnitToCurated(u, id)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    factionFile: file,
    dataVersion: await loadMetaVersion(),
    units,
    unitDefs,
    detachments: faction.Dettachments.map(woDetachmentToGame),
    enhancements: collectEnhancements(faction),
    detachmentsRaw: faction.Dettachments,
    armyRules: faction.ArmyRules ?? [],
  }
}

export async function loadWarOrganBuilderBundle(army: string): Promise<WarOrganBuilderBundle | null> {
  const bundle = await bundleForFaction(army)
  if (!bundle || !isCodexChapter(army)) return bundle

  const sm = await bundleForFaction(MFM_SPACE_MARINES_ARMY)
  if (!sm) return bundle
  return mergeCodexChapterBundle(bundle, sm)
}

export function getWarOrganUnitDef(
  bundle: WarOrganBuilderBundle,
  unitId: string,
): WoUnit | undefined {
  return bundle.unitDefs.get(unitId)
}

export function stratagemsForDetachments(
  bundle: WarOrganBuilderBundle,
  detachmentNames: string[],
) {
  const selected = new Set(detachmentNames)
  return bundle.detachmentsRaw
    .filter((d) => selected.has(d.Name))
    .flatMap((d) => d.Stratagems ?? [])
}

export function detachmentRuleFor(
  bundle: WarOrganBuilderBundle,
  detachmentName: string,
): WoFactionData['Dettachments'][number]['Rule'] | undefined {
  return bundle.detachmentsRaw.find((d) => d.Name === detachmentName)?.Rule
}
