import type { WoCompositionState, WoModelComposition, WoUnit, WoWargearOption } from '../types/warorgan'
import { woDefaultModelCount } from './warorgan-catalog'

export const WO_ROSTER_KEY = 'warorgan'

export type WargearOptionMode = 'single' | 'counted' | 'perModel'

export function parseWarOrganState(options?: Record<string, unknown>): WoCompositionState | null {
  const raw = options?.[WO_ROSTER_KEY]
  if (!raw || typeof raw !== 'object') return null
  const o = raw as WoCompositionState
  if (o.v !== 1 || !Array.isArray(o.modelCounts)) return null
  return { v: 1, modelCounts: o.modelCounts, wargear: o.wargear ?? {} }
}

export function modelRowMin(comp: WoModelComposition): number {
  const slots = wargearFixedModelSlots(comp)
  if (slots > 0) return slots
  if (!comp.Limit) return 1
  return comp.Limit.Min ?? 0
}

export function modelRowMax(comp: WoModelComposition): number {
  const slots = wargearFixedModelSlots(comp)
  if (slots > 0) return slots
  if (!comp.Limit) return 1
  return comp.Limit.Max ?? 99
}

/** Named or fixed loadout rows (e.g. Gaunt's Ghosts, Brôkhyr Iron-master E-COGs). */
function wargearFixedModelSlots(comp: WoModelComposition): number {
  const wg = comp.Wargear ?? []
  if (!wg.length) return 0

  const explicit = wg
    .filter((w) => typeof w.Models === 'number' && w.Models > 0)
    .reduce((s, w) => s + (w.Models as number), 0)
  if (explicit > 0) return explicit

  if (wg.length > 1 && wg.every((w) => !(w.Options?.length ?? 0))) {
    return wg.length
  }
  return 0
}

export function totalModelCount(state: WoCompositionState): number {
  return state.modelCounts.reduce((s, n) => s + n, 0)
}

export function primaryBulkIndex(comps: WoModelComposition[]): number {
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
  const comps = unit.UnitComposition?.ModelCompositions ?? []

  if (comps.length) {
    const fixedTotal = comps.reduce((s, c) => s + modelRowMin(c), 0)
    const allRowsFixed = comps.every((c) => modelRowMin(c) === modelRowMax(c))
    if (allRowsFixed && fixedTotal > 0 && !fromPoints.includes(fixedTotal)) {
      fromPoints.push(fixedTotal)
    }
  }

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

function choiceCountKey(compIdx: number, wgIdx: number, optIdx: number, choiceIdx: number): string {
  return `${compIdx}:${wgIdx}:${optIdx}:c${choiceIdx}`
}

function countedSubChoiceKey(compIdx: number, wgIdx: number, optIdx: number): string {
  return `${compIdx}:${wgIdx}:${optIdx}:sub`
}

function choiceKey(compIdx: number, wgIdx: number, replaces: string[]): string {
  return `${compIdx}:${wgIdx}:choice:${replaces.join('|')}`
}

export function wargearOptionMode(opt: WoWargearOption, rowCount: number): WargearOptionMode {
  if (rowCount <= 1) return 'single'
  if (opt.Max != null || opt.PerXModels != null) return 'counted'
  return 'perModel'
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

export function getChoiceCount(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  choiceIdx: number,
): number {
  const v = state.wargear[choiceCountKey(compIdx, wgIdx, optIdx, choiceIdx)]
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

export function getCountedSubChoice(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  option: WoWargearOption,
): string {
  const v = state.wargear[countedSubChoiceKey(compIdx, wgIdx, optIdx)]
  if (typeof v === 'string' && option.Options.includes(v)) return v
  return option.Options[0] ?? ''
}

/** Max takes for a counted option; PerXModels uses whole-unit model count when > 1. */
export function maxOptionCount(
  rowCount: number,
  option: WoWargearOption,
  unitTotalModels?: number,
): number {
  if (rowCount <= 0) return 0
  const per = option.PerXModels ?? 1
  const basis =
    per > 1 && unitTotalModels != null && unitTotalModels > 0 ? unitTotalModels : rowCount
  const slots = Math.floor(basis / per)
  const cap = option.Max ?? rowCount
  return Math.min(slots * cap, rowCount)
}

function wargearSlotsUsedInBlock(
  state: WoCompositionState,
  comp: WoModelComposition,
  compIdx: number,
  wgIdx: number,
): number {
  const rowCount = state.modelCounts[compIdx] ?? 0
  const wg = comp.Wargear[wgIdx]
  if (!wg) return 0

  let used = 0
  for (let optIdx = 0; optIdx < wg.Options.length; optIdx++) {
    const opt = wg.Options[optIdx]
    const mode = wargearOptionMode(opt, rowCount)
    if (mode === 'counted') {
      used += getOptionCount(state, compIdx, wgIdx, optIdx)
    } else if (mode === 'perModel') {
      for (let ci = 0; ci < opt.Options.length; ci++) {
        used += getChoiceCount(state, compIdx, wgIdx, optIdx, ci)
      }
    }
  }
  return used
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
  if (!comp || !option) return false

  const rowCount = state.modelCounts[compIdx] ?? 0
  if (wargearOptionMode(option, rowCount) !== 'counted') return false

  const current = getOptionCount(state, compIdx, wgIdx, optIdx)
  const next = current + delta
  if (next < 0) return false
  if (next > maxOptionCount(rowCount, option, totalModelCount(state))) return false
  if (delta > 0 && wargearSlotsUsedInBlock(state, comp, compIdx, wgIdx) + delta > rowCount) {
    return false
  }
  return true
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

export function canAdjustChoiceCount(
  unit: WoUnit,
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  choiceIdx: number,
  delta: number,
): boolean {
  const comp = unit.UnitComposition?.ModelCompositions[compIdx]
  const wg = comp?.Wargear[wgIdx]
  const option = wg?.Options[optIdx]
  if (!comp || !option) return false

  const rowCount = state.modelCounts[compIdx] ?? 0
  if (wargearOptionMode(option, rowCount) !== 'perModel') return false

  const current = getChoiceCount(state, compIdx, wgIdx, optIdx, choiceIdx)
  const next = current + delta
  if (next < 0) return false
  if (delta > 0 && wargearSlotsUsedInBlock(state, comp, compIdx, wgIdx) + delta > rowCount) {
    return false
  }
  return true
}

export function adjustChoiceCount(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  choiceIdx: number,
  delta: number,
): WoCompositionState | null {
  const current = getChoiceCount(state, compIdx, wgIdx, optIdx, choiceIdx)
  const next = current + delta
  if (next < 0) return null

  const key = choiceCountKey(compIdx, wgIdx, optIdx, choiceIdx)
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

export function setCountedSubChoice(
  state: WoCompositionState,
  compIdx: number,
  wgIdx: number,
  optIdx: number,
  chosen: string,
): WoCompositionState {
  const key = countedSubChoiceKey(compIdx, wgIdx, optIdx)
  return { ...state, wargear: { ...state.wargear, [key]: chosen } }
}

/** Equipped wargear for one model row (default + replacements). */
export function rowEquippedWargear(
  comp: WoModelComposition,
  compIdx: number,
  state: WoCompositionState,
): string[][] {
  const rowCount = state.modelCounts[compIdx] ?? 0
  const results: Set<string>[] = Array.from({ length: rowCount }, () => {
    const eq = new Set<string>()
    for (const wg of comp.Wargear) {
      for (const item of wg.InitalWargear ?? []) eq.add(item)
    }
    return eq
  })

  if (rowCount <= 0) return []

  type Assign = { replaces: string[]; grant: string }
  const queue: Assign[] = []

  for (let wgIdx = 0; wgIdx < comp.Wargear.length; wgIdx++) {
    const wg = comp.Wargear[wgIdx]
    for (let optIdx = 0; optIdx < wg.Options.length; optIdx++) {
      const opt = wg.Options[optIdx]
      const mode = wargearOptionMode(opt, rowCount)

      if (mode === 'perModel') {
        for (let ci = 0; ci < opt.Options.length; ci++) {
          const n = getChoiceCount(state, compIdx, wgIdx, optIdx, ci)
          for (let k = 0; k < n; k++) {
            queue.push({ replaces: opt.Replaces ?? [], grant: opt.Options[ci] })
          }
        }
      } else if (mode === 'counted') {
        const taken = getOptionCount(state, compIdx, wgIdx, optIdx)
        const grant =
          opt.Options.length > 1
            ? getCountedSubChoice(state, compIdx, wgIdx, optIdx, opt)
            : (opt.Options[0] ?? '')
        for (let k = 0; k < taken; k++) {
          if (grant) queue.push({ replaces: opt.Replaces ?? [], grant })
        }
      }
    }
  }

  let slot = 0
  for (const a of queue) {
    if (slot >= rowCount) break
    for (const r of a.replaces) results[slot].delete(r)
    results[slot].add(a.grant)
    slot++
  }

  if (rowCount === 1) {
    for (let wgIdx = 0; wgIdx < comp.Wargear.length; wgIdx++) {
      const wg = comp.Wargear[wgIdx]
      for (let optIdx = 0; optIdx < wg.Options.length; optIdx++) {
        const opt = wg.Options[optIdx]
        if (wargearOptionMode(opt, rowCount) !== 'single') continue
        const chosen = getSingleChoice(state, compIdx, wgIdx, opt.Replaces ?? [])
        if (chosen) {
          for (const r of opt.Replaces ?? []) results[0].delete(r)
          results[0].add(chosen)
        }
      }
    }
  }

  return results.map((s) => [...s])
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
