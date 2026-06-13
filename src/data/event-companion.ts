/** Warhammer Event Companion v1.0 — mission sequence, errata, FAQ */

export const EVENT_COMPANION_PDF =
  'https://assets.warhammer-community.com/eng_12-06_warhammer40000_event_companion-s3bfb5f9s1-ivswuij3fo.pdf'

export const MISSION_SEQUENCE = [
  {
    step: 1,
    title: 'Muster Armies',
    when: 'Before the event',
    body: 'Muster in the Warhammer 40,000 app. After mustering, each player selects one Force Disposition available to them and records it on their roster.',
  },
  {
    step: 2,
    title: 'Determine Mission',
    when: 'At the table',
    body: 'Each player finds their opponent’s Force Disposition symbol on their Force Disposition card. The Primary Mission below that symbol is that player’s Primary Mission for scoring VP.',
  },
  {
    step: 3,
    title: 'Determine a Layout',
    when: 'At the table',
    body: 'Each Primary Mission pairing has three recommended layouts: A, B and C. Use the layout specified by the organiser, or randomly determine which to use.',
  },
  {
    step: 4,
    title: 'Create the Battlefield',
    when: 'At the table',
    body: 'Play on a 44" × 60" battlefield. Set up terrain areas as shown in the selected layout, then place terrain features on those areas.',
  },
  {
    step: 5,
    title: 'Determine Attacker and Defender',
    when: 'At the table',
    body: 'Agree which table edges are Attacker’s and Defender’s. Roll off — the winner chooses who is Attacker and who is Defender.',
  },
  {
    step: 6,
    title: 'Select Secondary Missions',
    when: 'At the table',
    body: 'Secretly choose Tactical or Fixed Secondaries. If Fixed, also note which two Fixed Missions you will use, then reveal.',
    sub: [
      'Fixed: display both cards face-up; they stay active all battle and cannot be discarded.',
      'Tactical: shuffle your deck. At the start of each Command phase, draw until you have two active cards.',
      'Once per battle: at end of your Command phase, spend 1CP to discard one active tactical card and draw one new card.',
      'At end of each player’s turn (active player first): score VP from met secondaries; tactical cards you score from are achieved and discarded.',
      'On your turn with tactical: you may discard one or more active secondaries to gain 1CP each.',
    ],
  },
  {
    step: 7,
    title: 'Declare Battle Formations',
    when: 'Pre-battle',
    body: 'Secretly note, in order: units embarked in which Transports; units starting in strategic reserves. Reveal simultaneously.',
  },
  {
    step: 8,
    title: 'Deploy Armies',
    when: 'Pre-battle',
    body: 'Alternate setting up one unit at a time wholly in deployment zones, Defender first. Setting up a TITANIC unit skips your next setup turn.',
  },
  {
    step: 9,
    title: 'Redeploy Units',
    when: 'Pre-battle',
    body: 'Alternate resolving redeploy rules, Attacker first. Units placed into strategic reserves here do not count toward the 25% strategic reserves limit.',
  },
  {
    step: 10,
    title: 'Determine First Turn',
    when: 'Pre-battle',
    body: 'Roll off — winner takes the first turn.',
  },
  {
    step: 11,
    title: 'Resolve Pre-battle Rules',
    when: 'Pre-battle',
    body: 'Alternate resolving pre-battle rules, starting with the player who takes the first turn.',
  },
  {
    step: 12,
    title: 'Begin the Battle',
    when: 'Battle',
    body: 'The first battle round begins.',
  },
  {
    step: 13,
    title: 'End the Battle',
    when: 'Battle',
    body: 'The battle ends after five battle rounds. Continue taking turns even if one army has no models left.',
  },
  {
    step: 14,
    title: 'Determine Victor',
    when: 'After battle',
    body: 'Each player scores 10VP if Battle Ready. Most VP wins; tie = draw. Caps: Primary 45VP (15/round), Secondaries 45VP (15/round, 20/card fixed), Battle Ready 10VP.',
  },
] as const

export const MISSION_ERRATA: { title: string; body: string }[] = [
  {
    title: 'Chapter Approved Mission Deck',
    body: 'When playing a Warhammer Event Mission, no card errata are currently listed in the Event Companion v1.0.',
  },
]

export const MISSION_FAQ = [
  {
    q: 'Can I remove operation markers placed by a Primary Mission?',
    a: 'Your Primary Mission card specifies how and when you can remove them. If it does not, you cannot remove operation markers.',
  },
  {
    q: 'Death Trap: must the terrain area have been trapped when the enemy unit was destroyed?',
    a: 'No. The terrain area does not have to have been trapped at the moment the unit was destroyed.',
  },
  {
    q: 'Surveil the Foe: can I score if I remove the operation marker after surveilling, same turn?',
    a: 'Yes, as long as the enemy unit was within range of an objective with an operation marker when surveilled.',
  },
  {
    q: 'Vital Link: multiple central objectives — cumulative VP for operation markers?',
    a: 'Yes, if you control the objective(s) those operation markers are within.',
  },
] as const

export const DESIGNER_NOTES = [
  {
    title: 'Cumulative and OR',
    body: 'Cumulative: scoring the cumulative condition awards VP for both it and the normal condition. OR: only one OR tier or the normal condition per card.',
  },
  {
    title: 'Leaves the battlefield',
    body: 'A unit leaves the battlefield if destroyed, embarks on a Transport, or a rule removes it (e.g. strategic reserves).',
  },
  {
    title: 'ONE',
    body: 'When a card states “one” (underlined), it means exactly one — not one or more.',
  },
  {
    title: 'VP up to a limit',
    body: 'Excess VP above a stated limit (e.g. up to 5VP) are ignored.',
  },
  {
    title: 'When Drawn',
    body: 'The “When Drawn” section on Secondary Mission cards applies only when using Tactical Secondary Missions.',
  },
  {
    title: 'Deployment and Twist cards',
    body: 'The Event Companion does not use Deployment or Twist cards from the full Mission Deck — those are for pick-up-and-play.',
  },
] as const
