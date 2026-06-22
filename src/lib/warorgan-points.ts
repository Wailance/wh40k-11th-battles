import type { CuratedUnit } from '../types/faction-data'
import type { WoCompositionState, WoUnit } from '../types/warorgan'
import { resolveModelCost, unitLinePoints } from './list-engine'
import { totalModelCount } from './warorgan-composition'

export function warOrganLinePoints(
  unit: CuratedUnit,
  woUnit: WoUnit,
  instanceIndex: number,
  state: WoCompositionState,
): number {
  const models = totalModelCount(state)
  const woPoints = woUnit.Points ?? []

  const withInstance = woPoints.filter(
    (p) => p.UnitCount != null && (p.ModelCount == null || p.ModelCount === models),
  )
  if (withInstance.length) {
    const brackets = [...withInstance].sort((a, b) => (a.UnitCount ?? 1) - (b.UnitCount ?? 1))
    const bracket =
      brackets.find((p) => instanceIndex <= (p.UnitCount ?? 1)) ?? brackets[brackets.length - 1]
    if (bracket) return bracket.Cost
  }

  const modelBracket = woPoints.find((p) => p.ModelCount === models)
  if (modelBracket) return modelBracket.Cost

  return unitLinePoints(unit, instanceIndex, models)
}

export function warOrganModelCountChoices(woUnit: WoUnit): number[] {
  const counts = [...new Set((woUnit.Points ?? []).map((p) => p.ModelCount).filter((n): n is number => n != null))]
  return counts.sort((a, b) => a - b)
}

export function warOrganDisplayPoints(woUnit: WoUnit): string {
  const points = woUnit.Points ?? []
  if (!points.length) return '0'
  const costs = [...new Set(points.map((p) => p.Cost))].sort((a, b) => a - b)
  if (costs.length === 1) return String(costs[0])
  return `${costs[0]}–${costs[costs.length - 1]}`
}

/** Catalog points label override from roster point brackets. */
export function applyWarOrganPricingDisplay(unit: CuratedUnit, woUnit: WoUnit): CuratedUnit {
  const models = warOrganModelCountChoices(woUnit)
  if (!models.length) return unit

  const costsForDefault = woUnit.Points?.filter((p) => p.ModelCount === models[0]) ?? []
  const pricing = unit.pricing?.length
    ? unit.pricing
    : [
        {
          range: '[1,)',
          label: 'any',
          costs: models.map((m) => {
            const bracket = woUnit.Points?.find((p) => p.ModelCount === m)
            return { models: m, points: bracket?.Cost ?? unit.points }
          }),
        },
      ]

  return {
    ...unit,
    pointsLabel: warOrganDisplayPoints(woUnit),
    pricing,
    points: costsForDefault[0]?.Cost ?? unit.points,
  }
}

export function priceLineWithWarOrgan(
  unit: CuratedUnit,
  woUnit: WoUnit,
  instanceIndex: number,
  models: number,
  options?: Record<string, unknown>,
): number {
  const state = options?.warorgan as WoCompositionState | undefined
  if (state?.v === 1) {
    return warOrganLinePoints(unit, woUnit, instanceIndex, state)
  }
  if (unit.pricing?.length) {
    return unitLinePoints(unit, instanceIndex, models)
  }
  const bracket = woUnit.Points?.find((p) => p.ModelCount === models)
  return bracket?.Cost ?? unit.points
}

export function defaultWarOrganModels(woUnit: WoUnit): number {
  const choices = warOrganModelCountChoices(woUnit)
  return choices[0] ?? 1
}

export function resolveWoModelCost(woUnit: WoUnit, models: number): number {
  const bracket = woUnit.Points?.find((p) => p.ModelCount === models)
  if (bracket) return bracket.Cost
  const costs = (woUnit.Points ?? []).map((p) => p.Cost)
  return costs.length ? Math.min(...costs) : 0
}

// re-export for tests
export { resolveModelCost }
