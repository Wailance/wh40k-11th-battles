import { publicUrl } from './public-url'
import type { TournamentMetaSnapshot } from '../types/tournament-list'

let cache: TournamentMetaSnapshot | null = null

export async function loadTournamentMetaLists(): Promise<TournamentMetaSnapshot> {
  if (cache) return cache
  const res = await fetch(publicUrl('/data/tournament-meta/recent-lists.json'))
  if (!res.ok) throw new Error(`tournament meta ${res.status}`)
  cache = (await res.json()) as TournamentMetaSnapshot
  return cache
}

export function uniqueFactions(lists: TournamentMetaSnapshot['lists']): string[] {
  return [...new Set(lists.map((l) => l.faction).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function formatTournamentResult(wins: number, losses: number, draws: number): string {
  const base = `${wins} - ${losses}`
  return draws > 0 ? `${base} - ${draws}` : base
}

export function formatTournamentDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
