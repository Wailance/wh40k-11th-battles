import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'public/pwa-icon.svg')
const outDir = join(root, 'public/icons')

mkdirSync(outDir, { recursive: true })

const sizes = [192, 512]
for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`))
  console.log(`wrote icon-${size}.png`)
}

await sharp(svgPath)
  .resize(180, 180)
  .png()
  .toFile(join(outDir, 'apple-touch-icon.png'))
console.log('wrote apple-touch-icon.png')
