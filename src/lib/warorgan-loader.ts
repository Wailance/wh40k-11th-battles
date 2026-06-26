import type { WarOrganBuilderBundle, WoFactionData } from '../types/warorgan'
import { isCodexChapter, MFM_SPACE_MARINES_ARMY } from './space-marine-chapters'
import { publicUrl } from './public-url'
import { warOrganFactionFile } from './warorgan-army-map'
import {
  assembleWarOrganBundle,
  legendsFileName,
  mergeCodexChapterBundles,
} from './warorgan-bundle-build'
import { findRawDetachment, rawDetachmentsForSelection } from './warorgan-names'
import type { WoUnit } from '../types/warorgan'

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

async function bundleForFaction(army: string): Promise<WarOrganBuilderBundle | null> {
  const file = warOrganFactionFile(army)
  const faction = await loadWarOrganFaction(army)
  if (!file || !faction) return null

  const legendsUnits = await loadLegendsUnits(file)
  return assembleWarOrganBundle(file, faction, legendsUnits, await loadMetaVersion())
}

export async function loadWarOrganBuilderBundle(army: string): Promise<WarOrganBuilderBundle | null> {
  const bundle = await bundleForFaction(army)
  if (!bundle || !isCodexChapter(army)) return bundle

  const sm = await bundleForFaction(MFM_SPACE_MARINES_ARMY)
  if (!sm) return bundle
  return mergeCodexChapterBundles(bundle, sm)
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
  return rawDetachmentsForSelection(
    bundle,
    detachmentNames.map((name) => ({ name, dp: 0, note: '', forceDisposition: 'TAKE AND HOLD' })),
  ).flatMap((d) => d.Stratagems ?? [])
}

export function detachmentRuleFor(
  bundle: WarOrganBuilderBundle,
  detachmentName: string,
): WoFactionData['Dettachments'][number]['Rule'] | undefined {
  return findRawDetachment(bundle, detachmentName)?.Rule
}
