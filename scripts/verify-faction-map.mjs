#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gameData = JSON.parse(readFileSync(join(root, 'src/data/game-data.json'), 'utf8'))
const factionMap = JSON.parse(readFileSync(join(root, 'src/data/faction-map.json'), 'utf8'))
const factionsDir = join(root, 'public/data/army/curated/factions')

let errors = 0

function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

const armies = gameData.armies.map((a) => a.army)
const mapped = new Set(factionMap.mappings.map((m) => m.army))

for (const army of armies) {
  if (!mapped.has(army)) fail(`Missing faction-map entry for "${army}"`)
}

const BUILDER_ONLY_ARMIES = [
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
]

for (const m of factionMap.mappings) {
  if (!armies.includes(m.army) && !BUILDER_ONLY_ARMIES.includes(m.army)) {
    fail(`faction-map orphan army "${m.army}"`)
  }
  if (!m.slugs?.length) fail(`${m.army}: no slugs`)
  for (const slug of m.slugs) {
    const path = join(factionsDir, `${slug}.json`)
    if (!existsSync(path)) fail(`${m.army}: missing ${slug}.json`)
  }
  for (const supplement of m.unitSupplements ?? []) {
    const path = join(factionsDir, `${supplement.slug}.json`)
    if (!existsSync(path)) fail(`${m.army}: missing supplement ${supplement.slug}.json`)
    if (!supplement.names?.length) fail(`${m.army}: empty unitSupplements.names for ${supplement.slug}`)
  }
}

if (errors === 0) {
  console.log(`✓ faction-map OK (${factionMap.mappings.length} armies)`)
  process.exit(0)
}
console.error(`FAILED: ${errors} error(s)`)
process.exit(1)
