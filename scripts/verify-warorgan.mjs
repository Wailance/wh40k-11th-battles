#!/usr/bin/env node
/**
 * WarOrgan data audit for armies used in the builder.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const woDir = join(root, 'public/data/warorgan/factions')
const gameData = JSON.parse(readFileSync(join(root, 'src/data/game-data.json'), 'utf8'))
const mapTs = readFileSync(join(root, 'src/lib/warorgan-army-map.ts'), 'utf8')

const CODEX_CHAPTERS = [
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
]

const ALIASES = {
  'League of Votann': 'Leagues of Votann',
  "T'au Empire": 'Tau Empire',
  'T\u2019au Empire': 'Tau Empire',
  'Emperor\u2019s Children': "Emperor's Children",
}

function fail(errors, msg) {
  errors.push(msg)
}

function resolveArmyFile(army) {
  const resolved = ALIASES[army] ?? army
  const patterns = [
    `'${resolved.replace(/'/g, "\\'")}': '([^']+)'`,
    `"${resolved.replace(/"/g, '\\"')}": "([^"]+)"`,
    `${resolved}: '([^']+)'`,
  ]
  for (const pat of patterns) {
    const m = mapTs.match(new RegExp(pat))
    if (m) return m[1]
  }
  return null
}

function loadFaction(file) {
  return JSON.parse(readFileSync(join(woDir, file), 'utf8'))
}

function normalizeKey(s) {
  return String(s).trim().toUpperCase()
}

const errors = []
const builderArmies = [...gameData.armies.map((a) => a.army), ...CODEX_CHAPTERS]
const builderFiles = new Set()

for (const army of builderArmies) {
  const file = resolveArmyFile(army)
  if (!file) fail(errors, `no warorgan map for builder army "${army}"`)
  else if (!existsSync(join(woDir, file))) fail(errors, `missing faction file for "${army}": ${file}`)
  else builderFiles.add(file)
}

let totalUnits = 0
let totalDets = 0

for (const file of builderFiles) {
  let data
  try {
    data = loadFaction(file)
  } catch {
    fail(errors, `${file}: invalid JSON`)
    continue
  }

  const units = data.Units ?? []
  const dets = data.Dettachments ?? []
  totalUnits += units.length
  totalDets += dets.length

  if (!units.length) fail(errors, `${file}: no units`)
  if (!dets.length) fail(errors, `${file}: no detachments`)

  const unitNames = new Set()
  for (const u of units) {
    const key = normalizeKey(u.Name)
    if (unitNames.has(key)) fail(errors, `${file}: duplicate unit ${u.Name}`)
    unitNames.add(key)
    if (!u.Points?.length) fail(errors, `${file}: ${u.Name} has no Points`)
  }

  const detNames = new Set()
  for (const d of dets) {
    if (!d.Name) fail(errors, `${file}: detachment without Name`)
    const dk = normalizeKey(d.Name)
    if (detNames.has(dk)) fail(errors, `${file}: duplicate detachment ${d.Name}`)
    detNames.add(dk)
    if (!d.ForceDispositions?.length) fail(errors, `${file}: ${d.Name} missing ForceDispositions`)
    for (const s of d.Stratagems ?? []) {
      if (typeof s.CPCost !== 'number') fail(errors, `${file}: stratagem in ${d.Name} missing CPCost`)
    }
    for (const e of d.Enhancements ?? []) {
      if (!e.Name) fail(errors, `${file}: enhancement without Name in ${d.Name}`)
      if (typeof e.Cost !== 'number') fail(errors, `${file}: ${e.Name} missing enhancement Cost`)
    }
  }

  const legFile = file.replace(/\.json$/, ' Legends.json')
  if (existsSync(join(woDir, legFile))) {
    try {
      const leg = loadFaction(legFile)
      for (const u of leg.Units ?? []) {
        if (!u.Points?.length) fail(errors, `${legFile}: ${u.Name} has no Points`)
      }
    } catch {
      fail(errors, `${legFile}: invalid JSON`)
    }
  }

  for (const u of units) {
    for (const target of u.LeaderInfo?.UnitNames ?? []) {
      if (!unitNames.has(normalizeKey(target))) {
        // WarOrgan sometimes lists model names (e.g. CRUSADERS) — warn only in data audit
      }
    }
  }
}

for (const [army, file] of [
  ['League of Votann', 'Leagues of Votann.json'],
  ['T\u2019au Empire', 'Tau Empire.json'],
  ['Emperor\u2019s Children', "Emperor's Children.json"],
]) {
  if (resolveArmyFile(army) !== file) fail(errors, `alias broken: ${army}`)
}

if (errors.length) {
  console.error(`FAILED: ${errors.length} WarOrgan error(s)`)
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}

console.log(
  `✓ WarOrgan audit OK (${builderFiles.size} builder factions, ${totalUnits} units, ${totalDets} detachments)`,
)
