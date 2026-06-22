import type { UnitLoadoutGroup } from '../types/loadout'
import { copy } from './copy'

export function groupPickLabel(group: UnitLoadoutGroup): string {
  if (group.mode !== 'single') return group.name
  if (group.min === 0 && group.max === 1) return copy.armyLists.mayHaveUpTo(group.max)
  return copy.armyLists.selectOneOf
}

export function displayGroupLabel(group: UnitLoadoutGroup, selectionIndex?: number): string {
  if (selectionIndex != null && /^weapon\s*\d+$/i.test(group.name.trim())) {
    return copy.armyLists.selectionN(selectionIndex)
  }
  if (group.mode === 'single' && !group.name) return copy.armyLists.selectOneOf
  if (group.mode === 'single') return groupPickLabel(group)
  return group.name
}
