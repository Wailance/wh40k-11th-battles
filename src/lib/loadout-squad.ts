import type { UnitLoadoutGroup, UnitLoadoutOption } from '../types/loadout'
import { gwVariantLabel } from './loadout-display'

export function isSquadCompositionGroup(group: UnitLoadoutGroup): boolean {
  return (
    group.mode === 'count' &&
    (group.options.some((o) => o.equippedWith || o.hint || /\bw\/\s/i.test(o.name) || o.displayName) ||
      (group.groups?.some((sub) => isVariantBucketGroup(sub)) ?? false))
  )
}

export function isVariantBucketGroup(group: UnitLoadoutGroup): boolean {
  return (
    group.mode === 'count' &&
    group.options.length > 0 &&
    Boolean(group.displayName || /\bw\/\s/i.test(group.name))
  )
}

export function squadPrimaryOption(group: UnitLoadoutGroup): UnitLoadoutOption | undefined {
  const required = group.options.find((o) => o.min >= 1)
  if (required) return required
  if (group.defaultOptionId) {
    return group.options.find((o) => o.id === group.defaultOptionId)
  }
  return undefined
}

/** Top-level variant rows inside a squad card (not bucket subgroups). */
export function squadVariantOptions(group: UnitLoadoutGroup): UnitLoadoutOption[] {
  const primary = squadPrimaryOption(group)
  return group.options.filter((option) => !primary || option.id !== primary.id)
}

export function squadNestedGroups(group: UnitLoadoutGroup): UnitLoadoutGroup[] {
  return (group.groups ?? []).filter((sub) => isVariantBucketGroup(sub))
}

export function squadVariantDisplayName(option: UnitLoadoutOption, count = 0): string {
  return gwVariantLabel(option, count)
}

export function bucketGroupCount(group: UnitLoadoutGroup, selections: Record<string, number>): number {
  return group.options.reduce((sum, option) => sum + (selections[option.id] ?? 0), 0)
}

export function bucketGroupLabel(group: UnitLoadoutGroup, count: number): string {
  if (group.displayName) return count > 0 ? `${count} ${group.displayName}` : group.displayName
  const sample = group.options[0]
  if (sample) return gwVariantLabel(sample, count)
  return group.name
}
