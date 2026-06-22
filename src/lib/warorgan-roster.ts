import type { RosterUnit } from '../types/roster'
import type { WoLineMeta, WoUpgrade } from '../types/warorgan'

export const WO_META_KEY = 'woMeta'

export function parseWoLineMeta(options?: Record<string, unknown>): WoLineMeta {
  const raw = options?.[WO_META_KEY]
  if (!raw || typeof raw !== 'object') return {}
  return raw as WoLineMeta
}

export function withWoLineMeta(
  options: Record<string, unknown> | undefined,
  patch: Partial<WoLineMeta>,
): Record<string, unknown> {
  const prev = parseWoLineMeta(options)
  const next = { ...prev, ...patch }
  for (const key of Object.keys(next) as (keyof WoLineMeta)[]) {
    if (next[key] === undefined || next[key] === '' || next[key] === false) {
      delete next[key]
    }
  }
  return { ...options, [WO_META_KEY]: next }
}

export function upgradeCost(upgrades: WoUpgrade[] | undefined, name: string | undefined): number {
  if (!name || !upgrades?.length) return 0
  return upgrades.find((u) => u.Name === name)?.Cost ?? 0
}

export function lineExtraPoints(
  line: RosterUnit,
  upgradeDefs: WoUpgrade[] | undefined,
  enhancementCost: number,
): number {
  const meta = parseWoLineMeta(line.options)
  return upgradeCost(upgradeDefs, meta.upgradeName) + (meta.enhancementId ? enhancementCost : 0)
}

export function rosterWarlordLineId(units: RosterUnit[]): string | undefined {
  return units.find((u) => parseWoLineMeta(u.options).warlord)?.lineId
}

export function clearEnhancementFromLines(units: RosterUnit[], name: string): RosterUnit[] {
  return units.map((line) => {
    const meta = parseWoLineMeta(line.options)
    if (meta.enhancementId !== name) return line
    return { ...line, options: withWoLineMeta(line.options, { enhancementId: undefined }) }
  })
}

export function clearLeaderAttachmentsTo(units: RosterUnit[], lineId: string): RosterUnit[] {
  return units.map((line) => {
    const meta = parseWoLineMeta(line.options)
    if (meta.attachedToLineId !== lineId) return line
    return { ...line, options: withWoLineMeta(line.options, { attachedToLineId: undefined }) }
  })
}

export function setWarlordOnLine(units: RosterUnit[], lineId: string, warlord: boolean): RosterUnit[] {
  return units.map((line) => {
    if (line.lineId === lineId) {
      return { ...line, options: withWoLineMeta(line.options, { warlord: warlord || undefined }) }
    }
    if (warlord) {
      const meta = parseWoLineMeta(line.options)
      if (meta.warlord) {
        return { ...line, options: withWoLineMeta(line.options, { warlord: undefined }) }
      }
    }
    return line
  })
}
