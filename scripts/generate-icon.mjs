import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const rootDir = dirname(fileURLToPath(import.meta.url)).replace(/\\scripts$/, '')
const sourcePath = join(rootDir, 'resources', 'icon-master.png')
const buildDir = join(rootDir, 'build')
const sizes = [16, 24, 32, 48, 64, 128, 256]

async function main() {
  await mkdir(buildDir, { recursive: true })

  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(sourcePath).resize(size, size).png().toBuffer())
  )

  await writeFile(join(buildDir, 'icon.png'), pngBuffers[pngBuffers.length - 1])

  const icoBuffer = await pngToIco(pngBuffers)
  await writeFile(join(buildDir, 'icon.ico'), icoBuffer)

  console.log('Icone generee : build/icon.ico')
}

main().catch((error) => {
  console.error("Echec de la generation de l'icone :", error)
  process.exit(1)
})
