import { getFactionMapping } from './faction-loader'
import { publicUrl } from './public-url'
import type { FactionLoadouts } from '../types/loadout'

const cache = new Map<string, FactionLoadouts>()

export async function loadFactionLoadouts(army: string): Promise<FactionLoadouts> {
  if (cache.has(army)) return cache.get(army)!

  const mapping = getFactionMapping(army)
  const merged: FactionLoadouts = {}

  for (const slug of mapping?.slugs ?? []) {
    try {
      const res = await fetch(publicUrl(`/data/army/loadouts/${slug}.json`))
      if (!res.ok) continue
      Object.assign(merged, (await res.json()) as FactionLoadouts)
    } catch {
      // optional data — skip failed slugs
    }
  }

  cache.set(army, merged)
  return merged
}
