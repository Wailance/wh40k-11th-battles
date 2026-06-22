import type { CuratedUnit } from '../types/faction-data'
import type {
  RosterLoadoutSelections,
  UnitLoadoutDef,
  UnitLoadoutGroup,
  UnitLoadoutOption,
} from '../types/loadout'
import { copy } from './copy'
import { bucketGroupCount, isVariantBucketGroup, squadVariantOptions } from './loadout-squad'
import { modelCountChoices } from './list-engine'

export function unitHasEditableLoadout(
  unit: CuratedUnit,
  loadout: UnitLoadoutDef | null | undefined,
): boolean {
  return Boolean(loadout?.groups.length) || modelCountChoices(unit).length > 0
}

export function walkLoadoutGroups(
  groups: UnitLoadoutGroup[],
  visit: (group: UnitLoadoutGroup) => void,
): void {
  for (const group of groups) {
    visit(group)
    if (group.groups) walkLoadoutGroups(group.groups, visit)
    for (const option of group.options) {
      if (option.groups) walkLoadoutGroups(option.groups, visit)
    }
  }
}

export function allLoadoutOptions(def: UnitLoadoutDef): UnitLoadoutOption[] {
  const options: UnitLoadoutOption[] = []
  walkLoadoutGroups(def.groups, (group) => options.push(...group.options))
  return options
}

export function optionIsActive(option: UnitLoadoutOption, selections: RosterLoadoutSelections): boolean {
  return (selections[option.id] ?? 0) > 0
}

export function groupSelectionTotal(
  group: UnitLoadoutGroup,
  selections: RosterLoadoutSelections,
): number {
  if (group.mode === 'fixed') return 1

  if (group.options.length === 0 && group.groups?.length) {
    return group.groups.reduce((sum, sub) => sum + groupSelectionTotal(sub, selections), 0)
  }

  let total = group.options.reduce((sum, option) => sum + (selections[option.id] ?? 0), 0)
  for (const sub of group.groups ?? []) {
    total += groupSelectionTotal(sub, selections)
  }
  return total
}

function clearOptionTree(option: UnitLoadoutOption, selections: RosterLoadoutSelections): void {
  delete selections[option.id]
  if (!option.groups) return
  for (const group of option.groups) {
    clearGroupTree(group, selections)
  }
}

function clearGroupTree(group: UnitLoadoutGroup, selections: RosterLoadoutSelections): void {
  for (const option of group.options) clearOptionTree(option, selections)
  if (group.groups) {
    for (const sub of group.groups) clearGroupTree(sub, selections)
  }
}

function validateGroup(group: UnitLoadoutGroup, selections: RosterLoadoutSelections): boolean {
  if (group.mode === 'fixed') {
    const id = group.fixedOptionId ?? group.options[0]?.id
    if (id && (selections[id] ?? 0) < 1) return false
    for (const sub of group.groups ?? []) {
      if (!validateGroup(sub, selections)) return false
    }
    return true
  }

  const total = groupSelectionTotal(group, selections)
  if (total < group.min || total > group.max) return false

  if (group.mode === 'single' && group.max === 1 && total > 1) return false

  for (const option of group.options) {
    const count = selections[option.id] ?? 0
    if (count < option.min || count > option.max) return false
    if (count > 0 && option.groups) {
      for (const sub of option.groups) {
        if (!validateGroup(sub, selections)) return false
      }
    }
  }

  for (const sub of group.groups ?? []) {
    if (!validateGroup(sub, selections)) return false
  }

  return true
}

export function validateLoadoutSelections(
  def: UnitLoadoutDef,
  selections: RosterLoadoutSelections,
): boolean {
  return def.groups.every((group) => validateGroup(group, selections))
}

function defaultNestedGroups(groups: UnitLoadoutGroup[]): RosterLoadoutSelections {
  const selections: RosterLoadoutSelections = {}
  for (const group of groups) {
    Object.assign(selections, defaultGroupSelections(group))
  }
  return selections
}

function defaultGroupSelections(group: UnitLoadoutGroup): RosterLoadoutSelections {
  const selections: RosterLoadoutSelections = {}

  if (group.mode === 'fixed') {
    const id = group.fixedOptionId ?? group.options[0]?.id
    if (id) selections[id] = 1
    if (group.groups) Object.assign(selections, defaultNestedGroups(group.groups))
    const opt = group.options[0]
    if (opt?.groups) Object.assign(selections, defaultNestedGroups(opt.groups))
    return selections
  }

  if (group.options.length === 0 && group.groups) {
    for (const sub of group.groups) {
      Object.assign(selections, defaultGroupSelections(sub))
    }
    return selections
  }

  if (group.mode === 'single') {
    const pick =
      group.options.find((o) => o.id === group.defaultOptionId) ??
      group.options.find((o) => o.min > 0) ??
      group.options[0]
    if (pick) {
      selections[pick.id] = 1
      if (pick.groups) Object.assign(selections, defaultNestedGroups(pick.groups))
    }
    return selections
  }

  let total = 0
  for (const option of group.options) {
    if (option.min > 0) {
      selections[option.id] = option.min
      total += option.min
      if (option.groups) Object.assign(selections, defaultNestedGroups(option.groups))
    }
  }

  const need = Math.max(0, group.min - total)
  if (need > 0) {
    const fill =
      group.options.find((o) => o.id === group.defaultOptionId) ??
      group.options.find((o) => o.max > 1) ??
      group.options[0]
    if (fill) {
      selections[fill.id] = (selections[fill.id] ?? 0) + need
    }
  }

  for (const sub of group.groups ?? []) {
    Object.assign(selections, defaultGroupSelections(sub))
  }

  return selections
}

export function defaultLoadoutSelections(def: UnitLoadoutDef): RosterLoadoutSelections {
  const selections: RosterLoadoutSelections = {}
  for (const group of def.groups) {
    Object.assign(selections, defaultGroupSelections(group))
  }
  return selections
}

export function selectSingleLoadoutOption(
  def: UnitLoadoutDef,
  selections: RosterLoadoutSelections,
  group: UnitLoadoutGroup,
  optionId: string,
): RosterLoadoutSelections | null {
  const option = group.options.find((o) => o.id === optionId)
  if (!option) return null

  const next = { ...selections }
  for (const opt of group.options) clearOptionTree(opt, next)
  next[optionId] = 1
  if (option.groups) Object.assign(next, defaultNestedGroups(option.groups))
  return validateLoadoutSelections(def, next) ? next : null
}

export function adjustLoadoutSelection(
  def: UnitLoadoutDef,
  selections: RosterLoadoutSelections,
  optionId: string,
  delta: number,
): RosterLoadoutSelections | null {
  const option = allLoadoutOptions(def).find((o) => o.id === optionId)
  if (!option) return null

  const current = selections[optionId] ?? 0
  const nextCount = current + delta
  if (nextCount < option.min || nextCount > option.max) return null

  const nextSelections = { ...selections }
  if (nextCount === 0) {
    delete nextSelections[optionId]
    clearOptionTree(option, nextSelections)
  } else {
    nextSelections[optionId] = nextCount
    if (delta > 0 && option.groups) {
      Object.assign(nextSelections, defaultNestedGroups(option.groups))
    }
  }

  return validateLoadoutSelections(def, nextSelections) ? nextSelections : null
}

/** Adjust total count on a GW-style variant bucket (e.g. plasma incinerators). */
export function adjustBucketGroupSelection(
  def: UnitLoadoutDef,
  selections: RosterLoadoutSelections,
  group: UnitLoadoutGroup,
  delta: number,
): RosterLoadoutSelections | null {
  if (!isVariantBucketGroup(group)) return null

  const total = bucketGroupCount(group, selections)
  const nextTotal = total + delta
  if (nextTotal < group.min || nextTotal > group.max) return null

  const nextSelections = { ...selections }

  if (delta > 0) {
    const target =
      group.options.find((o) => (nextSelections[o.id] ?? 0) < o.max && o.max > 1) ??
      group.options.find((o) => (nextSelections[o.id] ?? 0) < o.max)
    if (!target) return null
    const id = target.id
    nextSelections[id] = (nextSelections[id] ?? 0) + 1
    if (target.groups) Object.assign(nextSelections, defaultNestedGroups(target.groups))
  } else {
    const target = [...group.options].reverse().find((o) => (nextSelections[o.id] ?? 0) > 0)
    if (!target) return null
    const id = target.id
    const nextCount = (nextSelections[id] ?? 0) - 1
    if (nextCount === 0) {
      delete nextSelections[id]
      clearOptionTree(target, nextSelections)
    } else {
      nextSelections[id] = nextCount
    }
  }

  return validateLoadoutSelections(def, nextSelections) ? nextSelections : null
}

export function summarizeLoadout(def: UnitLoadoutDef, selections: RosterLoadoutSelections): string {
  const parts: string[] = []

  function collectFromGroup(group: UnitLoadoutGroup) {
    if (group.mode === 'fixed') {
      for (const sub of group.groups ?? []) collectFromGroup(sub)
      const opt = group.options[0]
      if (opt?.groups) {
        for (const sub of opt.groups) collectFromGroup(sub)
      }
      return
    }

    if (group.options.length === 0 && group.groups) {
      for (const sub of group.groups) collectFromGroup(sub)
      return
    }

    if (group.mode === 'single') {
      const picked = group.options.find((o) => optionIsActive(o, selections))
      if (picked) {
        parts.push(picked.name)
        if (picked.groups) {
          for (const sub of picked.groups) collectFromGroup(sub)
        }
      }
      return
    }

    for (const option of group.options) {
      const count = selections[option.id] ?? 0
      if (count <= 0) continue
      parts.push(count > 1 ? `${count}× ${option.name}` : option.name)
      if (option.groups) {
        for (const sub of option.groups) collectFromGroup(sub)
      }
    }
    for (const sub of group.groups ?? []) collectFromGroup(sub)
  }

  for (const group of def.groups) collectFromGroup(group)

  if (parts.length === 0) return ''
  const shown = parts.slice(0, 4)
  const suffix = parts.length > 4 ? ` +${parts.length - 4}` : ''
  return shown.join(', ') + suffix
}

export function parseRosterLoadout(
  options: Record<string, unknown> | undefined,
): RosterLoadoutSelections {
  const raw = options?.loadout
  if (!raw || typeof raw !== 'object') return {}
  const selections: RosterLoadoutSelections = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && value > 0) selections[id] = value
  }
  return selections
}

export function serializeRosterLoadout(
  selections: RosterLoadoutSelections,
  summary: string,
): Record<string, unknown> {
  return { loadout: selections, loadoutSummary: summary }
}

export function selectedOptionInGroup(
  group: UnitLoadoutGroup,
  selections: RosterLoadoutSelections,
): UnitLoadoutOption | undefined {
  return group.options.find((o) => optionIsActive(o, selections))
}

export function fixedGroupEquippedLabels(
  group: UnitLoadoutGroup,
  selections: RosterLoadoutSelections,
): string[] {
  const labels: string[] = []
  for (const sub of group.groups ?? []) {
    if (sub.mode === 'single') {
      const pick = selectedOptionInGroup(sub, selections)
      if (pick) labels.push(pick.name)
    }
  }
  return labels
}

export function squadBreakdownLines(
  group: UnitLoadoutGroup,
  selections: RosterLoadoutSelections,
): string[] {
  const lines: string[] = []
  const primary = group.options.find((o) => o.min >= 1) ?? group.options.find((o) => o.id === group.defaultOptionId)
  if (primary) {
    const count = selections[primary.id] ?? 0
    if (count > 0) {
      const shortName = primary.name.replace(/ w\/ .*$/i, '')
      const gear = primary.equippedWith ?? 'standard wargear'
      lines.push(copy.armyLists.squadEquipped(count, shortName, gear))
    }
  }
  for (const option of squadVariantOptions(group)) {
    const count = selections[option.id] ?? 0
    if (count <= 0) continue
    const shortName = option.displayName ?? option.name.replace(/ w\/ .*$/i, '')
    const gear = option.equippedWith ?? 'standard wargear'
    lines.push(copy.armyLists.squadEquipped(count, shortName, gear))
  }
  for (const bucket of group.groups ?? []) {
    if (!isVariantBucketGroup(bucket)) continue
    const count = bucketGroupCount(bucket, selections)
    if (count <= 0) continue
    const label = bucket.displayName ?? bucket.name.replace(/ w\/ .*$/i, '')
    const gear = bucket.options.find((o) => o.equippedWith)?.equippedWith ?? 'standard wargear'
    lines.push(copy.armyLists.squadEquipped(count, label, gear))
  }
  return lines
}
