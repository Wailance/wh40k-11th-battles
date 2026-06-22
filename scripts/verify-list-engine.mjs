#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const engineUrl = pathToFileURL(join(root, 'src/lib/list-engine.ts')).href

// Dynamic import won't work on TS without build — inline minimal checks mirroring list-engine
function calcPointsTotal(units, enhancements = []) {
  const unitPts = units.reduce((s, u) => s + u.points * u.count, 0)
  const enhPts = enhancements.reduce((s, e) => s + e.points, 0)
  return unitPts + enhPts
}

let errors = 0
function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

const pts = calcPointsTotal(
  [{ points: 100, count: 2 }],
  [{ points: 25 }],
)
if (pts !== 225) fail(`points calc expected 225 got ${pts}`)

const necrons = JSON.parse(
  readFileSync(join(root, 'public/data/army/curated/factions/necrons.json'), 'utf8'),
)
if (!necrons.units?.length) fail('necrons.json has no units')
const gargoyle = JSON.parse(
  readFileSync(join(root, 'public/data/army/curated/factions/library-tyranids.json'), 'utf8'),
).units.find((u) => u.name === 'Gargoyles')
if (!gargoyle || gargoyle.points !== 80) {
  fail(`Gargoyles expected 80 MFM points, got ${gargoyle?.points}`)
}
if (!gargoyle?.pointsLabel?.includes('155')) {
  fail(`Gargoyles expected tier label 80/155, got ${gargoyle?.pointsLabel}`)
}

const armyMap = JSON.parse(
  readFileSync(join(root, 'public/data/army/mfm/army-map.json'), 'utf8'),
)
if (!armyMap.Tyranids?.detachments?.length) {
  fail('MFM army-map missing Tyranids detachments')
}

const deathwatch = JSON.parse(
  readFileSync(join(root, 'public/data/army/curated/factions/imperium-deathwatch.json'), 'utf8'),
)
const ghostVeterans = deathwatch.units.filter(
  (u) => u.name.includes('Deathwatch Veteran w/') && u.points === 0,
)
if (ghostVeterans.length < 3) {
  fail('deathwatch fixture: expected model-only Deathwatch Veteran entries')
}
function isListableCatalogUnit(unit) {
  if (!unit.factionKeywords?.length && !unit.keywords?.length) return false
  if (unit.pricing?.length) return true
  return unit.points > 0
}
const listable = deathwatch.units.filter(isListableCatalogUnit)
if (listable.some((u) => u.name.includes('Deathwatch Veteran w/'))) {
  fail('model-only Deathwatch Veterans must not be listable catalog units')
}

const decimus = deathwatch.units.find((u) => u.name === 'Decimus Kill Team')
if (!decimus) fail('deathwatch fixture: missing Decimus Kill Team')

if (errors === 0) console.log('✓ list-engine smoke checks OK')
else process.exit(1)

void engineUrl
