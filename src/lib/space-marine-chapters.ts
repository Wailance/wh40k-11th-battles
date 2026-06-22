import { findArmy as findGameArmy } from './army-allegiance'
import type { Army } from '../types/game'
import type { Allegiance } from './army-allegiance'
import { allegianceOf, armiesForAllegiance } from './army-allegiance'

/** Codex chapters — roster.army name; MFM/detachments stay under Space Marines. */
export const CODEX_CHAPTERS = [
  {
    id: 'Ultramarines',
    curatedSlug: 'imperium-ultramarines',
    iconFile: 'ultramarines.svg',
  },
  {
    id: 'Raven Guard',
    curatedSlug: 'imperium-raven-guard',
    iconFile: 'raven-guard.svg',
  },
  {
    id: 'Imperial Fists',
    curatedSlug: 'imperium-imperial-fists',
    iconFile: 'imperial-fists.svg',
  },
  {
    id: 'Iron Hands',
    curatedSlug: 'imperium-iron-hands',
    iconFile: 'iron-hands.svg',
  },
  {
    id: 'Salamanders',
    curatedSlug: 'imperium-salamanders',
    iconFile: 'salamanders.svg',
  },
  {
    id: 'White Scars',
    curatedSlug: 'imperium-white-scars',
    iconFile: 'white-scars.svg',
  },
] as const

export type CodexChapterId = (typeof CODEX_CHAPTERS)[number]['id']

export const MFM_SPACE_MARINES_ARMY = 'Space Marines'

const CODEX_CHAPTER_IDS = new Set<string>(CODEX_CHAPTERS.map((c) => c.id))

export function isCodexChapter(army: string): army is CodexChapterId {
  return CODEX_CHAPTER_IDS.has(army)
}

export function mfmArmyKey(army: string): string {
  if (isCodexChapter(army) || army === MFM_SPACE_MARINES_ARMY) return MFM_SPACE_MARINES_ARMY
  return army
}

export function findArmyForBuilder(armyName: string): Army | undefined {
  const direct = findGameArmy(armyName)
  if (direct) return direct
  if (isCodexChapter(armyName)) return findGameArmy(MFM_SPACE_MARINES_ARMY)
  return undefined
}

export type BuilderFaction = {
  name: string
  detachmentCount: number
  kind: 'army' | 'chapter'
}

export function builderFactionsForAllegiance(allegiance: Allegiance): BuilderFaction[] {
  if (allegiance !== 'space-marines') {
    return armiesForAllegiance(allegiance).map((a) => ({
      name: a.army,
      detachmentCount: a.detachments.length,
      kind: 'army' as const,
    }))
  }

  const codexArmy = findGameArmy(MFM_SPACE_MARINES_ARMY)
  const detachmentCount = codexArmy?.detachments.length ?? 0

  const chapters: BuilderFaction[] = CODEX_CHAPTERS.map((c) => ({
    name: c.id,
    detachmentCount,
    kind: 'chapter' as const,
  }))

  const standalone: BuilderFaction[] = armiesForAllegiance('space-marines')
    .filter((a) => a.army !== MFM_SPACE_MARINES_ARMY)
    .map((a) => ({
      name: a.army,
      detachmentCount: a.detachments.length,
      kind: 'army' as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))

  return [...chapters, ...standalone]
}

export function builderFactionCount(allegiance: Allegiance): number {
  return builderFactionsForAllegiance(allegiance).length
}

export function resolveAllegianceForArmyName(armyName: string): Allegiance | null {
  const entry = findArmyForBuilder(armyName)
  if (!entry) return isCodexChapter(armyName) ? 'space-marines' : null
  return allegianceOf(entry)
}

export function codexChapterById(id: string) {
  return CODEX_CHAPTERS.find((c) => c.id === id)
}
