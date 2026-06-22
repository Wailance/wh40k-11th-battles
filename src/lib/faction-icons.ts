import type { Allegiance } from './army-allegiance'
import { publicUrl } from './public-url'

function iconPath(file: string): string {
  return publicUrl(`/icons/factions/${file}`)
}

export const ALLEGIANCE_ICON_SRC: Record<Allegiance, string> = {
  imperium: iconPath('allegiance-imperium.svg'),
  'space-marines': iconPath('allegiance-space-marines.svg'),
  knights: iconPath('allegiance-knights.svg'),
  chaos: iconPath('allegiance-chaos.svg'),
  'hive-fleet': iconPath('allegiance-hive-fleet.svg'),
  aeldari: iconPath('allegiance-aeldari.svg'),
  xenos: iconPath('allegiance-xenos.svg'),
}

/** Army display name → icon filename in public/icons/factions */
const ARMY_ICON_FILE: Record<string, string> = {
  'Adepta Sororitas': 'adepta-sororitas.svg',
  'Adeptus Custodes': 'adeptus-custodes.svg',
  'Adeptus Mechanicus': 'adeptus-mechanicus.svg',
  Aeldari: 'aeldari.svg',
  'Astra Militarum': 'astra-militarum.svg',
  'Black Templar': 'black-templar.svg',
  'Blood Angels': 'blood-angels.svg',
  'Chaos Daemons': 'chaos-daemons.svg',
  'Chaos Knights': 'chaos-knights.svg',
  'Chaos Space Marines': 'chaos-space-marines.svg',
  'Dark Angels': 'dark-angels.svg',
  'Death Guard': 'death-guard.svg',
  Deathwatch: 'deathwatch.svg',
  Drukhari: 'drukhari.svg',
  "Emperor\u2019s Children": 'emperors-children.svg',
  'Genestealer Cults': 'genestealer-cults.svg',
  'Grey Knights': 'grey-knights.svg',
  'Imperial Agents': 'imperial-agents.svg',
  'Imperial Knights': 'imperial-knights.svg',
  'League of Votann': 'league-of-votann.svg',
  Necrons: 'necrons.svg',
  Orks: 'orks.svg',
  'Space Marines': 'space-marines.svg',
  'Space Wolves': 'space-wolves.svg',
  Ultramarines: 'ultramarines.svg',
  'Raven Guard': 'raven-guard.svg',
  'Imperial Fists': 'imperial-fists.svg',
  'Iron Hands': 'iron-hands.svg',
  Salamanders: 'salamanders.svg',
  'White Scars': 'white-scars.svg',
  'Thousand Sons': 'thousand-sons.svg',
  Tyranids: 'tyranids.svg',
  "T\u2019au Empire": 'tau-empire.svg',
  'World Eaters': 'world-eaters.svg',
}

export function armyIconSrc(army: string): string {
  const file = ARMY_ICON_FILE[army]
  return file ? iconPath(file) : ALLEGIANCE_ICON_SRC.imperium
}

export const ALLEGIANCE_ICON_COLORS: Record<Allegiance, string> = {
  imperium: 'var(--color-accent)',
  'space-marines': 'var(--color-crimson-bright)',
  knights: 'var(--color-gw-gold)',
  chaos: 'var(--color-status-danger)',
  'hive-fleet': 'var(--color-fd-green)',
  aeldari: 'var(--color-p2)',
  xenos: 'var(--color-fd-teal)',
}
