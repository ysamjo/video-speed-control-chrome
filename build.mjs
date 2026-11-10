import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
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
execFileSync('zip', ['-qr', output, ...files, '-x', '*/.DS_Store'], { cwd: root })
console.log(`Erweiterung gebaut: ${output}`)
