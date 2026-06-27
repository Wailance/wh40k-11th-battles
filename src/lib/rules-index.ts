import gameData from '../data/game-data.json'
import type { RuleEntry } from '../types/game'

type RulesBucket = Record<string, RuleEntry[]>

const RULE_SECTIONS: { id: string; label: string }[] = [
  { id: 'core', label: 'Core Rules' },
  { id: 'command', label: 'Command Phase' },
  { id: 'movement', label: 'Movement' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'charge', label: 'Charge' },
  { id: 'fight', label: 'Fight' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'missions', label: 'Missions & Scoring' },
]

const rulesRoot = gameData.rules as RulesBucket

export const RULE_CATEGORIES = RULE_SECTIONS

export function allRules(): RuleEntry[] {
  return RULE_SECTIONS.flatMap(({ id }) => rulesRoot[id] ?? [])
}

export function rulesForCategory(categoryId: string): RuleEntry[] {
  return rulesRoot[categoryId] ?? []
}

export function searchRules(query: string, categoryId?: string): RuleEntry[] {
  const q = query.trim().toLowerCase()
  const pool = categoryId ? rulesForCategory(categoryId) : allRules()
  if (!q) return pool
  return pool.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q),
  )
}

export function ruleCount(): number {
  return allRules().length
}
