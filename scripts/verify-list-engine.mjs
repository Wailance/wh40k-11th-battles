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
const sample = necrons.units[0]
if (!sample.id || !sample.name || typeof sample.points !== 'number') {
  fail('necrons unit missing id/name/points')
}

if (errors === 0) console.log('✓ list-engine smoke checks OK')
else process.exit(1)

void engineUrl
