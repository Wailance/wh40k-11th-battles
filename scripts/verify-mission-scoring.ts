/**
 * Validates parsed mission score options against known GW rules.
 */
import { getMissionScoreOptions } from '../src/lib/mission-scoring.ts'

let errors = 0

function fail(msg: string) {
  console.error(`✗ ${msg}`)
  errors++
}

function ok(msg: string) {
  console.log(`✓ ${msg}`)
}

type Expected = {
  vp: number
  maxCountPerRound?: number | null
  maxVpPerRound?: number | null
  exclusive?: boolean
}

function expect(name: string, mode: 'tactical' | 'fixed' | null, expected: Expected[]) {
  const opts = getMissionScoreOptions(name, mode ?? undefined)
  const key = mode ? `${name} (${mode})` : name
  if (opts.length !== expected.length) {
    fail(`${key}: expected ${expected.length} option(s), got ${opts.length} — ${opts.map((o) => o.vp).join(', ')}`)
    return
  }
  for (let i = 0; i < expected.length; i++) {
    const o = opts[i]
    const e = expected[i]
    if (o.vp !== e.vp) fail(`${key} [${i}]: expected ${e.vp} VP, got ${o.vp}`)
    if (e.maxCountPerRound !== undefined && o.maxCountPerRound !== e.maxCountPerRound) {
      fail(`${key} [${i}]: maxCountPerRound ${o.maxCountPerRound} !== ${e.maxCountPerRound}`)
    }
    if (e.maxVpPerRound !== undefined && o.maxVpPerRound !== e.maxVpPerRound) {
      fail(`${key} [${i}]: maxVpPerRound ${o.maxVpPerRound} !== ${e.maxVpPerRound}`)
    }
    if (e.exclusive !== undefined && Boolean(o.exclusiveGroup) !== e.exclusive) {
      fail(`${key} [${i}]: exclusive ${Boolean(o.exclusiveGroup)} !== ${e.exclusive}`)
    }
  }
}

// --- Secondaries (checkbox tiers) ---
expect('Burden of Thrust', 'tactical', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('No Prisoners', 'tactical', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('No Prisoners', 'fixed', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Overwhelming Force', 'tactical', [
  { vp: 3, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Assassination', 'tactical', [
  { vp: 5, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Assassination', 'fixed', [
  { vp: 4, maxCountPerRound: 1, exclusive: true },
  { vp: 3, maxCountPerRound: 1, exclusive: true },
])
expect('Bring it Down', 'tactical', [{ vp: 4, maxCountPerRound: 1 }])
expect('Bring it Down', 'fixed', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
  { vp: 6, maxCountPerRound: 1, exclusive: true },
])
expect('A Grievous Blow', 'tactical', [{ vp: 5, maxCountPerRound: 1 }])
expect('A Grievous Blow', 'fixed', [{ vp: 5, maxCountPerRound: 1 }])
expect('Engage on All Fronts', 'tactical', [
  { vp: 1, maxCountPerRound: 1, exclusive: true },
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
])
expect('Behind Enemy Lines', 'tactical', [
  { vp: 3, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
])
expect('Secure No Man\'s Land', 'tactical', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Cleanse', 'tactical', [
  { vp: 3, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Cleanse', 'fixed', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 4, maxCountPerRound: 1, exclusive: true },
])
expect('Defend Stronghold', 'tactical', [{ vp: 3, maxCountPerRound: 1 }])
expect('Display of Might', 'tactical', [{ vp: 4, maxCountPerRound: 1 }])
expect('Outflank', 'tactical', [{ vp: 5, maxCountPerRound: 1 }])
expect('Forward Position', 'tactical', [
  { vp: 5, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Centre Ground', 'tactical', [
  { vp: 2, maxCountPerRound: 1, exclusive: true },
  { vp: 5, maxCountPerRound: 1, exclusive: true },
])
expect('Beacon', 'tactical', [{ vp: 5, maxCountPerRound: 1 }])
expect('Plunder', 'tactical', [{ vp: 5, maxCountPerRound: 1 }])
expect('A Tempting Target', 'tactical', [{ vp: 5, maxCountPerRound: 1 }])

// --- Primaries ---
expect('Outmaneuver', null, [
  { vp: 10, maxCountPerRound: 1 },
  { vp: 4, maxCountPerRound: null },
  { vp: 5, maxCountPerRound: null },
  { vp: 6, maxCountPerRound: null },
])

const outR23 = getMissionScoreOptions('Outmaneuver').find((o) => o.vp === 5)
const outR4 = getMissionScoreOptions('Outmaneuver').find((o) => o.vp === 6)
if (!outR23 || outR23.roundMin !== 2 || outR23.roundMax !== 3) {
  fail('Outmaneuver 5 VP tier should only apply in rounds 2–3')
}
if (!outR4 || outR4.roundMin !== 4 || outR4.roundMax !== 5) {
  fail('Outmaneuver 6 VP tier should only apply in rounds 4–5')
}

expect('Triangulation', null, [{ vp: 4 }, { vp: 3 }, { vp: 6 }, { vp: 10 }, { vp: 10 }])
expect('Battlefield Dominance', null, [
  { vp: 2, maxCountPerRound: 1 },
  { vp: 3, maxCountPerRound: null },
  { vp: 5, maxCountPerRound: null },
])
expect('Determined Acquisition', null, [
  { vp: 2, maxCountPerRound: null },
  { vp: 3, maxCountPerRound: null },
  { vp: 6, maxCountPerRound: null },
])
expect('Inescapable Dominion', null, [
  { vp: 4, maxCountPerRound: 1 },
  { vp: 5, maxCountPerRound: 1 },
  { vp: 4, maxCountPerRound: 1 },
  { vp: 5, maxCountPerRound: 1 },
])
expect('Reconnaissance Sweep', null, [
  { vp: 3, maxCountPerRound: 1, exclusive: true },
  { vp: 6, maxCountPerRound: 1, exclusive: true },
  { vp: 1, maxCountPerRound: null },
  { vp: 3, maxCountPerRound: 1 },
])
expect('Vital Link', null, [
  { vp: 2, maxCountPerRound: 1 },
  { vp: 1, maxCountPerRound: null },
  { vp: 4, maxCountPerRound: 1 },
  { vp: 4, maxCountPerRound: 1 },
  { vp: 10, maxCountPerRound: 1 },
])
expect('Death Trap', null, [
  { vp: 2, maxCountPerRound: null },
  { vp: 5, maxCountPerRound: null },
  { vp: 3, maxCountPerRound: 1 },
  { vp: 4, maxCountPerRound: 1 },
])
expect('Gather Intel', null, [
  { vp: 6, maxCountPerRound: 1 },
  { vp: 4, maxCountPerRound: 1 },
  { vp: 6, maxCountPerRound: 1 },
  { vp: 5, maxCountPerRound: 1 },
  { vp: 5, maxCountPerRound: 1 },
])
expect('Sabotage', null, [
  { vp: 3, maxCountPerRound: null },
  { vp: 5, maxCountPerRound: null },
  { vp: 4, maxCountPerRound: 1 },
])
expect('Smoke and Mirrors', null, [
  { vp: 2, maxCountPerRound: null },
  { vp: 4, maxCountPerRound: null },
  { vp: 4, maxCountPerRound: 1 },
  { vp: 10, maxCountPerRound: 1 },
])

const triTiers = getMissionScoreOptions('Triangulation').filter((o) => o.label.includes('Triangulated'))
if (triTiers.length !== 3 || !triTiers.every((o) => o.exclusiveGroup)) {
  fail('Triangulation triangulated tiers should be exclusive OR')
}

const cleanseAction = getMissionScoreOptions('Cleanse', 'tactical').some((o) =>
  o.label.includes('Shooting phase'),
)
if (cleanseAction) fail('Cleanse ACTION block leaked into score options')

if (errors === 0) ok('Mission score option parsing (GW caps & tiers)')

console.log('')
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s)`)
  process.exit(1)
}
console.log('PASSED')
