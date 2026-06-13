export const PRE_BATTLE_STEPS = [
  {
    id: 'formations',
    step: 7,
    title: 'Declare Battle Formations',
    body: 'Note transports and strategic reserves, then reveal.',
  },
  {
    id: 'deploy',
    step: 8,
    title: 'Deploy Armies',
    body: 'Defender sets up first, one unit at a time. Titanic skips your next setup turn.',
  },
  {
    id: 'redeploy',
    step: 9,
    title: 'Redeploy Units',
    body: 'Alternate redeploy rules, Attacker first. Reserves placed here ignore the 25% cap.',
  },
  {
    id: 'first-turn',
    step: 10,
    title: 'Determine First Turn',
    body: 'Roll off — winner takes the first turn.',
  },
  {
    id: 'pre-battle-rules',
    step: 11,
    title: 'Resolve Pre-battle Rules',
    body: 'Alternate pre-battle rules, first-turn player starts.',
  },
] as const
