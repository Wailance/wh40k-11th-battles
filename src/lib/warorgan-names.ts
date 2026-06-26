import type { SelectedDetachment } from '../types/game'
import type { ArmyRoster } from '../types/roster'
import type { Detachment } from '../types/game'
import type { WarOrganBuilderBundle, WoDetachment } from '../types/warorgan'

/** Case-insensitive key for WarOrgan names (units, detachments, enhancements). */
export function normalizeWoKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function woNamesMatch(a: string, b: string): boolean {
  return normalizeWoKey(a) === normalizeWoKey(b)
}

/** Title-style label for ALL-CAPS WarOrgan strings. */
export function formatWoDisplayName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      return word.charAt(0) + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function findRawDetachment(
  bundle: WarOrganBuilderBundle,
  name: string,
): WoDetachment | undefined {
  const key = normalizeWoKey(name)
  return bundle.detachmentsRaw.find((d) => normalizeWoKey(d.Name) === key)
}

export function findGameDetachment(
  bundle: WarOrganBuilderBundle,
  name: string,
): Detachment | undefined {
  const key = normalizeWoKey(name)
  return bundle.detachments.find((d) => normalizeWoKey(d.name) === key)
}

/** Align saved detachment names with canonical WarOrgan names (fixes legacy MFM casing). */
export function reconcileRosterDetachments(
  roster: ArmyRoster,
  bundle: WarOrganBuilderBundle,
): ArmyRoster {
  if (!roster.detachments.length) return roster

  const detachments = roster.detachments.map((sel) => {
    const canon = findGameDetachment(bundle, sel.name)
    if (!canon) return sel
    return {
      name: canon.name,
      dp: canon.dp,
      note: sel.note || canon.note,
      forceDisposition: canon.forceDisposition,
    }
  })

  const changed = detachments.some((d, i) => d.name !== roster.detachments[i]?.name)
  return changed ? { ...roster, detachments } : roster
}

export function rawDetachmentsForSelection(
  bundle: WarOrganBuilderBundle,
  selected: SelectedDetachment[],
): WoDetachment[] {
  const keys = new Set(selected.map((d) => normalizeWoKey(d.name)))
  return bundle.detachmentsRaw.filter((d) => keys.has(normalizeWoKey(d.Name)))
}
