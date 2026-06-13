import type { ArmyRoster } from '../types/roster'

const ROSTERS_KEY = 'wh40k11-rosters'

function migrateRoster(raw: Record<string, unknown>): ArmyRoster {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? 'Army list'),
    army: String(raw.army ?? ''),
    battleSize: raw.battleSize === 1000 ? 1000 : 2000,
    dataEdition: String(raw.dataEdition ?? '10e'),
    units: Array.isArray(raw.units) ? (raw.units as ArmyRoster['units']) : [],
    detachments: Array.isArray(raw.detachments) ? (raw.detachments as ArmyRoster['detachments']) : [],
    enhancements: Array.isArray(raw.enhancements) ? (raw.enhancements as ArmyRoster['enhancements']) : [],
    pointsTotal: Number(raw.pointsTotal ?? 0),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  }
}

export function loadRosters(): ArmyRoster[] {
  try {
    const raw = localStorage.getItem(ROSTERS_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as Record<string, unknown>[]).map(migrateRoster)
  } catch {
    return []
  }
}

export function saveRosters(rosters: ArmyRoster[]): void {
  localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters))
}

export function loadRoster(id: string): ArmyRoster | null {
  return loadRosters().find((r) => r.id === id) ?? null
}

export function saveRoster(roster: ArmyRoster): void {
  const all = loadRosters()
  const idx = all.findIndex((r) => r.id === roster.id)
  if (idx >= 0) all[idx] = roster
  else all.unshift(roster)
  saveRosters(all)
}

export function deleteRoster(id: string): void {
  saveRosters(loadRosters().filter((r) => r.id !== id))
}

export function importRoster(json: string): ArmyRoster {
  const parsed = migrateRoster(JSON.parse(json) as Record<string, unknown>)
  const roster = { ...parsed, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }
  saveRoster(roster)
  return roster
}
