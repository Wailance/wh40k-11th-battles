#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const woDir = join(root, 'public/data/warorgan/factions')

const CODEX_CHAPTERS = [
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
]

function loadJson(file) {
  return JSON.parse(readFileSync(join(woDir, file), 'utf8'))
}

function unitCount(file) {
  try {
    const data = loadJson(file)
    return data.Units?.length ?? 0
  } catch {
    return 0
  }
}

function legendsCount(mainFile) {
  const legFile = mainFile.replace(/\.json$/, ' Legends.json')
  try {
    return loadJson(legFile).Units?.length ?? 0
  } catch {
    return 0
  }
}

const smMain = unitCount('Space Marines.json')
const smLeg = legendsCount('Space Marines.json')
const smFloor = smMain + smLeg - 5

let errors = 0
for (const chapter of CODEX_CHAPTERS) {
  const file = `${chapter}.json`
  const chapterOnly = unitCount(file) + legendsCount(file)
  if (chapterOnly >= smFloor) {
    console.error(`✗ ${chapter}: chapter file alone has ${chapterOnly} units — merge may be redundant`)
    errors++
  }
  if (chapterOnly < 2) {
    console.error(`✗ ${chapter}: expected chapter supplement units, got ${chapterOnly}`)
    errors++
  }
}

if (smMain < 80) {
  console.error(`✗ Space Marines.json too small (${smMain})`)
  errors++
}

if (errors === 0) {
  console.log(`✓ codex chapter WO supplements OK (SM base ${smMain}+${smLeg} legends)`)
} else {
  process.exit(1)
}
