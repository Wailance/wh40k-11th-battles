import type { CuratedUnit } from '../types/faction-data'
import type { ArmyRoster, RosterUnit } from '../types/roster'
import type { WarOrganBuilderBundle, WoArmyListExport, WoArmyListUnit } from '../types/warorgan'
import { parseWarOrganState, WO_ROSTER_KEY } from './warorgan-composition'
import { findGameDetachment, normalizeWoKey } from './warorgan-names'
import { parseWoLineMeta, WO_META_KEY, withWoLineMeta } from './warorgan-roster'

function isWoArmyList(raw: unknown): raw is WoArmyListExport {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as WoArmyListExport
  return Array.isArray(o.Units) && typeof o.FactionName === 'string'
}

function isOurRoster(raw: unknown): raw is ArmyRoster {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as ArmyRoster
  return typeof o.id === 'string' && Array.isArray(o.units) && typeof o.army === 'string'
}

export function parseImportedListJson(text: string): ArmyRoster | WoArmyListExport | null {
  try {
    const raw = JSON.parse(text) as unknown
    if (isOurRoster(raw) || isWoArmyList(raw)) return raw
    return null
  } catch {
    return null
  }
}

export type WoImportResult = {
  roster: ArmyRoster
  skippedUnits: string[]
}

export function convertWoArmyListToRoster(
  wo: WoArmyListExport,
  bundle: WarOrganBuilderBundle,
  existing?: ArmyRoster,
): WoImportResult | null {
  const catalogByName = new Map(bundle.units.map((u) => [normalizeWoKey(u.name), u]))
  const instanceMap = new Map<string, string>()
  const lineByWoInstance = new Map<string, RosterUnit>()
  const lines: RosterUnit[] = []
  const skippedUnits: string[] = []

  for (const wu of wo.Units ?? []) {
    const catalog = catalogByName.get(normalizeWoKey(wu.UnitName))
    if (!catalog) {
      skippedUnits.push(wu.UnitName)
      continue
    }
    const lineId = wu.InstanceId ?? crypto.randomUUID()
    const woKey = wu.InstanceId ?? lineId
    instanceMap.set(woKey, lineId)

    const options: Record<string, unknown> = {}
    if (wu.UnitComposition) {
      options[WO_ROSTER_KEY] = wu.UnitComposition
    }
    const meta: Record<string, unknown> = {}
    if (wu.EnhancementId) meta.enhancementId = wu.EnhancementId
    if (wu.UpgradeName) meta.upgradeName = wu.UpgradeName
    if (wu.IsWarlord) meta.warlord = true
    if (Object.keys(meta).length) options[WO_META_KEY] = meta

    const line: RosterUnit = {
      lineId,
      unitId: catalog.id,
      name: catalog.name,
      points: wu.Points ?? catalog.points,
      count: 1,
      models: wu.UnitComposition
        ? (wu.UnitComposition as { modelCounts?: number[] }).modelCounts?.reduce((s, n) => s + n, 0)
        : undefined,
      options,
    }
    lines.push(line)
    lineByWoInstance.set(woKey, line)
  }

  for (const wu of wo.Units ?? []) {
    if (!wu.AttachedToInstanceId) continue
    const line = wu.InstanceId ? lineByWoInstance.get(wu.InstanceId) : undefined
    if (!line) continue
    const targetLineId = instanceMap.get(wu.AttachedToInstanceId)
    if (targetLineId) {
      line.options = withWoLineMeta(line.options, { attachedToLineId: targetLineId })
    }
  }

  const detachmentNames = [
    ...(wo.DetachmentNames ?? []),
    ...(wo.DetachmentName ? [wo.DetachmentName] : []),
  ].filter(
    (name, idx, arr) =>
      arr.findIndex((n) => normalizeWoKey(n) === normalizeWoKey(name)) === idx,
  )

  const detachments = detachmentNames
    .map((name) => findGameDetachment(bundle, name))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({
      name: d.name,
      dp: d.dp,
      note: d.note,
      forceDisposition: d.forceDisposition,
    }))

  const now = new Date().toISOString()
  const battleSize = (wo.MaxPoints === 1000 ? 1000 : 2000) as ArmyRoster['battleSize']

  return {
    roster: {
      id: existing?.id ?? crypto.randomUUID(),
      name: existing?.name ?? `${wo.FactionName ?? 'Imported'} list`,
      army: existing?.army ?? wo.FactionName ?? 'Unknown',
      battleSize,
      dataEdition: existing?.dataEdition ?? 'warorgan',
      units: lines,
      detachments,
      enhancements: [],
      pointsTotal: wo.PointsTotal ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    skippedUnits,
  }
}

export function exportWoArmyList(
  roster: ArmyRoster,
  _bundle: WarOrganBuilderBundle,
  catalog: CuratedUnit[],
): WoArmyListExport {
  const catalogById = new Map(catalog.map((u) => [u.id, u]))
  const units: WoArmyListUnit[] = roster.units.map((line) => {
    const meta = parseWoLineMeta(line.options)
    const woState = parseWarOrganState(line.options)
    return {
      InstanceId: line.lineId,
      UnitName: catalogById.get(line.unitId)?.name ?? line.name,
      EnhancementId: meta.enhancementId ?? null,
      AttachedToInstanceId: meta.attachedToLineId ?? null,
      Points: line.points,
      UnitComposition: woState ?? undefined,
      UpgradeName: meta.upgradeName ?? null,
      IsUpgraded: Boolean(meta.upgradeName),
      IsWarlord: Boolean(meta.warlord),
    }
  })

  return {
    FactionName: roster.army,
    DetachmentName: roster.detachments[0]?.name,
    DetachmentNames: roster.detachments.map((d) => d.name),
    MaxPoints: roster.battleSize,
    DataSetId: 'Warhammer 40k 11th',
    PointsTotal: roster.pointsTotal,
    Units: units,
  }
}

export function exportWoListText(
  roster: ArmyRoster,
  bundle: WarOrganBuilderBundle,
  catalog: CuratedUnit[],
): string {
  const wo = exportWoArmyList(roster, bundle, catalog)
  const lines = [
    `${roster.name}`,
    `${roster.army} — ${roster.pointsTotal}/${roster.battleSize} pts`,
    wo.DetachmentNames?.length
      ? `Detachments: ${wo.DetachmentNames.join(' · ')}`
      : wo.DetachmentName
        ? `Detachment: ${wo.DetachmentName}`
        : '',
    '',
  ]

  for (const u of wo.Units ?? []) {
    const parts = [u.UnitName]
    if (u.IsWarlord) parts.push('(Warlord)')
    if (u.EnhancementId) parts.push(`[${u.EnhancementId}]`)
    if (u.UpgradeName) parts.push(`+ ${u.UpgradeName}`)
    parts.push(`${u.Points ?? 0} pts`)
    lines.push(parts.join(' · '))
  }

  return lines.filter(Boolean).join('\n')
}
