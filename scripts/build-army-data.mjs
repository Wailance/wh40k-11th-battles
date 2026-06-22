#!/usr/bin/env node
/**
 * Clone BSData wh40k-10e (if missing) and convert to curated JSON in public/data/army/.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convert } from 'bsdata40k-to-json'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bsdataDir = join(root, 'data/bsdata-wh40k-10e')
const outDir = join(root, 'public/data/army')

if (!existsSync(bsdataDir)) {
  console.log('Cloning BSData/wh40k-10e (shallow)...')
  execSync(
    `git clone --depth 1 https://github.com/BSData/wh40k-10e.git "${bsdataDir}"`,
    { stdio: 'inherit' },
  )
}

const result = await convert({
  inputDir: bsdataDir,
  outputDir: outDir,
  curatedOnly: true,
})

console.log(`\nArmy data: ${result.factionCount} factions → ${outDir}/curated/`)

console.log('\nMerging 11th Edition MFM points…')
await import('./merge-mfm-data.mjs')

console.log('\nExtracting unit loadouts…')
await import('./extract-unit-loadouts.mjs')

console.log('\nSanitizing curated datasheets…')
await import('./sanitize-curated-datasheets.mjs')
