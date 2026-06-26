import type { Enhancement } from '../types/faction-data'
import type { Detachment, ForceDisposition } from '../types/game'
import type { WarOrganBuilderBundle, WoFactionData, WoUnit } from '../types/warorgan'
import { warOrganUnitId } from './warorgan-army-map'
import { woUnitToCurated } from './warorgan-catalog'

export function legendsFileName(mainFile: string): string {
  return mainFile.replace(/\.json$/, ' Legends.json')
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

export function collectEnhancementsFromFaction(faction: WoFactionData): Enhancement[] {
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

export function mergeCodexChapterBundles(
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

export function assembleWarOrganBundle(
  factionFile: string,
  faction: WoFactionData,
  legendsUnits: WoUnit[],
  dataVersion: string,
): WarOrganBuilderBundle {
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
    factionFile,
    dataVersion,
    units,
    unitDefs,
    detachments: faction.Dettachments.map(woDetachmentToGame),
    enhancements: collectEnhancementsFromFaction(faction),
    detachmentsRaw: faction.Dettachments,
    armyRules: faction.ArmyRules ?? [],
  }
}
