#!/usr/bin/env node
/**
 * Merge BSData/wh40k-11e-mfm (official MFM scrape) into curated army JSON.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mfmRepoDir = join(root, 'data/wh40k-11e-mfm')
const mfmOutDir = join(root, 'public/data/army/mfm')
const curatedDir = join(root, 'public/data/army/curated/factions')
const factionMapPath = join(root, 'src/data/faction-map.json')

/** MFM YAML slug → curated JSON filename stems (without .json) */
const MFM_TO_CURATED = {
  'adepta-sororitas': ['imperium-adepta-sororitas'],
  'adeptus-custodes': ['imperium-adeptus-custodes'],
  'adeptus-mechanicus': ['imperium-adeptus-mechanicus'],
  'aeldari': ['aeldari-aeldari-library', 'aeldari-craftworlds', 'aeldari-ynnari'],
  'astra-militarum': ['imperium-astra-militarum-library', 'imperium-astra-militarum'],
  'black-templars': ['imperium-black-templars'],
  'blood-angels': ['imperium-blood-angels'],
  'chaos-daemons': ['chaos-chaos-daemons-library', 'chaos-chaos-daemons'],
  'chaos-knights': ['chaos-chaos-knights-library', 'chaos-chaos-knights'],
  'chaos-space-marines': ['chaos-chaos-space-marines'],
  'chaos-titan-legions': ['chaos-titanicus-traitoris'],
  'dark-angels': ['imperium-dark-angels'],
  'death-guard': ['chaos-death-guard'],
  'deathwatch': ['imperium-deathwatch'],
  'drukhari': ['aeldari-drukhari', 'aeldari-aeldari-library'],
  'emperors-children': ['chaos-emperors-children'],
  'genestealer-cults': ['genestealer-cults'],
  'grey-knights': ['imperium-grey-knights'],
  'imperial-agents': ['imperium-agents-of-the-imperium'],
  'imperial-knights': ['imperium-imperial-knights-library', 'imperium-imperial-knights'],
  'leagues-of-votann': ['leagues-of-votann'],
  necrons: ['necrons'],
  orks: ['orks'],
  'space-marines': [
    'imperium-space-marines',
    'imperium-black-templars',
    'imperium-dark-angels',
    'imperium-deathwatch',
    'imperium-imperial-fists',
    'imperium-iron-hands',
    'imperium-raven-guard',
    'imperium-salamanders',
    'imperium-ultramarines',
    'imperium-white-scars',
    'imperium-blood-angels',
    'imperium-space-wolves',
  ],
  'space-wolves': ['imperium-space-wolves'],
  'tau-empire': ['tau-empire'],
  'thousand-sons': ['chaos-thousand-sons'],
  'titan-legions': ['library-titans', 'imperium-adeptus-titanicus'],
  tyranids: ['tyranids', 'library-tyranids'],
  'world-eaters': ['chaos-world-eaters'],
}

/** App army display name → MFM slug(s), in overlay order */
const ARMY_TO_MFM_SLUGS = {
  'Adepta Sororitas': ['adepta-sororitas'],
  'Adeptus Custodes': ['adeptus-custodes'],
  'Adeptus Mechanicus': ['adeptus-mechanicus'],
  Aeldari: ['aeldari'],
  'Astra Militarum': ['astra-militarum'],
  'Black Templar': ['black-templars', 'space-marines'],
  'Blood Angels': ['blood-angels', 'space-marines'],
  'Chaos Daemons': ['chaos-daemons'],
  'Chaos Knights': ['chaos-knights'],
  'Chaos Space Marines': ['chaos-space-marines'],
  'Dark Angels': ['dark-angels', 'space-marines'],
  'Death Guard': ['death-guard'],
  Deathwatch: ['deathwatch', 'space-marines'],
  Drukhari: ['drukhari'],
  'Emperor’s Children': ['emperors-children'],
  'Genestealer Cults': ['genestealer-cults'],
  'Grey Knights': ['grey-knights'],
  'Imperial Agents': ['imperial-agents'],
  'Imperial Knights': ['imperial-knights'],
  'League of Votann': ['leagues-of-votann'],
  Necrons: ['necrons'],
  Orks: ['orks'],
  'Space Marines': ['space-marines'],
  Ultramarines: ['space-marines'],
  'Raven Guard': ['space-marines'],
  'Imperial Fists': ['space-marines'],
  'Iron Hands': ['space-marines'],
  Salamanders: ['space-marines'],
  'White Scars': ['space-marines'],
  'Space Wolves': ['space-wolves', 'space-marines'],
  'Thousand Sons': ['thousand-sons'],
  Tyranids: ['tyranids'],
  'T’au Empire': ['tau-empire'],
  'World Eaters': ['world-eaters'],
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function defaultPoints(pricing) {
  if (!pricing?.length) return null
  const first = pricing[0]?.costs?.[0]
  return first?.points ?? null
}

function formatPointsLabel(pricing) {
  if (!pricing?.length) return null
  const costs = pricing[0]?.costs ?? []
  if (!costs.length) return null
  if (costs.length === 1) return String(costs[0].points)
  return costs.map((c) => c.points).join('/')
}

function buildUnitIndex(mfmFaction) {
  const index = new Map()
  for (const unit of mfmFaction.units ?? []) {
    index.set(normalizeName(unit.name), unit)
  }
  return index
}

function mergeUnitsIntoCurated(curatedPath, unitIndex) {
  if (!existsSync(curatedPath)) return { matched: 0, total: 0 }
  const faction = JSON.parse(readFileSync(curatedPath, 'utf8'))
  let matched = 0
  for (const unit of faction.units) {
    const mfm = unitIndex.get(normalizeName(unit.name))
    if (!mfm?.pricing) continue
    matched++
    const pts = defaultPoints(mfm.pricing)
    if (pts != null) unit.points = pts
    unit.pricing = mfm.pricing
    unit.pointsLabel = formatPointsLabel(mfm.pricing)
    if (mfm.legends) unit.legends = true
    if (mfm.role) unit.mfmRole = mfm.role
    if (mfm.attachTo) unit.attachTo = mfm.attachTo
  }
  writeFileSync(curatedPath, `${JSON.stringify(faction, null, 2)}\n`)
  return { matched, total: faction.units.length }
}

function toDetachment(d) {
  return {
    name: d.name,
    dp: d.dp,
    objective: d.objective ?? '',
    enhancements: (d.enhancements ?? []).map((e) => ({
      name: e.name,
      points: e.points,
      detachment: d.name,
    })),
  }
}

if (!existsSync(mfmRepoDir)) {
  console.log('Cloning BSData/wh40k-11e-mfm (shallow)...')
  mkdirSync(join(root, 'data'), { recursive: true })
  execSync(
    `git clone --depth 1 https://github.com/BSData/wh40k-11e-mfm.git "${mfmRepoDir}"`,
    { stdio: 'inherit' },
  )
}

mkdirSync(join(mfmOutDir, 'factions'), { recursive: true })

const metaRaw = readFileSync(join(mfmRepoDir, 'data/meta.yaml'), 'utf8')
const meta = parseYaml(metaRaw)
writeFileSync(join(mfmOutDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)

const yamlFiles = readdirSync(join(mfmRepoDir, 'data')).filter(
  (f) => f.endsWith('.yaml') && f !== 'meta.yaml',
)

const factionBySlug = new Map()
let totalMatched = 0
let totalUnits = 0

for (const file of yamlFiles) {
  const slug = file.replace(/\.yaml$/, '')
  const parsed = parseYaml(readFileSync(join(mfmRepoDir, 'data', file), 'utf8'))
  factionBySlug.set(slug, parsed)

  const out = {
    slug,
    name: parsed.name,
    version: parsed.version,
    firstSeen: parsed.firstSeen,
    detachments: (parsed.detachments ?? []).map(toDetachment),
    units: (parsed.units ?? []).map((u) => ({
      name: u.name,
      normalizedName: normalizeName(u.name),
      pricing: u.pricing,
      points: defaultPoints(u.pricing),
      pointsLabel: formatPointsLabel(u.pricing),
      legends: u.legends ?? false,
      role: u.role,
      attachTo: u.attachTo,
    })),
  }
  writeFileSync(join(mfmOutDir, 'factions', `${slug}.json`), `${JSON.stringify(out, null, 2)}\n`)

  const curatedSlugs = MFM_TO_CURATED[slug] ?? []
  const unitIndex = buildUnitIndex(parsed)
  for (const curatedSlug of curatedSlugs) {
    const result = mergeUnitsIntoCurated(join(curatedDir, `${curatedSlug}.json`), unitIndex)
    totalMatched += result.matched
    totalUnits += result.total
    if (result.matched > 0) {
      console.log(`  ${slug} → ${curatedSlug}: ${result.matched}/${result.total} units`)
    }
  }
}

const armyMap = {}
for (const [army, slugs] of Object.entries(ARMY_TO_MFM_SLUGS)) {
  const detachments = []
  const enhancements = []
  const seenDet = new Set()
  for (const slug of slugs) {
    const f = factionBySlug.get(slug)
    if (!f) continue
    for (const d of f.detachments ?? []) {
      if (seenDet.has(d.name)) continue
      seenDet.add(d.name)
      detachments.push(toDetachment(d))
      enhancements.push(...toDetachment(d).enhancements)
    }
  }
  armyMap[army] = {
    slugs,
    version: meta.version,
    lastUpdated: meta.lastUpdated,
    detachments,
    enhancements,
  }
}
writeFileSync(join(mfmOutDir, 'army-map.json'), `${JSON.stringify(armyMap, null, 2)}\n`)

const factionMap = JSON.parse(readFileSync(factionMapPath, 'utf8'))
factionMap.dataEdition = `11e-mfm-${meta.version ?? '1.0'}`
factionMap.disclaimer =
  'Unit points from the official Munitorum Field Manual (via BSData/wh40k-11e-mfm). Datasheets from BSData/wh40k-10e. Detachments and enhancements from MFM.'
writeFileSync(factionMapPath, `${JSON.stringify(factionMap, null, 2)}\n`)

console.log(`\nMFM merge: ${totalMatched} unit point updates across curated catalogues`)
console.log(`MFM output → ${mfmOutDir}/`)
console.log(`Army map: ${Object.keys(armyMap).length} factions`)
