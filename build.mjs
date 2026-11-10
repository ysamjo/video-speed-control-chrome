import { readFileSync, readdirSync, statSync, mkdirSync, existsSync, rmSync, createWriteStream } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

const root = fileURLToPath(new URL('.', import.meta.url))
const manifest = JSON.parse(readFileSync(new URL('manifest.json', import.meta.url)))
const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url)))
if (manifest.manifest_version !== 3 || manifest.version !== pkg.version) throw new Error('Manifest und Paketversion stimmen nicht überein.')
const files = ['manifest.json', 'background.js', 'rules.js', 'content.js', 'content-redirect.js', 'watch-later.js', 'options', 'icons']
for (const path of files) if (!existsSync(new URL(path, import.meta.url))) throw new Error(`Build-Datei fehlt: ${path}`)
for (const path of Object.values(manifest.icons)) if (!existsSync(new URL(path, import.meta.url))) throw new Error(`Icon fehlt: ${path}`)

mkdirSync(new URL('dist/', import.meta.url), { recursive: true })
const output = `dist/video-speed-control-${pkg.version}.zip`
rmSync(new URL(output, import.meta.url), { force: true })

// Alle zu packenden Dateien einsammeln (Ordner rekursiv, .DS_Store ignorieren).
const walk = (relative) => {
  const absolute = new URL(relative, `file://${root}`)
  const info = statSync(absolute)
  if (info.isDirectory()) return readdirSync(absolute).flatMap(name => walk(`${relative}/${name}`))
  return relative.includes('.DS_Store') ? [] : [relative]
}
const entries = files.flatMap(file => walk(file))

const hasZip = (() => { try { execFileSync('zip', ['-v'], { stdio: 'ignore' }); return true } catch { return false } })()
if (hasZip) {
  execFileSync('zip', ['-q', output, ...entries], { cwd: root })
} else {
  // Ohne zip-Binary (z. B. im schlanken Container) ein minimales ZIP selbst schreiben.
  const parts = []
  const central = []
  let offset = 0
  const nameLength = (name) => Buffer.byteLength(name)
  const dosTime = (date) => ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff
  const dosDate = (date) => (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff

  for (const name of entries) {
    const data = readFileSync(new URL(name, `file://${root}`))
    const compressed = deflateRawSync(data, { level: 9 })
    const info = statSync(new URL(name, `file://${root}`))
    const crc32 = (() => {
      let crc = 0xffffffff
      for (const byte of data) {
        crc ^= byte
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
      }
      return (crc ^ 0xffffffff) >>> 0
    })()
    const nameBuffer = Buffer.from(name.replaceAll('\\', '/'), 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)                      // Version 2.0
    local.writeUInt16LE(0x0800, 6)                  // UTF-8-Namen
    local.writeUInt16LE(8, 8)                       // deflate
    local.writeUInt16LE(dosTime(info.mtime), 10)
    local.writeUInt16LE(dosDate(info.mtime), 12)
    local.writeUInt32LE(crc32, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    local.writeUInt16LE(0, 28)
    parts.push(local, nameBuffer, compressed)

    const centralEntry = Buffer.alloc(46)
    centralEntry.writeUInt32LE(0x02014b50, 0)
    centralEntry.writeUInt16LE(20, 4)
    centralEntry.writeUInt16LE(20, 6)
    centralEntry.writeUInt16LE(0x0800, 8)
    centralEntry.writeUInt16LE(8, 10)
    centralEntry.writeUInt16LE(dosTime(info.mtime), 12)
    centralEntry.writeUInt16LE(dosDate(info.mtime), 14)
    centralEntry.writeUInt32LE(crc32, 16)
    centralEntry.writeUInt32LE(compressed.length, 20)
    centralEntry.writeUInt32LE(data.length, 24)
    centralEntry.writeUInt16LE(nameBuffer.length, 28)
    centralEntry.writeUInt32LE(offset, 42)
    central.push(centralEntry, nameBuffer)

    offset += local.length + nameBuffer.length + compressed.length
  }

  const centralBuffer = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(offset, 16)

  const stream = createWriteStream(new URL(output, import.meta.url))
  stream.end(Buffer.concat([...parts, centralBuffer, end]))
  await new Promise((resolve, reject) => stream.on('finish', resolve).on('error', reject))
  void nameLength
}
console.log(`Erweiterung gebaut: ${output} (${entries.length} Dateien)`)
