/** Warhammer Doubles Event Companion v1.0 */

export const DOUBLES_COMPANION_PDF =
  'https://assets.warhammer-community.com/eng_12-06_warhammer40000_doubles_event_companion-xyapytrwkz-9a6fljmnob.pdf'

export const DOUBLES_TERMINOLOGY = [
  {
    title: 'Team',
    body: 'Two players whose armies fight as a single force against another team.',
  },
  {
    title: 'Shared limits',
    body: 'Epic Heroes, once-per-army units, enhancements and duplicate Upgrades cannot appear in both armies on the same team.',
  },
  {
    title: 'Warlord',
    body: 'Each team selects one CHARACTER from either army as their Warlord.',
  },
  {
    title: 'Force Disposition',
    body: 'Each team selects one FD available to either army and records it on the team roster.',
  },
  {
    title: 'Turns',
    body: 'Both players on a team take their turn together, as if they were a single player.',
  },
] as const

export const DOUBLES_MISSION_SEQUENCE = [
  {
    step: 1,
    title: 'Muster Armies',
    when: 'Before the event',
    body: 'Each team of two musters with shared once-per-army limits, one team Warlord, and one Force Disposition for the team.',
  },
  {
    step: 2,
    title: 'Determine Mission',
    when: 'At the table',
    body: 'Each team finds the opponents’ FD on their FD card — that Primary Mission is the team’s mission for VP.',
  },
  { step: 3, title: 'Determine a Layout', when: 'At the table', body: 'Layouts A/B/C from the Event Companion for the mission pairing.' },
  { step: 4, title: 'Create the Battlefield', when: 'At the table', body: '44" × 60" — terrain per layout.' },
  { step: 5, title: 'Attacker and Defender', when: 'At the table', body: 'Roll off — winner chooses which team is Attacker.' },
  {
    step: 6,
    title: 'Select Secondary Missions',
    when: 'At the table',
    body: 'Each team chooses Fixed or Tactical as a team. Tactical: 2 active cards per Command phase; achieve/discard rules apply to the team.',
  },
  {
    step: 7,
    title: 'Declare Battle Formations',
    when: 'Pre-battle',
    body: 'Note Transports and strategic reserves per player; reveal simultaneously.',
  },
  { step: 8, title: 'Deploy Armies', when: 'Pre-battle', body: 'Teams alternate unit setup, Defender first. TITANIC skips team’s next setup turn.' },
  { step: 9, title: 'Redeploy Units', when: 'Pre-battle', body: 'Teams alternate, Attacker first.' },
  { step: 10, title: 'Determine First Turn', when: 'Pre-battle', body: 'Roll off — winning team takes first turn.' },
  { step: 11, title: 'Resolve Pre-battle Rules', when: 'Pre-battle', body: 'Teams alternate from first-turn team.' },
  { step: 12, title: 'Begin the Battle', when: 'Battle', body: 'Team members play their turn together.' },
  { step: 13, title: 'End the Battle', when: 'Battle', body: 'Five rounds. Continue if a team has no models left.' },
  {
    step: 14,
    title: 'Determine Victor',
    when: 'After battle',
    body: 'Team VP totals. Battle Ready +10 VP per team. Caps: Primary 45, Secondaries 45 (15/round, 20/fixed card), Battle Ready 10.',
  },
] as const
