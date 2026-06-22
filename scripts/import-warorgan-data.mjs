#!/usr/bin/env node
/**
 * Copy external faction roster datasets into public/data/warorgan/ for the army builder.
 * Source: ~/Library/Application Support/WarOrgan/Data/ (macOS) or WAR_ORGAN_DATA env.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/data/warorgan/factions')
const metaOut = join(root, 'public/data/warorgan/meta.json')

const defaultSource = join(homedir(), 'Library/Application Support/WarOrgan/Data')
const sourceDir = process.env.WAR_ORGAN_DATA ?? defaultSource

if (!existsSync(sourceDir)) {
  console.error(`Roster data not found at: ${sourceDir}`)
  console.error('Set WAR_ORGAN_DATA to your faction Data folder.')
  process.exit(1)
}

const SKIP = new Set(['DataInfo.json', 'FactionInfoData.json'])
const includeLegends = !process.argv.includes('--no-legends')

mkdirSync(outDir, { recursive: true })

const copied = []
for (const name of readdirSync(sourceDir)) {
  if (!name.endsWith('.json') || SKIP.has(name)) continue
  if (!includeLegends && name.includes('Legends')) continue
  const src = join(sourceDir, name)
  const dest = join(outDir, name)
  copyFileSync(src, dest)
  copied.push(name)
}

const dataInfo = JSON.parse(readFileSync(join(sourceDir, 'DataInfo.json'), 'utf8'))
const factionInfo = JSON.parse(readFileSync(join(sourceDir, 'FactionInfoData.json'), 'utf8'))

writeFileSync(
  metaOut,
  JSON.stringify(
    {
      ...dataInfo,
      importedAt: new Date().toISOString(),
      sourceDir,
      factionFiles: copied.sort(),
      factions: factionInfo.Factions,
    },
    null,
    2,
  ),
)

console.log(`Imported ${copied.length} faction files → public/data/warorgan/factions/`)
