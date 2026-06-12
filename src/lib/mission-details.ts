import cards from '../data/mission-cards.json'

export interface MissionBlock {
  label: string
  text: string
}

export interface MissionDetail {
  type: 'primary' | 'secondary'
  summary: string
  blocks: MissionBlock[]
  cap?: string | null
  actions?: string[]
  whenDrawn?: string
}

type CardRecord = MissionDetail & { aliasOf?: string }

const CARD_DATA = cards as Record<string, CardRecord>

const ALIASES: Record<string, string> = {
  'Engage on all Fronts': 'Engage on All Fronts',
}

function normalizeKey(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (CARD_DATA[trimmed]) return trimmed
  if (ALIASES[trimmed] && CARD_DATA[ALIASES[trimmed]]) return ALIASES[trimmed]

  const lower = trimmed.toLowerCase()
  const hit = Object.keys(CARD_DATA).find((k) => k.toLowerCase() === lower)
  if (hit) return hit

  const apostrophe = trimmed.replace(/'/g, '\u2019')
  if (CARD_DATA[apostrophe]) return apostrophe
  const straight = trimmed.replace(/\u2019/g, "'")
  if (CARD_DATA[straight]) return straight

  return null
}

export function getMissionDetail(name: string): MissionDetail | null {
  const key = normalizeKey(name)
  if (!key) return null
  const { type, summary, blocks, cap, actions, whenDrawn } = CARD_DATA[key]
  return {
    type,
    summary,
    blocks: blocks ?? [],
    cap,
    actions: actions?.length ? actions : undefined,
    whenDrawn,
  }
}

export function hasMissionDetail(name: string): boolean {
  return normalizeKey(name) !== null
}
