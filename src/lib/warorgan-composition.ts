import type { WoCompositionState, WoModelComposition, WoUnit, WoWargearOption } from '../types/warorgan'
import { woDefaultModelCount } from './warorgan-catalog'

export const WO_ROSTER_KEY = 'warorgan'

export function parseWarOrganState(options?: Record<string, unknown>): WoCompositionState | null {
  const raw = options?.[WO_ROSTER_KEY]
  if (!raw || typeof raw !== 'object') return null
  const o = raw as WoCompositionState
  if (o.v !== 1 || !Array.isArray(o.modelCounts)) return null
  return { v: 1, modelCounts: o.modelCounts, wargear: o.wargear ?? {} }
}

export function modelRowMin(comp: WoModelComposition): number {
  if (!comp.Limit) return 1
  return comp.Limit.Min ?? 0
}

export function modelRowMax(comp: WoModelComposition): number {
  if (!comp.Limit) return 1
  return comp.Limit.Max ?? 99
}

export function totalModelCount(state: WoCompositionState): number {
  return state.modelCounts.reduce((s, n) => s + n, 0)
}

function primaryBulkIndex(comps: WoModelComposition[]): number {
  let best = -1
  let bestMax = 0
  for (let i = 0; i < comps.length; i++) {
    const max = modelRowMax(comps[i])
    if (max > bestMax) {
      bestMax = max
      best = i
    }
  }
  return best
}

/** Default composition matching the minimum legal squad for the unit's default model count. */
export function defaultWarOrganComposition(unit: WoUnit): WoCompositionState {
  const comps = unit.UnitComposition?.ModelCompositions ?? []
  if (!comps.length) {
    return { v: 1, modelCounts: [1], wargear: {} }
  }

  const targetModels = woDefaultModelCount(unit)
  const modelCounts = comps.map((c) => modelRowMin(c))

  let assigned = modelCounts.reduce((s, n) => s + n, 0)
  const bulk = primaryBulkIndex(comps)
  if (bulk >= 0 && assigned < targetModels) {
    const room = modelRowMax(comps[bulk]) - modelCounts[bulk]
    const need = targetModels - assigned
    modelCounts[bulk] += Math.min(room, need)
    assigned += Math.min(room, need)
  }

  return { v: 1, modelCounts, wargear: {} }
}

export function validModelCounts(unit: WoUnit): number[] {
  const points = unit.Points ?? []
  const fromPoints = [...new Set(points.map((p) => p.ModelCount).filter((n): n is number => n != null))]
  return fromPoints.sort((a, b) => a - b)
}

export function compositionMatchesPoints(unit: WoUnit, total: number): boolean {
  const valid = validModelCounts(unit)
  if (!valid.length) return total > 0
  return valid.includes(total)
}

function countKey(compIdx: number, wgIdx: number, optIdx: number): string {
  return `${compIdx}:${wgIdx}:${optIdx}`
}

function choiceKey(compIdx: number, wgIdx: number, replaces: string[]): string {
  return `${compIdx}:${wgIdx}:choice:${replaces.join('|')}`
}

export function getOptionCount(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
): number {
  const v = state.wargear[countKey(compIdx, wgIdx, optIdx)]
  return typeof v === 'number' ? v : 0
}

export function getSingleChoice(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  replaces: string[],
): string | undefined {
  const v = state.wargear[choiceKey(compIdx, wgIdx, replaces)]
  return typeof v === 'string' ? v : undefined
}

export function maxOptionCount(rowCount: number, option: WoWargearOption): number {
  if (rowCount <= 0) return 0
  const per = option.PerXModels ?? 1
  const slots = Math.floor(rowCount / per)
  const cap = option.Max ?? rowCount
  return Math.min(slots * cap, rowCount)
}

export function canAdjustModelRow(
  unit: WoUnit,
  state: WoCompositionState,
  compIdx: number,
  delta: number,
): boolean {
  const comps = unit.UnitComposition?.ModelCompositions ?? []
  const comp = comps[compIdx]
  if (!comp) return false

  const next = [...state.modelCounts]
  next[compIdx] = (next[compIdx] ?? 0) + delta
  if (next[compIdx] < modelRowMin(comp) || next[compIdx] > modelRowMax(comp)) return false

  const total = next.reduce((s, n) => s + n, 0)
  if (total <= 0) return false

  const validTotals = validModelCounts(unit)
  if (validTotals.length && !validTotals.includes(total)) {
    const minValid = validTotals[0]
    const maxValid = validTotals[validTotals.length - 1]
    if (total < minValid || total > maxValid) return false
  }

  return true
}

export function adjustModelRow(
  unit: WoUnit,
  state: WoCompositionState,
  compIdx: number,
  delta: number,
): WoCompositionState | null {
  if (!canAdjustModelRow(unit, state, compIdx, delta)) return null
  const modelCounts = [...state.modelCounts]
  modelCounts[compIdx] = (modelCounts[compIdx] ?? 0) + delta
  return { ...state, modelCounts }
}

export function canAdjustWargearOption(
  unit: WoUnit,
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  delta: number,
): boolean {
  const comp = unit.UnitComposition?.ModelCompositions[compIdx]
  const wg = comp?.Wargear[wgIdx]
  const option = wg?.Options[optIdx]
  if (!option) return false

  const rowCount = state.modelCounts[compIdx] ?? 0
  const current = getOptionCount(state, compIdx, wgIdx, optIdx)
  const next = current + delta
  if (next < 0) return false
  return next <= maxOptionCount(rowCount, option)
}

export function adjustWargearOption(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  delta: number,
): WoCompositionState | null {
  const current = getOptionCount(state, compIdx, wgIdx, optIdx)
  const next = current + delta
  if (next < 0) return null

  const key = countKey(compIdx, wgIdx, optIdx)
  const wargear = { ...state.wargear, [key]: next }
  if (next === 0) delete wargear[key]
  return { ...state, wargear }
}

export function setSingleWargearChoice(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  replaces: string[],
  chosen: string,
): WoCompositionState {
  const key = choiceKey(compIdx, wgIdx, replaces)
  return { ...state, wargear: { ...state.wargear, [key]: chosen } }
}

/** Equipped wargear for one model row (default + replacements). */
export function rowEquippedWargear(
  comp: WoModelComposition,
  compIdx: number,
  state: WoCompositionState,
): string[][] {
  const rowCount = state.modelCounts[compIdx] ?? 0
  const results: string[][] = []

  for (let m = 0; m < rowCount; m++) {
    const equipped = new Set<string>()
    for (let wgIdx = 0; wgIdx < comp.Wargear.length; wgIdx++) {
      const wg = comp.Wargear[wgIdx]
      for (const item of wg.InitalWargear) equipped.add(item)

      for (let optIdx = 0; optIdx < wg.Options.length; optIdx++) {
        const opt = wg.Options[optIdx]
        const taken = getOptionCount(state, compIdx, wgIdx, optIdx)
        const isCounted = opt.Max != null || opt.PerXModels != null

        if (isCounted) {
          const slot = Math.floor(m / (opt.PerXModels ?? 1))
          if (slot < taken && opt.Options[0]) {
            for (const r of opt.Replaces ?? []) equipped.delete(r)
            equipped.add(opt.Options[0])
          }
        } else {
          const chosen = getSingleChoice(state, compIdx, wgIdx, opt.Replaces ?? [])
          if (chosen) {
            for (const r of opt.Replaces ?? []) equipped.delete(r)
            equipped.add(chosen)
          }
        }
      }
    }
    results.push([...equipped])
  }

  return results
}

export function summarizeWarOrganComposition(unit: WoUnit, state: WoCompositionState): string {
  const comps = unit.UnitComposition?.ModelCompositions ?? []
  const parts: string[] = []

  for (let i = 0; i < comps.length; i++) {
    const count = state.modelCounts[i] ?? 0
    if (count <= 0) continue
    const name = comps[i].ModelName.trim()
    parts.push(count === 1 ? name : `${count}× ${name}`)
  }

  const total = totalModelCount(state)
  if (parts.length === 0) return `${total} models`
  return `${parts.join(', ')} (${total} models)`
}

export function unitHasWarOrganComposition(unit: WoUnit): boolean {
  return (unit.UnitComposition?.ModelCompositions.length ?? 0) > 0
}
