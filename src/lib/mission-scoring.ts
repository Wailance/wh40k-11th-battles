import cards from '../data/mission-cards.json'
import gameData from '../data/game-data.json'
import { getMissionDetail } from './mission-details'
import type { PlayerScores, PlayerSetup, SecondaryMode } from '../types/game'

export interface MissionScoreOption {
  id: string
  label: string
  vp: number
  timing: string
  blockIndex: number
  /** OR-tiers in the same block — only one per round */
  exclusiveGroup: string | null
  maxCountPerRound: number | null
  maxVpPerRound: number | null
  roundMin: number
  roundMax: number
}

export interface ScoringCaps {
  primaryMaxGame: number
  primaryMaxRound: number
  tacticalSecondaryMaxGame: number
  tacticalSecondaryMaxRound: number
  fixedSecondaryMaxGame: number
  fixedSecondaryMaxPerCard: number
  battleReadyVp: number
}

export interface ScoreValidation {
  allowed: boolean
  reason?: string
}

type CardRecord = {
  type: 'primary' | 'secondary'
  blocks: { label: string; text: string }[]
}

const CARD_DATA = cards as Record<string, CardRecord>
/** Max active tactical secondary cards (GW: draw until you have 2 active) */
export const TACTICAL_ACTIVE_LIMIT = 2
export const DEFAULT_CAPS: ScoringCaps = gameData.scoringCaps as ScoringCaps

function shortenRequirement(text: string): string {
  const req = text.match(/REQUIREMENT:\s*(.+?)(?:\.\s*REWARD:|$)/s)
  if (!req) {
    const clean = text.replace(/^WHEN:\s*/i, '').trim()
    return clean.length > 72 ? `${clean.slice(0, 69)}…` : clean
  }
  let s = req[1]
    .replace(/\s*REWARD:.*$/s, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > 72) s = `${s.slice(0, 69)}…`
  return s
}

function parseRoundWindow(label: string): { roundMin: number; roundMax: number } {
  if (/END OF BATTLE/i.test(label)) return { roundMin: 5, roundMax: 5 }
  if (/BATTLE ROUND 5/i.test(label)) return { roundMin: 5, roundMax: 5 }
  if (/BATTLE ROUNDS?\s*2[–-]4/i.test(label)) return { roundMin: 2, roundMax: 4 }
  if (/BATTLE ROUNDS?\s*1[–-]2/i.test(label)) return { roundMin: 1, roundMax: 2 }
  if (/^BATTLE ROUND 1$/i.test(label.trim())) return { roundMin: 1, roundMax: 1 }
  if (/SECOND BATTLE ROUND ONWARDS/i.test(label)) return { roundMin: 2, roundMax: 5 }
  return { roundMin: 1, roundMax: 5 }
}

function blockAppliesToMode(blockLabel: string, mode: SecondaryMode | null | undefined): boolean {
  if (blockLabel === 'FIXED') return mode === 'fixed'
  if (blockLabel === 'TACTICAL') return mode === 'tactical'
  return true
}

function inferScoringRules(
  blockText: string,
  rewardCount: number,
): Pick<MissionScoreOption, 'maxCountPerRound' | 'maxVpPerRound' | 'exclusiveGroup'> {
  const upTo = blockText.match(/up to (\d+) VP/i)
  const maxVpPerRound = upTo ? Number(upTo[1]) : null

  const isRepeatable =
    /each time|per unit|per such|per objective|per marker|per terrain|per enemy|per condemned|REWARD:\s*\d+\s*VP\s*each/i.test(
      blockText,
    )

  const isWoundTier = /VP\s*\(Wounds/i.test(blockText)
  const isExclusiveTiers =
    rewardCount > 1 &&
    !isWoundTier &&
    (/quarters?:/i.test(blockText) ||
      /:\s*\d+\s*VP\.\s*OR\s*\d+/i.test(blockText) ||
      /objectives.*OR.*objectives/i.test(blockText))

  return {
    exclusiveGroup: isExclusiveTiers ? 'or-tiers' : null,
    maxCountPerRound: isRepeatable ? null : 1,
    maxVpPerRound,
  }
}

function extractRewards(text: string): { vp: number; label?: string }[] {
  const results: { vp: number; label?: string }[] = []
  const orParts = text.split(/\s+OR\s+/i)

  for (const part of orParts) {
    const tierMatch = part.match(/([^:]+):\s*(\d+)\s*VP/i)
    if (tierMatch && !/REWARD:/i.test(part)) {
      results.push({
        vp: Number(tierMatch[2]),
        label: tierMatch[1].replace(/^WHEN:\s*End of your turn\.\s*Presence in\s*/i, '').trim(),
      })
      continue
    }

    const perMatch = part.match(/REWARD:\s*(\d+)\s*VP\s*(?:each|per\b[^.]*)/i)
    if (perMatch) {
      results.push({ vp: Number(perMatch[1]), label: shortenRequirement(part) })
      continue
    }

    const woundTiers = [...part.matchAll(/(\d+)\s*VP\s*\([^)]+\)/gi)]
    if (woundTiers.length >= 2) {
      for (const m of woundTiers) {
        results.push({ vp: Number(m[1]), label: m[0] })
      }
      continue
    }

    const rewards = [...part.matchAll(/REWARD:\s*(\d+)\s*VP/gi)]
    if (rewards.length) {
      for (const m of rewards) {
        results.push({
          vp: Number(m[1]),
          label: rewards.length > 1 ? shortenRequirement(part) : undefined,
        })
      }
      continue
    }

    const inlineOr = [...part.matchAll(/(\d+)\s*VP(?:\s*\([^)]+\))?/gi)]
    if (inlineOr.length >= 2 && /\bor\b/i.test(part)) {
      for (const m of inlineOr) {
        results.push({ vp: Number(m[1]), label: m[0] })
      }
      continue
    }

    const whenVp = part.match(/:\s*(\d+)\s*VP\b/i)
    if (whenVp) {
      results.push({ vp: Number(whenVp[1]), label: shortenRequirement(part) })
    }
  }

  if (!results.length) {
    const fallback = text.match(/(\d+)\s*VP/)
    if (fallback && /REWARD|WHEN|destroyed|control|Presence/i.test(text)) {
      results.push({ vp: Number(fallback[1]), label: shortenRequirement(text) })
    }
  }

  return results
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function getMissionScoreOptions(
  missionName: string,
  secondaryMode?: SecondaryMode | null,
): MissionScoreOption[] {
  const detail = getMissionDetail(missionName)
  if (!detail) return []

  const options: MissionScoreOption[] = []
  detail.blocks.forEach((block, blockIdx) => {
    if (block.label === 'SETUP' || block.label === 'MECHANIC') return
    if (detail.type === 'secondary' && !blockAppliesToMode(block.label, secondaryMode)) return

    const rewards = extractRewards(block.text)
    if (!rewards.length) return

    const rules = inferScoringRules(block.text, rewards.length)
    const { roundMin, roundMax } = parseRoundWindow(block.label)
    const exclusiveGroup =
      rules.exclusiveGroup === 'or-tiers' ? `${slug(missionName)}-b${blockIdx}` : null

    rewards.forEach((reward, rewardIdx) => {
      const label = reward.label ?? shortenRequirement(block.text)
      options.push({
        id: `${slug(missionName)}-b${blockIdx}-r${rewardIdx}`,
        label,
        vp: reward.vp,
        timing: block.label,
        blockIndex: blockIdx,
        exclusiveGroup,
        maxCountPerRound: rules.maxCountPerRound,
        maxVpPerRound: rules.maxVpPerRound,
        roundMin,
        roundMax,
      })
    })
  })

  return options
}

export function secondaryScoreKey(cardName: string, optionId: string): string {
  return `${cardName}::${optionId}`
}

export function emptyRoundCounts(): number[] {
  return [0, 0, 0, 0, 0]
}

export function getTallyCount(tally: Record<string, number[]>, key: string, round: number): number {
  return tally[key]?.[round - 1] ?? 0
}

function tallyKey(kind: 'primary' | 'secondary', optionId: string, card?: string): string {
  return kind === 'primary' ? optionId : secondaryScoreKey(card!, optionId)
}

function roundCategoryVp(
  tally: Record<string, number[]>,
  options: MissionScoreOption[],
  round: number,
  card?: string,
): number {
  let total = 0
  for (const opt of options) {
    const key = card ? secondaryScoreKey(card, opt.id) : opt.id
    total += getTallyCount(tally, key, round) * opt.vp
  }
  return total
}

function gameCategoryVp(
  tally: Record<string, number[]>,
  options: MissionScoreOption[],
  card?: string,
): number {
  let total = 0
  for (const opt of options) {
    const key = card ? secondaryScoreKey(card, opt.id) : opt.id
    const counts = tally[key] ?? emptyRoundCounts()
    total += counts.reduce((sum, c) => sum + c * opt.vp, 0)
  }
  return total
}

function timingReason(option: MissionScoreOption, battleRound: number): string | null {
  if (battleRound < option.roundMin) {
    return option.roundMin === option.roundMax
      ? `Only in round ${option.roundMin}`
      : `From round ${option.roundMin}`
  }
  if (battleRound > option.roundMax) {
    return option.roundMax === 5 && option.roundMin === 5
      ? 'Only at end of battle (round 5)'
      : `Not after round ${option.roundMax}`
  }
  return null
}

function getExclusiveConflict(
  option: MissionScoreOption,
  allOptions: MissionScoreOption[],
  tally: Record<string, number[]>,
  battleRound: number,
  card?: string,
): string | null {
  if (!option.exclusiveGroup) return null
  for (const other of allOptions) {
    if (other.exclusiveGroup !== option.exclusiveGroup || other.id === option.id) continue
    const key = card ? secondaryScoreKey(card, other.id) : other.id
    if (getTallyCount(tally, key, battleRound) > 0) {
      return `Pick one tier per round (${other.label})`
    }
  }
  return null
}

export function validateScoreIncrement(params: {
  kind: 'primary' | 'secondary'
  option: MissionScoreOption
  allOptions: MissionScoreOption[]
  scores: PlayerScores
  player: PlayerSetup
  battleRound: number
  delta: 1 | -1
  secondaryCard?: string
  caps?: ScoringCaps
}): ScoreValidation {
  const caps = params.caps ?? DEFAULT_CAPS
  const { kind, option, allOptions, scores, player, battleRound, delta, secondaryCard } = params
  const key = tallyKey(kind, option.id, secondaryCard)
  const count = getTallyCount(
    kind === 'primary' ? scores.primaryScoreTally : scores.secondaryScoreTally,
    key,
    battleRound,
  )

  if (delta === -1) {
    return count > 0 ? { allowed: true } : { allowed: false, reason: 'Nothing to undo' }
  }

  if (kind === 'secondary' && player.secondaryMode === 'tactical' && secondaryCard) {
    if (scores.tacticalAchieved.includes(secondaryCard)) {
      return { allowed: false, reason: 'Card already achieved' }
    }
    if (!scores.tacticalHand.includes(secondaryCard)) {
      return { allowed: false, reason: 'Not an active card' }
    }
  }

  const timing = timingReason(option, battleRound)
  if (timing) return { allowed: false, reason: timing }

  const tally = kind === 'primary' ? scores.primaryScoreTally : scores.secondaryScoreTally

  const exclusive = getExclusiveConflict(option, allOptions, tally, battleRound, secondaryCard)
  if (exclusive) return { allowed: false, reason: exclusive }

  if (option.maxCountPerRound !== null && count >= option.maxCountPerRound) {
    return { allowed: false, reason: 'Once per round' }
  }

  const optionRoundVp = (count + 1) * option.vp
  if (option.maxVpPerRound !== null && optionRoundVp > option.maxVpPerRound) {
    return { allowed: false, reason: `Max ${option.maxVpPerRound} VP this round` }
  }

  if (kind === 'primary') {
    const roundVp = roundCategoryVp(scores.primaryScoreTally, allOptions, battleRound) + option.vp
    if (roundVp > caps.primaryMaxRound) {
      return { allowed: false, reason: `Primary cap ${caps.primaryMaxRound} VP/round` }
    }
    const gameVp = gameCategoryVp(scores.primaryScoreTally, allOptions) + option.vp
    if (gameVp > caps.primaryMaxGame) {
      return { allowed: false, reason: `Primary cap ${caps.primaryMaxGame} VP/game` }
    }
  } else {
    const card = secondaryCard!
    const roundVp =
      roundCategoryVp(scores.secondaryScoreTally, allOptions, battleRound, card) + option.vp
    const roundCap =
      player.secondaryMode === 'fixed'
        ? caps.tacticalSecondaryMaxRound
        : caps.tacticalSecondaryMaxRound
    if (roundVp > roundCap) {
      return { allowed: false, reason: `Secondary cap ${roundCap} VP/round` }
    }

    const cardGameVp = gameCategoryVp(scores.secondaryScoreTally, allOptions, card) + option.vp
    if (player.secondaryMode === 'fixed' && cardGameVp > caps.fixedSecondaryMaxPerCard) {
      return { allowed: false, reason: `Fixed card cap ${caps.fixedSecondaryMaxPerCard} VP` }
    }

    const allSecondaryCards =
      player.secondaryMode === 'tactical'
        ? [...scores.tacticalHand, ...scores.tacticalAchieved]
        : player.secondaries.filter((s) => !scores.removedSecondaries.includes(s))

    let totalSecondaryGame = 0
    for (const c of allSecondaryCards) {
      const opts = getMissionScoreOptions(c, player.secondaryMode)
      totalSecondaryGame += gameCategoryVp(scores.secondaryScoreTally, opts, c)
    }
    totalSecondaryGame += option.vp

    const gameCap =
      player.secondaryMode === 'fixed'
        ? caps.fixedSecondaryMaxGame
        : caps.tacticalSecondaryMaxGame
    if (totalSecondaryGame > gameCap) {
      return { allowed: false, reason: `Secondary cap ${gameCap} VP/game` }
    }
  }

  return { allowed: true }
}

export function tallyVpForRound(
  tally: Record<string, number[]>,
  options: MissionScoreOption[],
  round: number,
  card?: string,
): number {
  return roundCategoryVp(tally, options, round, card)
}

export function incrementTally(
  tally: Record<string, number[]>,
  key: string,
  round: number,
  delta: 1 | -1,
): Record<string, number[]> | null {
  const counts = [...(tally[key] ?? emptyRoundCounts())]
  const idx = round - 1
  const next = (counts[idx] ?? 0) + delta
  if (next < 0) return null
  counts[idx] = next
  return { ...tally, [key]: counts }
}

export function recalcVpFromTallies(
  primaryTally: Record<string, number[]>,
  secondaryTally: Record<string, number[]>,
  primaryMission: string,
  secondaryCards: string[],
  secondaryMode: SecondaryMode | null,
  caps: ScoringCaps,
): {
  primaryVp: number
  secondaryVp: number
  primaryRoundVp: number[]
  secondaryRoundVp: number[]
} {
  const primaryOpts = getMissionScoreOptions(primaryMission)
  const primaryRoundVp = [1, 2, 3, 4, 5].map((r) =>
    Math.min(caps.primaryMaxRound, tallyVpForRound(primaryTally, primaryOpts, r)),
  )
  const primaryVp = Math.min(caps.primaryMaxGame, primaryRoundVp.reduce((a, b) => a + b, 0))

  const secondaryRoundVp = [1, 2, 3, 4, 5].map((round) => {
    let roundTotal = 0
    for (const card of secondaryCards) {
      const opts = getMissionScoreOptions(card, secondaryMode)
      roundTotal += tallyVpForRound(secondaryTally, opts, round, card)
    }
    return Math.min(caps.tacticalSecondaryMaxRound, roundTotal)
  })

  let secondaryVp = secondaryRoundVp.reduce((a, b) => a + b, 0)
  if (secondaryMode === 'fixed') {
    let perCardClamped = 0
    for (const card of secondaryCards) {
      const opts = getMissionScoreOptions(card, secondaryMode)
      perCardClamped += Math.min(
        caps.fixedSecondaryMaxPerCard,
        gameCategoryVp(secondaryTally, opts, card),
      )
    }
    secondaryVp = Math.min(caps.fixedSecondaryMaxGame, perCardClamped)
  } else {
    secondaryVp = Math.min(caps.tacticalSecondaryMaxGame, secondaryVp)
  }

  return { primaryVp, secondaryVp, primaryRoundVp, secondaryRoundVp }
}

export function canReturnSecondaryToDeck(
  cardName: string,
  battleRound: number,
  hand: string[] = [],
): boolean {
  if (battleRound > 1) return false

  const norm = cardName.toLowerCase()
  const hasInHand = (name: string) => hand.some((c) => c.toLowerCase() === name.toLowerCase())

  if (norm === 'plunder' && hasInHand('Cleanse')) return true
  if (norm === 'cleanse' && hasInHand('Plunder')) return true

  const redrawCards = [
    'Behind Enemy Lines',
    'Defend Stronghold',
    'Display of Might',
    'Bring it Down',
    'A Grievous Blow',
  ]
  return redrawCards.some((c) => c.toLowerCase() === norm)
}

export function validateTacticalDraw(scores: PlayerScores): ScoreValidation {
  if (scores.tacticalHand.length >= TACTICAL_ACTIVE_LIMIT) {
    return { allowed: false, reason: `Already have ${TACTICAL_ACTIVE_LIMIT} active cards` }
  }
  if (scores.tacticalDeck.length < 1) {
    return { allowed: false, reason: 'Deck empty' }
  }
  return { allowed: true }
}

export function tacticalDrawCount(scores: PlayerScores): number {
  const slots = TACTICAL_ACTIVE_LIMIT - scores.tacticalHand.length
  return Math.min(2, slots, scores.tacticalDeck.length)
}

/** True when no further VP can be scored on this tactical card. */
export function isTacticalCardExhausted(
  card: string,
  scores: PlayerScores,
  player: PlayerSetup,
  battleRound: number,
  caps: ScoringCaps = DEFAULT_CAPS,
): boolean {
  if (player.secondaryMode !== 'tactical') return false
  const options = getMissionScoreOptions(card, 'tactical')
  if (!options.length) return false

  return !options.some((option) => {
    const check = validateScoreIncrement({
      kind: 'secondary',
      option,
      allOptions: options,
      scores,
      player,
      battleRound,
      delta: 1,
      secondaryCard: card,
      caps,
    })
    return check.allowed
  })
}

export function formatRoundFiveTimingHint(
  timing: string,
  battleRound: number,
  isSecondPlayer: boolean,
): string {
  if (battleRound !== 5 || !/fifth battle round/i.test(timing)) return timing
  if (isSecondPlayer) return `${timing} · use End of your turn`
  return `${timing} · use End of Command phase`
}

/** Cards to show for secondary scoring in a given round (hand + any scored this round). */
export function secondaryCardsForRound(
  player: PlayerSetup,
  scores: PlayerScores,
  battleRound: number,
): string[] {
  const cards = new Set<string>()
  if (player.secondaryMode === 'tactical') {
    for (const c of [...scores.tacticalHand, ...scores.tacticalAchieved]) cards.add(c)
  } else {
    for (const c of player.secondaries) {
      if (!scores.removedSecondaries.includes(c)) cards.add(c)
    }
  }
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (getTallyCount(scores.secondaryScoreTally, key, battleRound) > 0) {
      const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
      cards.add(card)
    }
  }
  return [...cards]
}

export function roundCombinedVp(scores: PlayerScores, battleRound: number): number {
  const i = battleRound - 1
  return (scores.primaryRoundVp[i] ?? 0) + (scores.secondaryRoundVp[i] ?? 0)
}

export function listSecondaryCardNames(): string[] {
  return Object.entries(CARD_DATA)
    .filter(([, c]) => c.type === 'secondary')
    .map(([name]) => name)
}
