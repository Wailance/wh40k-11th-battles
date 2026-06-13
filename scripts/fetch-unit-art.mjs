#!/usr/bin/env node
/**
 * Optional: drop .webp files into public/unit-art/{slug}.webp
 * Slugs match unit-portrait.ts (e.g. orikan-the-diviner.webp).
 * Run: node scripts/fetch-unit-art.mjs
 * Prints slug list for a faction to help sourcing art manually.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/unit-art')
const faction = process.argv[2] ?? 'necrons'
const path = join(root, `public/data/army/curated/factions/${faction}.json`)

if (!existsSync(path)) {
  console.error('Faction file not found:', path)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const data = JSON.parse(readFileSync(path, 'utf8'))

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

console.log(`# Drop images as public/unit-art/{slug}.webp\n`)
for (const u of data.units.slice(0, 30)) {
  console.log(`${slugify(u.name)}.webp  —  ${u.name}`)
}
