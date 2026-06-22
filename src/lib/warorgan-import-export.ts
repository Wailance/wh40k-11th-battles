import type { CuratedUnit } from '../types/faction-data'
import type { ArmyRoster, RosterUnit } from '../types/roster'
import type { WarOrganBuilderBundle, WoArmyListExport, WoArmyListUnit } from '../types/warorgan'
import { parseWarOrganState, WO_ROSTER_KEY } from './warorgan-composition'
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

export function convertWoArmyListToRoster(
  wo: WoArmyListExport,
  bundle: WarOrganBuilderBundle,
  existing?: ArmyRoster,
): ArmyRoster | null {
  const army = wo.FactionName
  if (!army || army !== existing?.army) {
    const mapped = bundle.units.length > 0 ? existing?.army : null
    if (!mapped && wo.FactionName !== bundle.factionFile.replace('.json', '')) {
      // Faction name from WO may differ slightly — match by bundle file
    }
  }

  const catalogByName = new Map(bundle.units.map((u) => [u.name.toUpperCase(), u]))
  const instanceMap = new Map<string, string>()
  const lines: RosterUnit[] = []

  for (const wu of wo.Units ?? []) {
    const catalog = catalogByName.get(wu.UnitName.toUpperCase())
    if (!catalog) continue
    const lineId = wu.InstanceId ?? crypto.randomUUID()
    instanceMap.set(wu.InstanceId ?? lineId, lineId)

    const options: Record<string, unknown> = {}
    if (wu.UnitComposition) {
      options[WO_ROSTER_KEY] = wu.UnitComposition
    }
    const meta: Record<string, unknown> = {}
    if (wu.EnhancementId) meta.enhancementId = wu.EnhancementId
    if (wu.UpgradeName) meta.upgradeName = wu.UpgradeName
    if (Object.keys(meta).length) options[WO_META_KEY] = meta

    lines.push({
      lineId,
      unitId: catalog.id,
      name: catalog.name,
      points: wu.Points ?? catalog.points,
      count: 1,
      models: wu.UnitComposition
        ? (wu.UnitComposition as { modelCounts?: number[] }).modelCounts?.reduce((s, n) => s + n, 0)
        : undefined,
      options,
    })
  }

  // Second pass: leader attachments
  for (let i = 0; i < (wo.Units ?? []).length; i++) {
    const wu = wo.Units![i]
    const line = lines[i]
    if (!wu.AttachedToInstanceId || !line) continue
    const targetLineId = instanceMap.get(wu.AttachedToInstanceId)
    if (targetLineId) {
      line.options = withWoLineMeta(line.options, { attachedToLineId: targetLineId })
    }
  }

  const now = new Date().toISOString()
  const battleSize = (wo.MaxPoints === 1000 ? 1000 : 2000) as ArmyRoster['battleSize']

  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: existing?.name ?? `${wo.FactionName ?? 'Imported'} list`,
    army: existing?.army ?? wo.FactionName ?? 'Unknown',
    battleSize,
    dataEdition: existing?.dataEdition ?? 'warorgan',
    units: lines,
    detachments: wo.DetachmentName
      ? [{ name: wo.DetachmentName, dp: bundle.detachments.find((d) => d.name === wo.DetachmentName)?.dp ?? 0, note: '', forceDisposition: 'TAKE AND HOLD' }]
      : [],
    enhancements: [],
    pointsTotal: wo.PointsTotal ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
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
    }
  })

  return {
    FactionName: roster.army,
    DetachmentName: roster.detachments[0]?.name,
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
    wo.DetachmentName ? `Detachment: ${wo.DetachmentName}` : '',
    '',
  ]

  for (const u of wo.Units ?? []) {
    const parts = [u.UnitName]
    if (u.EnhancementId) parts.push(`[${u.EnhancementId}]`)
    if (u.UpgradeName) parts.push(`+ ${u.UpgradeName}`)
    parts.push(`${u.Points ?? 0} pts`)
    lines.push(parts.join(' · '))
  }

  const warlord = roster.units.find((l) => parseWoLineMeta(l.options).warlord)
  if (warlord) {
    lines.push('', `Warlord: ${warlord.name}`)
  }

  return lines.filter(Boolean).join('\n')
}
