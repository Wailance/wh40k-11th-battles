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
export const DEFAULT_CAPS: ScoringCaps = gameData.scoringCaps as ScoringCaps

function shortenRequirement(text: string): string {
  const req = text.match(/REQUIREMENT:\s*(.+?)(?:\.\s*REWARD:|$)/s)
  if (!req) {
    const clean = text
      .replace(/^WHEN:\s*/i, '')
      .replace(/\s*REWARD:.*$/is, '')
      .trim()
    return clean.length > 72 ? `${clean.slice(0, 69)}…` : clean
  }
  let s = req[1]
    .replace(/\s*REWARD:.*$/s, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > 72) s = `${s.slice(0, 69)}…`
  return s
}

function parseRoundWindow(label: string, blockText = ''): { roundMin: number; roundMax: number } {
  let window: { roundMin: number; roundMax: number }
  if (/END OF BATTLE/i.test(label)) window = { roundMin: 5, roundMax: 5 }
  else if (/BATTLE ROUND 5/i.test(label)) window = { roundMin: 5, roundMax: 5 }
  else if (/BATTLE ROUNDS?\s*2[–-]4/i.test(label)) window = { roundMin: 2, roundMax: 4 }
  else if (/BATTLE ROUNDS?\s*2[–-]3/i.test(label)) window = { roundMin: 2, roundMax: 3 }
  else if (/BATTLE ROUND\s*4\+/i.test(label)) window = { roundMin: 4, roundMax: 5 }
  else if (/BATTLE ROUNDS?\s*1[–-]2/i.test(label)) window = { roundMin: 1, roundMax: 2 }
  else if (/^BATTLE ROUND 1$/i.test(label.trim())) window = { roundMin: 1, roundMax: 1 }
  else if (/SECOND BATTLE ROUND ONWARDS/i.test(label)) window = { roundMin: 2, roundMax: 5 }
  else window = { roundMin: 1, roundMax: 5 }

  // GW: "2–4" blocks still score on round 5 (end of turn if going second).
  if (/fifth battle round/i.test(blockText) && window.roundMax < 5) {
    window = { ...window, roundMax: 5 }
  }
  return window
}

function blockAppliesToMode(blockLabel: string, mode: SecondaryMode | null | undefined): boolean {
  if (blockLabel === 'FIXED') return mode === 'fixed'
  if (blockLabel === 'TACTICAL') return mode === 'tactical'
  return true
}

function stripVpCapClauses(text: string): string {
  return text.replace(/\(\s*(?:up\s+to|max)\s+\d+\s*vp\s*\)/gi, '')
}

/** GW cards use uppercase OR between tiers; lowercase "or" in prose must not split. */
function splitOrTiers(text: string): string[] {
  return text.split(/\s+OR\s+/)
}

function inferScoringRules(
  blockText: string,
  rewardCount: number,
): Pick<MissionScoreOption, 'maxCountPerRound' | 'maxVpPerRound' | 'exclusiveGroup'> {
  const isCumulativeCap = /REWARD:\s*\+?\d+\s*VP\s*(?:each|per\b)[^.]*\(\s*up to \d+ VP/i.test(
    blockText,
  )

  const upTo = blockText.match(/up to (\d+) VP/i)
  const maxVpPerRound = isCumulativeCap ? null : upTo ? Number(upTo[1]) : null

  const isRepeatable =
    !isCumulativeCap &&
    !/not per objective/i.test(blockText) &&
    /each time|per unit|per such|per objective|per marker|per terrain|per enemy|per condemned|REWARD:\s*\+?\d+\s*VP\s*(?:each|per\b)/i.test(
      blockText,
    )

  const isWoundTier = /VP\s*\(Wounds/i.test(blockText)
  const isExclusiveTiers =
    rewardCount > 1 &&
    (isCumulativeCap ||
      isWoundTier ||
      /\bOR\b/.test(blockText) ||
      /quarters?:/i.test(blockText) ||
      /table corners/i.test(blockText) ||
      /Triangulated/i.test(blockText) ||
      /;\s*\d\+?:\s*\d+\s*VP/i.test(blockText) ||
      /:\s*\d+\s*VP\.\s*OR\s*\d+/i.test(blockText) ||
      /objectives?.*\bOR\b.*objectives?/i.test(blockText) ||
      /VP\s*\(\+\d+\s*VP cumulative/i.test(blockText))

  return {
    exclusiveGroup: isExclusiveTiers ? 'or-tiers' : null,
    maxCountPerRound: isExclusiveTiers ? 1 : isRepeatable ? null : 1,
    maxVpPerRound,
  }
}

function buildCumulativeCapTiers(perVp: number, capVp: number): number[] {
  const tiers: number[] = []
  let total = 0
  while (total < capVp) {
    const next = total + perVp
    if (next > capVp) {
      if (total < capVp) tiers.push(capVp)
      break
    }
    total = next
    tiers.push(total)
  }
  return tiers
}

function cumulativeCapLabel(
  perVp: number,
  tierVp: number,
  capVp: number,
  blockText: string,
): string {
  const noun = /per objective/i.test(blockText)
    ? 'objective'
    : /each/i.test(blockText)
      ? 'unit'
      : 'score'
  const count = tierVp / perVp
  if (Number.isInteger(count)) {
    const n = Number(count)
    return `${n} ${noun}${n > 1 ? 's' : ''}`
  }
  return `max ${capVp} VP`
}

function extractCumulativeCapRewards(text: string): { vp: number; label: string }[] | null {
  const match = text.match(
    /REWARD:\s*\+?(\d+)\s*VP\s*(?:each|per\b[^.]*)\s*\(\s*up to (\d+) VP/i,
  )
  if (!match) return null

  const perVp = Number(match[1])
  const capVp = Number(match[2])
  return buildCumulativeCapTiers(perVp, capVp).map((tierVp) => ({
    vp: tierVp,
    label: cumulativeCapLabel(perVp, tierVp, capVp, text),
  }))
}

function extractRewards(text: string): { vp: number; label?: string }[] {
  const cumulative = extractCumulativeCapRewards(text)
  if (cumulative) return cumulative

  const results: { vp: number; label?: string }[] = []
  const orParts = splitOrTiers(text)

  for (const part of orParts) {
    const stripped = stripVpCapClauses(part)

    const semiTiers = [
      ...stripped.matchAll(/(\d\+?)\s+objectives?\s+Triangulated:\s*(\d+)\s*VP/gi),
      ...stripped.matchAll(/;\s*(\d\+?):\s*(\d+)\s*VP/gi),
    ]
    if (semiTiers.length >= 2) {
      for (const m of semiTiers) {
        const count = m[1]
        results.push({
          vp: Number(m[2]),
          label: `${count} objective${count.endsWith('+') || Number(count) > 1 ? 's' : ''} Triangulated`,
        })
      }
      continue
    }

    const cumulativeWounds = stripped.match(
      /(\d+)\s*VP\s*\(\+(\d+)\s*VP cumulative[^;]*;\s*\+(\d+)\s*VP more/i,
    )
    if (cumulativeWounds) {
      const base = Number(cumulativeWounds[1])
      const plus15 = Number(cumulativeWounds[2])
      const plus20 = Number(cumulativeWounds[3])
      results.push({ vp: base, label: `${base} VP · under 15 wounds` })
      results.push({ vp: base + plus15, label: `${base + plus15} VP · 15+ wounds` })
      results.push({ vp: base + plus15 + plus20, label: `${base + plus15 + plus20} VP · 20+ wounds` })
      continue
    }

    const characterWoundTiers = [...stripped.matchAll(/(\d+)\s*VP\s*\(Wounds[^)]+\)/gi)]
    if (characterWoundTiers.length >= 2) {
      for (const m of characterWoundTiers) {
        results.push({ vp: Number(m[1]), label: m[0] })
      }
      continue
    }

    const tierMatch = stripped.match(/([^:]+):\s*(\d+)\s*VP/i)
    if (tierMatch && !/REWARD:/i.test(stripped) && !/Wounds/i.test(stripped)) {
      results.push({
        vp: Number(tierMatch[2]),
        label: tierMatch[1].replace(/^WHEN:\s*End of your turn\.\s*Presence in\s*/i, '').trim(),
      })
      continue
    }

    const perMatch = stripped.match(/REWARD:\s*\+?(\d+)\s*VP\s*(?:each|per\b[^.]*)/i)
    if (perMatch) {
      results.push({ vp: Number(perMatch[1]), label: shortenRequirement(stripped) })
      continue
    }

    const rewardLines = [...stripped.matchAll(/REWARD:\s*\+?(\d+)\s*VP\.?/gi)]
    if (rewardLines.length) {
      for (const m of rewardLines) {
        results.push({
          vp: Number(m[1]),
          label: shortenRequirement(stripped),
        })
      }
      continue
    }

    const woundTiers = [...stripped.matchAll(/(\d+)\s*VP\s*\([^)]+\)/gi)]
    if (woundTiers.length >= 2) {
      for (const m of woundTiers) {
        results.push({ vp: Number(m[1]), label: m[0] })
      }
      continue
    }

    const inlineOr = [...stripped.matchAll(/(\d+)\s*VP(?:\s*\([^)]+\))?/gi)]
    if (inlineOr.length >= 2 && /\bOR\b/.test(stripped)) {
      for (const m of inlineOr) {
        results.push({ vp: Number(m[1]), label: m[0] })
      }
      continue
    }

    const whenVp = stripped.match(/:\s*(\d+)\s*VP\b/i)
    if (whenVp) {
      results.push({ vp: Number(whenVp[1]), label: shortenRequirement(stripped) })
    }
  }

  if (!results.length) {
    const stripped = stripVpCapClauses(text)
    const fallback = stripped.match(/(\d+)\s*VP/)
    if (fallback && /REWARD|WHEN|destroyed|control|Presence/i.test(stripped)) {
      results.push({ vp: Number(fallback[1]), label: shortenRequirement(stripped) })
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
    if (/\(ACTION\)/i.test(block.label)) return
    if (detail.type === 'secondary' && !blockAppliesToMode(block.label, secondaryMode)) return

    const rewards = extractRewards(block.text)
    if (!rewards.length) return

    const rules = inferScoringRules(block.text, rewards.length)
    const { roundMin, roundMax } = parseRoundWindow(block.label, block.text)
    const exclusiveGroup =
      rules.exclusiveGroup === 'or-tiers' ? `${slug(missionName)}-b${blockIdx}` : null

    rewards.forEach((reward, rewardIdx) => {
      let label = reward.label ?? shortenRequirement(block.text)
      if (/END OF BATTLE/i.test(block.label) && !/^\[End of battle\]/i.test(label)) {
        label = `[End of battle] ${label}`
      }
      let maxCountPerRound = rules.maxCountPerRound
      if (detail.type === 'secondary' && /^FIXED/i.test(block.label) && rewards.length === 1) {
        maxCountPerRound = 1
      }
      options.push({
        id: `${slug(missionName)}-b${blockIdx}-r${rewardIdx}`,
        label,
        vp: reward.vp,
        timing: block.label,
        blockIndex: blockIdx,
        exclusiveGroup,
        maxCountPerRound,
        maxVpPerRound: rules.maxVpPerRound,
        roundMin,
        roundMax,
      })
    })
  })

  return options
}

function compactTacticalOptionHint(label: string): string {
  let s = label.replace(/\s*…$/, '').trim()
  if (/^more such units$/i.test(s)) return '2+ units in opp. DZ'

  s = s
    .replace(/^End of your turn\.\s*/i, '')
    .replace(/^While this card is active\.\s*/i, '')
    .replace(/^Each time\s+/i, '')
    .replace(/\(not AIRCRAFT[^)]*\)\s*/gi, '')
    .replace(/opponent deployment zone/gi, 'opp. DZ')
    .replace(/objective marker/gi, 'objective')
    .replace(/\s*REWARD:.*$/i, '')
    .trim()

  if (s.length > 52) s = `${s.slice(0, 51)}…`
  return s
}

/** Short actionable line for tactical card scoring (replaces timing labels like ANY BATTLE ROUND). */
export function tacticalScoreHint(
  missionName: string,
  option: MissionScoreOption,
  options: MissionScoreOption[],
): string {
  if (options.length === 1) {
    const summary = getMissionDetail(missionName)?.summary
    if (summary) return summary.replace(/\.\s*$/, '')
  }
  return compactTacticalOptionHint(option.label)
}

export function secondaryScoreKey(cardName: string, optionId: string): string {
  return `${cardName}::${optionId}`
}

export function emptyRoundCounts(): number[] {
  return [0, 0, 0, 0, 0]
}

export function emptyRoundCardLists(): string[][] {
  return [[], [], [], [], []]
}

export function ensureTacticalRoundCards(scores: PlayerScores): string[][] {
  if (scores.tacticalRoundCards?.length === 5) return scores.tacticalRoundCards
  return deriveTacticalRoundCardsFromTally(scores)
}

export function getTacticalRoundCards(scores: PlayerScores, round: number): string[] {
  return ensureTacticalRoundCards(scores)[round - 1] ?? []
}

export function registerTacticalRoundCard(
  scores: PlayerScores,
  card: string,
  round: number,
): PlayerScores {
  const lists = ensureTacticalRoundCards(scores).map((r) => [...r])
  const idx = round - 1
  if (!lists[idx].includes(card)) lists[idx] = [...lists[idx], card]
  return { ...scores, tacticalRoundCards: lists }
}

export function unregisterTacticalRoundCard(
  scores: PlayerScores,
  card: string,
  round: number,
): PlayerScores {
  const lists = ensureTacticalRoundCards(scores).map((r) => [...r])
  const idx = round - 1
  lists[idx] = lists[idx].filter((c) => c !== card)
  return { ...scores, tacticalRoundCards: lists }
}

export function deriveTacticalRoundCardsFromTally(scores: PlayerScores): string[][] {
  const lists = emptyRoundCardLists()
  const seen = lists.map(() => new Set<string>())
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (!card) continue
    for (let round = 1; round <= 5; round++) {
      if (getTallyCount(scores.secondaryScoreTally, key, round) > 0) {
        if (!seen[round - 1].has(card)) {
          seen[round - 1].add(card)
          lists[round - 1].push(card)
        }
      }
    }
  }
  return lists
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
  const exclusiveByGroup = new Map<string, number>()
  let total = 0

  for (const opt of options) {
    const key = card ? secondaryScoreKey(card, opt.id) : opt.id
    const vp = getTallyCount(tally, key, round) * opt.vp
    if (vp === 0) continue

    if (opt.exclusiveGroup) {
      exclusiveByGroup.set(
        opt.exclusiveGroup,
        Math.max(exclusiveByGroup.get(opt.exclusiveGroup) ?? 0, vp),
      )
    } else {
      total += vp
    }
  }

  for (const vp of exclusiveByGroup.values()) total += vp
  return total
}

function gameCategoryVp(
  tally: Record<string, number[]>,
  options: MissionScoreOption[],
  card?: string,
): number {
  let total = 0
  for (let round = 1; round <= 5; round++) {
    total += roundCategoryVp(tally, options, round, card)
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
  currentBattleRound?: number
  delta: 1 | -1
  secondaryCard?: string
  caps?: ScoringCaps
}): ScoreValidation {
  const caps = params.caps ?? DEFAULT_CAPS
  const { kind, option, allOptions, scores, player, battleRound, delta, secondaryCard, currentBattleRound } =
    params
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
    if (delta === 1 && scores.removedSecondaries.includes(secondaryCard) && !scores.tacticalHand.includes(secondaryCard)) {
      const hasScoreThisRound = Object.entries(scores.secondaryScoreTally).some(
        ([k, counts]) => k.startsWith(`${secondaryCard}::`) && (counts[battleRound - 1] ?? 0) > 0,
      )
      if (!hasScoreThisRound) {
        return { allowed: false, reason: 'Card discarded' }
      }
    }
    if (delta === 1) {
      const roundCards = secondaryCardsForRound(
        player,
        scores,
        battleRound,
        currentBattleRound,
      )
      if (!roundCards.includes(secondaryCard)) {
        return { allowed: false, reason: 'Not an active card' }
      }
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

  // Game/round caps are enforced in recalcVpFromTallies — tally may exceed capped VP.
  if (kind === 'secondary' && player.secondaryMode === 'fixed') {
    const card = secondaryCard!
    const allSecondaryCards = secondaryCardsForGameCap(player, scores)

    const cardGameVp = gameCategoryVp(scores.secondaryScoreTally, allOptions, card) + option.vp
    if (cardGameVp > caps.fixedSecondaryMaxPerCard) {
      return { allowed: false, reason: `Fixed card cap ${caps.fixedSecondaryMaxPerCard} VP` }
    }

    let totalSecondaryGame = 0
    for (const c of allSecondaryCards) {
      const opts = getMissionScoreOptions(c, player.secondaryMode)
      totalSecondaryGame += gameCategoryVp(scores.secondaryScoreTally, opts, c)
    }
    totalSecondaryGame += option.vp

    if (totalSecondaryGame > caps.fixedSecondaryMaxGame) {
      return { allowed: false, reason: `Secondary cap ${caps.fixedSecondaryMaxGame} VP/game` }
    }

    let roundSecondaryTotal = 0
    for (const c of allSecondaryCards) {
      const opts = getMissionScoreOptions(c, player.secondaryMode)
      const cardRoundVp = roundCategoryVp(scores.secondaryScoreTally, opts, battleRound, c)
      roundSecondaryTotal += c === card ? cardRoundVp + option.vp : cardRoundVp
    }
    if (roundSecondaryTotal > caps.tacticalSecondaryMaxRound) {
      return { allowed: false, reason: `Secondary cap ${caps.tacticalSecondaryMaxRound} VP/round` }
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
  while (counts.length < 5) counts.push(0)
  const idx = round - 1
  const next = (counts[idx] ?? 0) + delta
  if (next < 0) return null
  counts[idx] = next
  return { ...tally, [key]: counts }
}

/** Remove all VP tallies and round tracking for a secondary card. */
export function clearSecondaryScoresForCard(scores: PlayerScores, card: string): PlayerScores {
  const prefix = `${card}::`
  const secondaryScoreTally: Record<string, number[]> = {}
  for (const [key, counts] of Object.entries(scores.secondaryScoreTally)) {
    if (!key.startsWith(prefix) && key !== card) {
      secondaryScoreTally[key] = counts
    }
  }
  const tacticalRoundCards = scores.tacticalRoundCards.map((round) => round.filter((c) => c !== card))
  return { ...scores, secondaryScoreTally, tacticalRoundCards }
}

export function isSecondaryScoredThisRound(
  scores: PlayerScores,
  card: string,
  battleRound: number,
): boolean {
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (!key.startsWith(`${card}::`) && key !== card) continue
    if (getTallyCount(scores.secondaryScoreTally, key, battleRound) > 0) return true
  }
  return false
}

export function scoreOptionsForRound(
  options: MissionScoreOption[],
  battleRound: number,
): MissionScoreOption[] {
  return options.filter((option) => timingReason(option, battleRound) === null)
}

/** Fixed secondaries: repeatable options (e.g. each kill) use +/- counter instead of a checkbox. */
export function scoreOptionUsesCounter(option: MissionScoreOption): boolean {
  return option.maxCountPerRound === null
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

export function tacticalDrawPoolSize(scores: PlayerScores): number {
  const fullDeck = gameData.secondaries.tacticalDeck as string[]
  const removed = new Set(scores.removedSecondaries)
  if (scores.tacticalDeck.length > 0) {
    return scores.tacticalDeck.filter((c) => !removed.has(c)).length
  }
  const taken = new Set(scores.tacticalHand)
  return fullDeck.filter((c) => !taken.has(c) && !removed.has(c)).length
}

export function validateTacticalDraw(scores: PlayerScores): ScoreValidation {
  if (tacticalDrawPoolSize(scores) < 1) {
    return { allowed: false, reason: 'Deck empty' }
  }
  return { allowed: true }
}

export function tacticalDrawCount(scores: PlayerScores): number {
  return Math.min(1, tacticalDrawPoolSize(scores))
}

/** True when no further VP can be scored on this tactical card this round. */
export function isTacticalCardExhausted(
  card: string,
  scores: PlayerScores,
  player: PlayerSetup,
  battleRound: number,
  caps: ScoringCaps = DEFAULT_CAPS,
  currentBattleRound?: number,
): boolean {
  if (player.secondaryMode !== 'tactical') return false
  const options = scoreOptionsForRound(getMissionScoreOptions(card, 'tactical'), battleRound)
  if (!options.length) return false

  return !options.some((option) => {
    const check = validateScoreIncrement({
      kind: 'secondary',
      option,
      allOptions: getMissionScoreOptions(card, 'tactical'),
      scores,
      player,
      battleRound,
      currentBattleRound,
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
export type TacticalSecondaryStatus = 'hand' | 'scored-only'

export function tacticalSecondaryInventory(
  scores: PlayerScores,
): { card: string; status: TacticalSecondaryStatus }[] {
  const hand = new Set(scores.tacticalHand)
  const tallyCards = new Set<string>()
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card) tallyCards.add(card)
  }

  const ordered = [
    ...scores.tacticalHand,
    ...[...tallyCards].filter((c) => !hand.has(c)),
  ]
  const seen = new Set<string>()
  const result: { card: string; status: TacticalSecondaryStatus }[] = []
  for (const card of ordered) {
    if (seen.has(card)) continue
    seen.add(card)
    const status: TacticalSecondaryStatus = hand.has(card) ? 'hand' : 'scored-only'
    result.push({ card, status })
  }
  return result
}

export interface SecondaryCardRecap {
  card: string
  totalVp: number
  rounds: { round: number; vp: number }[]
  discarded: boolean
}

/** Per-card secondary scoring for end-of-game recap (rounds + discards). */
export function secondaryGameRecap(
  player: PlayerSetup,
  scores: PlayerScores,
  maxRound = 5,
): SecondaryCardRecap[] {
  const mode = player.secondaryMode
  const { discarded: discardedNoScore } = secondaryBriefBuckets(player, scores)
  const discardedSet = new Set(discardedNoScore)

  const allCards = new Set<string>()
  for (const c of player.secondaries) allCards.add(c)
  for (const c of scores.tacticalHand) allCards.add(c)
  for (const c of scores.removedSecondaries) allCards.add(c)
  for (const roundCards of scores.tacticalRoundCards) {
    for (const c of roundCards) allCards.add(c)
  }
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card) allCards.add(card)
  }

  const recaps: SecondaryCardRecap[] = []
  for (const card of [...allCards].sort((a, b) => a.localeCompare(b))) {
    const rounds: { round: number; vp: number }[] = []
    let totalVp = 0
    for (let round = 1; round <= maxRound; round++) {
      let vp = 0
      for (const opt of getMissionScoreOptions(card, mode)) {
        vp +=
          getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, opt.id), round) *
          opt.vp
      }
      if (vp > 0) {
        rounds.push({ round, vp })
        totalVp += vp
      }
    }
    const discarded = discardedSet.has(card)
    if (totalVp > 0 || discarded) {
      recaps.push({ card, totalVp, rounds, discarded })
    }
  }
  return recaps
}

/** Secondaries drawn or active but never scored (excludes discarded). */
export function secondaryUncompletedCards(
  player: PlayerSetup,
  scores: PlayerScores,
): string[] {
  const mode = player.secondaryMode
  const { discarded } = secondaryBriefBuckets(player, scores)
  const discardedSet = new Set(discarded)

  const obtained = new Set<string>()
  if (mode === 'tactical') {
    for (const c of scores.tacticalHand) obtained.add(c)
    for (const roundList of scores.tacticalRoundCards) {
      for (const c of roundList) obtained.add(c)
    }
  } else {
    for (const c of player.secondaries) obtained.add(c)
  }

  const uncompleted: string[] = []
  for (const card of obtained) {
    if (discardedSet.has(card)) continue
    if (secondaryCardVp(scores, card, mode) > 0) continue
    uncompleted.push(card)
  }
  return [...new Set(uncompleted)].sort((a, b) => a.localeCompare(b))
}

export interface SecondaryEndGameRoundItem {
  card: string
  vp: number | null
}

/** Scored + uncompleted secondaries grouped by round obtained (draw / game start). */
export function secondaryEndGameByRound(
  player: PlayerSetup,
  scores: PlayerScores,
  maxRound = 5,
): { round: number; items: SecondaryEndGameRoundItem[] }[] {
  const breakdown = missionBriefRoundBreakdown(player, scores)
  const uncompleted = new Set(secondaryUncompletedCards(player, scores))

  const obtainedRound = (card: string): number => {
    if (player.secondaryMode !== 'tactical') return 1
    let first: number | null = null
    for (let r = 1; r <= 5; r++) {
      if ((scores.tacticalRoundCards[r - 1] ?? []).includes(card)) {
        first = first === null ? r : Math.min(first, r)
      }
    }
    return first ?? 1
  }

  return Array.from({ length: maxRound }, (_, i) => {
    const round = i + 1
    const scored = breakdown.find((b) => b.round === round)?.secondaries ?? []
    const items: SecondaryEndGameRoundItem[] = scored.map(({ card, vp }) => ({ card, vp }))
    for (const card of uncompleted) {
      if (obtainedRound(card) === round) items.push({ card, vp: null })
    }
    items.sort((a, b) => a.card.localeCompare(b.card))
    return { round, items }
  })
}

export interface SecondaryBriefBuckets {
  active: string[]
  achieved: string[]
  discarded: string[]
}

export function secondaryCardVp(
  scores: PlayerScores,
  card: string,
  mode: SecondaryMode | null | undefined,
): number {
  let total = 0
  for (const opt of getMissionScoreOptions(card, mode)) {
    const key = secondaryScoreKey(card, opt.id)
    const counts = scores.secondaryScoreTally[key]
    if (!counts) continue
    for (const n of counts) total += n * opt.vp
  }
  return total
}

export interface MissionBriefRoundEntry {
  round: number
  primary: number
  secondaries: { card: string; vp: number }[]
}

export function missionBriefRoundBreakdown(
  player: PlayerSetup,
  scores: PlayerScores,
): MissionBriefRoundEntry[] {
  const cards = new Set<string>()
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card) cards.add(card)
  }

  return [1, 2, 3, 4, 5].map((round) => {
    const secondaries: { card: string; vp: number }[] = []
    for (const card of cards) {
      let vp = 0
      for (const opt of getMissionScoreOptions(card, player.secondaryMode)) {
        vp +=
          getTallyCount(scores.secondaryScoreTally, secondaryScoreKey(card, opt.id), round) *
          opt.vp
      }
      if (vp > 0) secondaries.push({ card, vp })
    }
    secondaries.sort((a, b) => a.card.localeCompare(b.card))
    return {
      round,
      primary: scores.primaryRoundVp[round - 1] ?? 0,
      secondaries,
    }
  })
}

/** Active hand, scored (done), and discarded secondaries for the mission brief. */
export function secondaryBriefBuckets(
  player: PlayerSetup,
  scores: PlayerScores,
): SecondaryBriefBuckets {
  const isTactical = player.secondaryMode === 'tactical'
  const hand = new Set(scores.tacticalHand)
  const mode = player.secondaryMode

  const removedList = isTactical
    ? [...scores.removedSecondaries]
    : player.secondaries.filter((s) => scores.removedSecondaries.includes(s))
  const removedSet = new Set(removedList)

  const active = isTactical
    ? [...scores.tacticalHand]
    : player.secondaries.filter((s) => !removedSet.has(s))

  const achieved: string[] = []
  const discarded: string[] = []

  for (const card of removedList) {
    if (secondaryCardVp(scores, card, mode) > 0) {
      achieved.push(card)
    } else {
      discarded.push(card)
    }
  }

  const tallyCards = new Set<string>()
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (card) tallyCards.add(card)
  }

  for (const card of tallyCards) {
    if (removedSet.has(card)) continue
    if (secondaryCardVp(scores, card, mode) <= 0) continue
    if (isTactical && hand.has(card)) continue
    achieved.push(card)
  }

  return { active, achieved, discarded }
}

function secondaryCardsForGameCap(player: PlayerSetup, scores: PlayerScores): string[] {
  if (player.secondaryMode === 'tactical') {
    const cards = new Set([...scores.tacticalHand])
    for (const key of Object.keys(scores.secondaryScoreTally)) {
      const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
      if (card) cards.add(card)
    }
    return [...cards]
  }
  return player.secondaries.filter((s) => !scores.removedSecondaries.includes(s))
}

export function secondaryCardsForRound(
  player: PlayerSetup,
  scores: PlayerScores,
  battleRound: number,
  currentBattleRound?: number,
): string[] {
  const cards = new Set<string>()
  const onLiveRound = currentBattleRound === undefined || battleRound === currentBattleRound

  if (player.secondaryMode === 'tactical') {
    for (const c of getTacticalRoundCards(scores, battleRound)) cards.add(c)
    if (onLiveRound) {
      for (const c of scores.tacticalHand) cards.add(c)
    }
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

/** Cards shown in the live scoring panel; stable order from this round's card list. */
export function tacticalPanelCards(
  player: PlayerSetup,
  scores: PlayerScores,
  battleRound: number,
  currentBattleRound: number,
): string[] {
  if (battleRound !== currentBattleRound) {
    return secondaryCardsForRound(player, scores, battleRound, currentBattleRound)
  }

  const seen = new Set<string>()
  const ordered: string[] = []

  for (const card of getTacticalRoundCards(scores, battleRound)) {
    if (!card || seen.has(card)) continue
    if (!isTacticalPanelCard(scores, card, battleRound)) continue
    seen.add(card)
    ordered.push(card)
  }

  for (const card of scores.tacticalHand) {
    if (seen.has(card)) continue
    seen.add(card)
    ordered.push(card)
  }

  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (getTallyCount(scores.secondaryScoreTally, key, battleRound) <= 0) continue
    const card = key.includes('::') ? key.slice(0, key.indexOf('::')) : key
    if (!card || seen.has(card)) continue
    if (!isTacticalPanelCard(scores, card, battleRound)) continue
    seen.add(card)
    ordered.push(card)
  }

  return ordered
}

function isTacticalPanelCard(scores: PlayerScores, card: string, battleRound: number): boolean {
  if (scores.tacticalHand.includes(card)) return true
  for (const key of Object.keys(scores.secondaryScoreTally)) {
    if (!key.startsWith(`${card}::`) && key !== card) continue
    if (getTallyCount(scores.secondaryScoreTally, key, battleRound) > 0) return true
  }
  return false
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
