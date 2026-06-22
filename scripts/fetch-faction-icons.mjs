/**
 * Downloads WH40K faction SVG icons from Certseeds/wh40k-icon (CC-BY-NC-SA).
 * https://github.com/Certseeds/wh40k-icon
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/icons/factions')
const CDN = 'https://cdn.jsdelivr.net/gh/Certseeds/wh40k-icon@master'

/** local filename -> repo path under src/svgs */
const ICONS = {
  // allegiance groups
  'allegiance-imperium.svg': 'human_imperium/adeptus-terra.svg',
  'allegiance-space-marines.svg': 'human_imperium/adeptus-astartes.svg',
  'allegiance-knights.svg': 'human_imperium/questor-imperialis.svg',
  'allegiance-chaos.svg': 'chaos/chaos-star-01.svg',
  'allegiance-chaos-daemons.svg': 'chaos/chaos-daemons.svg',
  'allegiance-hive-fleet.svg': 'xenos/tyranids.svg',
  'allegiance-aeldari.svg': 'xenos/eldar/craftworld-eldar.svg',
  'allegiance-xenos.svg': 'xenos/xenos.svg',

  // armies
  'adepta-sororitas.svg': 'human_imperium/adepta-sororitas.svg',
  'adeptus-custodes.svg': 'human_imperium/adeptus-custodes.svg',
  'adeptus-mechanicus.svg': 'human_imperium/adeptus-mechanicus.svg',
  'aeldari.svg': 'xenos/eldar/craftworld-eldar.svg',
  'astra-militarum.svg': 'human_imperium/astra-militarum.svg',
  'black-templar.svg': 'human_imperium/astartes_chapters/black-templars.svg',
  'blood-angels.svg': 'human_imperium/astartes_legion/blood-angels.svg',
  'chaos-daemons.svg': 'chaos/chaos-daemons.svg',
  'chaos-knights.svg': 'chaos/questor-traitoris.svg',
  'chaos-space-marines.svg': 'chaos/heretic-astartes.svg',
  'dark-angels.svg': 'human_imperium/astartes_legion/dark-angels.svg',
  'death-guard.svg': 'chaos/legions/death-guard.svg',
  'deathwatch.svg': 'human_imperium/astartes_chapters/deathwatch.svg',
  'drukhari.svg': 'xenos/durhkari/drukhari-2.svg',
  'emperors-children.svg': 'chaos/legions/emperors-children-1.svg',
  'genestealer-cults.svg': 'xenos/genestealer_cult/genestealer-cults.svg',
  'grey-knights.svg': 'human_imperium/astartes_chapters/grey-knights.svg',
  'imperial-agents.svg': 'human_imperium/inquisition-02.svg',
  'imperial-knights.svg': 'human_imperium/imperial-knights.svg',
  'league-of-votann.svg': 'xenos/leagues-of-votann.svg',
  'necrons.svg': 'xenos/necrons/necrons.svg',
  'orks.svg': 'xenos/orks/orks.svg',
  'space-marines.svg': 'human_imperium/astartes_legion/ultramarines.svg',
  'ultramarines.svg': 'human_imperium/astartes_legion/ultramarines.svg',
  'raven-guard.svg': 'human_imperium/astartes_legion/raven-guard.svg',
  'imperial-fists.svg': 'human_imperium/astartes_legion/imperial-fists.svg',
  'iron-hands.svg': 'human_imperium/astartes_legion/iron-hands.svg',
  'salamanders.svg': 'human_imperium/astartes_legion/salamanders.svg',
  'white-scars.svg': 'human_imperium/astartes_legion/white-scars.svg',
  'space-wolves.svg': 'human_imperium/astartes_legion/space-wolves.svg',
  'thousand-sons.svg': 'chaos/legions/thousand-sons.svg',
  'tyranids.svg': 'xenos/tyranids.svg',
  'tau-empire.svg': 'xenos/tau_empire/tau-sept.svg',
  'world-eaters.svg': 'chaos/legions/world-eaters-1.svg',
}

function normalizeSvg(raw) {
  return raw
    .replace(/fill\s*=\s*["']#(?:000|000000|08060d|080808|111|222)["']/gi, 'fill="currentColor"')
    .replace(/<path(?![^>]*fill=)/gi, '<path fill="currentColor"')
}

await mkdir(outDir, { recursive: true })

let ok = 0
let fail = 0
for (const [local, repoPath] of Object.entries(ICONS)) {
  const url = `${CDN}/src/svgs/${repoPath}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const svg = normalizeSvg(await res.text())
    await writeFile(join(outDir, local), svg, 'utf8')
    ok++
    console.log(`✓ ${local}`)
  } catch (err) {
    fail++
    console.error(`✗ ${local}: ${err.message}`)
  }
}

console.log(`\nDone: ${ok} saved, ${fail} failed → ${outDir}`)
