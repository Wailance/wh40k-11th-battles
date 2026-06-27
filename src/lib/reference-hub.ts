import { armies } from './game-utils'
import { allForceDispositions } from './force-disposition-reference'
import { FIXED_SECONDARIES, PRIMARY_DECKS, TACTICAL_SECONDARIES } from './mission-reference'
import { ruleCount } from './rules-index'

export type HubSection = {
  to: string
  titleKey: keyof typeof import('./copy').copy.reference
  descKey: keyof typeof import('./copy').copy.reference | 'dynamic'
  dynamicDesc?: () => string
}

/** GDM-style hub order for 11th Edition reference. */
export function hubSections(): { to: string; title: string; description: string }[] {
  const primaryCount = Object.values(PRIMARY_DECKS).flat().length
  const fdCount = allForceDispositions().length
  const detCount = armies.reduce((n, a) => n + a.detachments.length, 0)

  return [
    {
      to: '/missions/primary',
      title: 'Primary Missions',
      description: `The five primary mission decks — ${fdCount} Force Dispositions · ${primaryCount} cards. Tap any card for full text.`,
    },
    {
      to: '/missions/secondary',
      title: 'Secondary Missions',
      description: `${TACTICAL_SECONDARIES.length}-card tactical pool and ${FIXED_SECONDARIES.length} fixed options · max 40 / 20 VP.`,
    },
    {
      to: '/dispositions',
      title: 'Force Disposition',
      description: 'Disposition cards that set your primary mission deck and pair with the matrix.',
    },
    {
      to: '/matrix',
      title: 'Matrix',
      description: 'Cross-reference both players’ dispositions to find each primary mission and layout #.',
    },
    {
      to: '/detachments',
      title: 'Detachment Points',
      description: `${armies.length} factions · ${detCount} detachments with FD and DP cost.`,
    },
    {
      to: '/rules',
      title: 'Rules',
      description: `Browse and search ${ruleCount()} rules from Core Rules and Event Companion excerpts.`,
    },
  ]
}
