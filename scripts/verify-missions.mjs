#!/usr/bin/env node
/**
 * Validates Chapter Approved mission data against 11th Edition CA 2025–26 rules.
 * Sources: GW Tournament Companion PDF, Wahapedia CA 2025–26.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gameData = JSON.parse(readFileSync(join(root, 'src/data/game-data.json'), 'utf8'))
const missionCards = JSON.parse(readFileSync(join(root, 'src/data/mission-cards.json'), 'utf8'))

const FD_ORDER = gameData.forceDispositionOrder
const OPP_ROW = gameData.opponentForceDispositionRow
const MATRIX = gameData.primaryMissionMatrix
const caps = gameData.scoringCaps

let errors = 0
let warnings = 0

function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`⚠ ${msg}`)
  warnings++
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}

function getPrimary(myFd, oppFd) {
  const row = OPP_ROW[oppFd]
  const col = FD_ORDER.indexOf(myFd)
  return MATRIX[row][col]
}

// --- Scoring caps (GW Tournament Companion) ---
const expectedCaps = {
  primaryMaxGame: 45,
  primaryMaxRound: 15,
  tacticalSecondaryMaxGame: 40,
  tacticalSecondaryMaxRound: 15,
  fixedSecondaryMaxGame: 40,
  fixedSecondaryMaxPerCard: 20,
  battleReadyVp: 10,
}

for (const [key, val] of Object.entries(expectedCaps)) {
  if (caps[key] !== val) fail(`scoringCaps.${key}: expected ${val}, got ${caps[key]}`)
}
if (errors === 0) ok('Scoring caps match CA Tournament Companion')

// --- Opponent FD row mapping ---
const expectedOppRows = {
  'TAKE AND HOLD': 0,
  'PURGE THE FOE': 1,
  DISRUPTION: 2,
  RECONNAISSANCE: 3,
  'PRIORITY ASSETS': 4,
}
for (const [fd, row] of Object.entries(expectedOppRows)) {
  if (OPP_ROW[fd] !== row) fail(`opponentForceDispositionRow[${fd}]: expected row ${row}, got ${OPP_ROW[fd]}`)
}
if (errors === 0) ok('Opponent FD row mapping')

// --- 15 matchups primary missions ---
for (const m of gameData.forceDispositionMatchups) {
  const fd1 = m.player1
  const fd2 = m.player2
  const p1 = getPrimary(fd1, fd2)
  const p2 = getPrimary(fd2, fd1)
  if (!missionCards[p1]) fail(`Matchup #${m.id}: missing mission card for P1 "${p1}"`)
  if (!missionCards[p2]) fail(`Matchup #${m.id}: missing mission card for P2 "${p2}"`)
}
if (errors === 0) ok(`All ${gameData.forceDispositionMatchups.length} matchups resolve to mission cards`)

// --- Tactical deck ---
const deck = gameData.secondaries.tacticalDeck
const confirmed = gameData.secondaries.confirmed
if (deck.length !== 18) fail(`Tactical deck: expected 18 cards, got ${deck.length}`)
const deckSet = new Set(deck.map((c) => c.toLowerCase()))
if (deckSet.size !== deck.length) fail('Tactical deck has duplicate cards (case-insensitive)')
if (!deck.includes('A Tempting Target')) fail('Tactical deck missing "A Tempting Target"')
const engageCount = deck.filter((c) => c.toLowerCase().includes('engage on all fronts')).length
if (engageCount !== 1) fail(`Expected 1 "Engage on All Fronts", found ${engageCount}`)
for (const c of confirmed) {
  if (!deck.includes(c)) fail(`Confirmed card "${c}" not in tactical deck`)
}
if (errors === 0) ok('Tactical deck (18 cards, no dupes, A Tempting Target present)')

// --- Fixed secondaries ---
const fixed = gameData.secondaries.fixedOptions
if (fixed.length !== 4) fail(`Fixed options: expected 4, got ${fixed.length}`)
for (const c of fixed) {
  if (!missionCards[c]) fail(`Fixed secondary "${c}" missing from mission-cards.json`)
}
if (errors === 0) ok('Fixed secondaries (4 options)')

// --- Layout #4 typo check ---
const layout4 = gameData.layouts.find((l) => l.id === 4)
if (layout4?.player2 !== 'PURGE THE FOE') {
  fail(`Layout #4 player2: expected PURGE THE FOE, got ${layout4?.player2}`)
} else {
  ok('Layout #4 player2 is PURGE THE FOE (not RED typo)')
}

// --- Matrix dimensions ---
if (MATRIX.length !== 5) fail(`Matrix rows: expected 5, got ${MATRIX.length}`)
for (let r = 0; r < MATRIX.length; r++) {
  if (MATRIX[r].length !== 5) fail(`Matrix row ${r}: expected 5 columns, got ${MATRIX[r].length}`)
}
if (errors === 0) ok('Primary mission matrix is 5×5')

// --- All matrix missions exist in cards ---
const matrixMissions = new Set(MATRIX.flat())
for (const name of matrixMissions) {
  if (!missionCards[name]) fail(`Matrix mission "${name}" missing from mission-cards.json`)
}
if (errors === 0) ok('All matrix primary missions have card data')

// --- Primary missions in cards ---
for (const name of matrixMissions) {
  if (missionCards[name]?.type !== 'primary') fail(`"${name}" should be type primary`)
}

// --- Battlefield map assets ---
import { existsSync } from 'node:fs'
const battlefield = JSON.parse(
  readFileSync(join(root, 'src/data/battlefield-layouts.json'), 'utf8'),
)
for (const [mid, data] of Object.entries(battlefield.matchups)) {
  for (const v of data.variants) {
    const path = join(root, 'public', v.image.replace(/^\//, ''))
    if (!existsSync(path)) fail(`Missing map asset for matchup #${mid}: ${v.image}`)
  }
}
if (errors === 0) ok('Battlefield map assets present for available matchups')

console.log('')
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)`)
  process.exit(1)
}
console.log(`PASSED (${warnings} warning(s))`)
