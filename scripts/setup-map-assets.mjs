#!/usr/bin/env node
/**
 * Extract Chapter Approved deployment+terrain maps from Veizla xlsx into public/maps/.
 * Requires: ~/Downloads/Cheat Sheet - Warhammer 40k 11th Edition - Veizla.gg.xlsx
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const xlsx = join(process.env.HOME ?? '', 'Downloads/Cheat Sheet - Warhammer 40k 11th Edition - Veizla.gg.xlsx')
const outDir = join(root, 'public/maps')
mkdirSync(outDir, { recursive: true })

const files = {
  'matchup-3-v2.png': 'image31.png',
  'matchup-3-v3.png': 'image38.png',
  'matchup-6-v1.png': 'image47.png',
  'matchup-6-v2.png': 'image46.png',
  'matchup-6-v3.png': 'image13.png',
  'matchup-7-v1.png': 'image22.png',
  'matchup-7-v2.png': 'image19.png',
  'matchup-7-v3.png': 'image15.png',
  'matchup-8-v1.png': 'image10.png',
  'matchup-8-v2.png': 'image32.png',
  'matchup-8-v3.png': 'image9.png',
  'matchup-9-v1.png': 'image23.png',
  'matchup-9-v2.png': 'image50.png',
  'matchup-9-v3.png': 'image41.png',
}

for (const dest of Object.keys(files)) {
  const src = files[dest]
  const data = execSync(`unzip -p "${xlsx}" "xl/media/${src}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 })
  writeFileSync(join(outDir, dest), data)
  console.log(`✓ ${dest}`)
}

console.log(`\nWrote ${Object.keys(files).length} maps to public/maps/`)
