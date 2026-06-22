/** Maps roster.army (our builder name) → faction JSON filename. */
export const WAR_ORGAN_ARMY_FILES: Record<string, string> = {
  'Adepta Sororitas': 'Adepta Sororitas.json',
  'Adeptus Custodes': 'Adeptus Custodes.json',
  'Adeptus Mechanicus': 'Adeptus Mechanicus.json',
  'Adeptus Titanicus': 'Adeptus Titanicus.json',
  Aeldari: 'Aeldari.json',
  'Astra Militarum': 'Astra Militarum.json',
  'Black Templar': 'Black Templars.json',
  'Blood Angels': 'Blood Angels.json',
  'Chaos Daemons': 'Chaos Daemons.json',
  'Chaos Knights': 'Chaos Knights.json',
  'Chaos Space Marines': 'Chaos Space Marines.json',
  'Dark Angels': 'Dark Angels.json',
  'Death Guard': 'Death Guard.json',
  Deathwatch: 'Deathwatch.json',
  Drukhari: 'Drukhari.json',
  "Emperor's Children": "Emperor's Children.json",
  'Genestealer Cults': 'Genestealer Cults.json',
  'Grey Knights': 'Grey Knights.json',
  'Agents of the Imperium': 'Imperial Agents.json',
  'Imperial Knights': 'Imperial Knights.json',
  'Iron Hands': 'Iron Hands.json',
  'Leagues of Votann': 'Leagues of Votann.json',
  Necrons: 'Necrons.json',
  Orks: 'Orks.json',
  'Raven Guard': 'Raven Guard.json',
  Salamanders: 'Salamanders.json',
  'Space Marines': 'Space Marines.json',
  'Space Wolves': 'Space Wolves.json',
  'Tau Empire': 'Tau Empire.json',
  'Thousand Sons': 'Thousand Sons.json',
  Tyranids: 'Tyranids.json',
  Ultramarines: 'Ultramarines.json',
  'White Scars': 'White Scars.json',
  'World Eaters': 'World Eaters.json',
  'Imperial Fists': 'Imperial Fists.json',
  'Imperial Agents': 'Imperial Agents.json',
}

export function warOrganFactionFile(army: string): string | undefined {
  return WAR_ORGAN_ARMY_FILES[army]
}

export function warOrganUnitId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `wo:${slug}`
}
