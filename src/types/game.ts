export type ForceDisposition =
  | 'PURGE THE FOE'
  | 'TAKE AND HOLD'
  | 'PRIORITY ASSETS'
  | 'RECONNAISSANCE'
  | 'DISRUPTION'

export type SecondaryMode = 'fixed' | 'tactical'

export type ArmyCategory = 'chaos' | 'imperium' | 'space-marines' | 'xenos'

export interface Detachment {
  name: string
  dp: number
  note: string
  forceDisposition: ForceDisposition
}

export interface Army {
  army: string
  category: ArmyCategory
  factionPackUrl: string
  detachments: Detachment[]
}

export interface SelectedDetachment {
  name: string
  dp: number
  note: string
  forceDisposition: ForceDisposition
}

export interface PlayerScores {
  vp: number
  primaryVp: number
  secondaryVp: number
  roundVp: number[]
  primaryRoundVp: number[]
  secondaryRoundVp: number[]
  tacticalHand: string[]
  tacticalDeck: string[]
  /** Tactical: achieved this battle — kept for review, not active */
  tacticalAchieved: string[]
  /** Tactical: once per battle CP reroll used */
  tacticalRerollUsed: boolean
  /** Extra CP gained this battle round (max 1 beyond Command phase) */
  extraCpThisRound: number
  /** Fixed mode: secondaries removed from active scoring */
  removedSecondaries: string[]
  /** Per-mission score button tallies (option id → counts per round) */
  primaryScoreTally: Record<string, number[]>
  /** Secondary tallies keyed as `card::optionId` */
  secondaryScoreTally: Record<string, number[]>
}

export interface PlayerSetup {
  name: string
  army: string
  detachments: SelectedDetachment[]
  forceDisposition: ForceDisposition
  primaryMission: string
  secondaryMode: SecondaryMode | null
  secondaries: string[]
  /** Painted to Battle Ready standard (+10 VP, GW Tournament Companion) */
  battleReady: boolean
}

export interface GameState {
  id: string
  createdAt: string
  status: 'setup' | 'active' | 'finished'
  matchupId: number | null
  /** Index into matchup terrain layout variants (0–2) */
  layoutVariantIndex: number
  player1: PlayerSetup
  player2: PlayerSetup
  firstPlayer: 1 | 2
  attacker: 1 | 2
  battleRound: number
  /** Pre-battle checklist (steps 7–11) */
  preBattleChecks: boolean[]
  scores: {
    player1: PlayerScores
    player2: PlayerScores
  }
  notes: string
}

export interface RuleEntry {
  category: string
  title: string
  body: string
  link: string
}
