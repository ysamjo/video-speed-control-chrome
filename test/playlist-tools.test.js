// Playlist-Laufzeit und Zeitstempel-Knopf: nur auf YouTube, gemäß Einstellungen.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { tick, suite } = require('./harness')

const code = fs.readFileSync(path.join(__dirname, '..', 'playlist-tools.js'), 'utf8')

function element(localName = 'div', extra = {}) {
  const children = []
  const node = Object.assign({
    localName, children, textContent: '', className: '', id: '', dataset: {}, style: {}, attrs: {},
    isConnected: true,
    append(...nodes) { for (const n of nodes) { children.push(n); n.parent = node } },
    prepend(...nodes) { for (const n of nodes) { children.unshift(n); n.parent = node } },
    remove() { const p = node.parent; if (p) { const i = p.children.indexOf(node); if (i >= 0) p.children.splice(i, 1) } node.isConnected = false },
    setAttribute(name, value) { node.attrs[name] = String(value); if (name === 'class') node.className = String(value); if (name === 'id') node.id = String(value) },
    getAttribute(name) { return node.attrs[name] ?? null },
    hasAttribute(name) { return name in node.attrs },
    removeAttribute(name) { delete node.attrs[name] },
    addEventListener(type, fn) { (node.handlers ||= {}); (node.handlers[type] ||= []).push(fn) },
    click() { for (const fn of node.handlers?.click || []) fn({ preventDefault() {} }) },
    select() { node.selected = true },
    querySelector() { return null },
    querySelectorAll() { return [] },
    matches(selector) { return selector === '.vpc-timestamp-button' && node.className.includes('vpc-timestamp-button') },
  }, extra)
  return node
}

function load({ hostname = 'www.youtube.com', pathname = '/playlist', search = '', playlistRuntime = true,
  timestampButton = true, items = [], time = 0, clipboard = true, execCommand = true } = {}) {
  const created = []
  const buttons = []
  const observers = []
  const storageListeners = []
  const video = element('video', { currentTime: time })
  const row = element('div')
  const body = element('body')
  const head = element('head')
  const documentElement = element('html')
  const document = {
    body, head, documentElement,
    getElementById(id) {
      if (id === 'vpc-playlist-runtime') return body.children.find(n => n.id === id) ?? null
      if (id === 'vpc-playlist-tools-style') return head.children.find(n => n.id === id) ?? null
      return null
    },
    createElement(name) {
      const node = element(name)
      created.push(node)
      return node
    },
    querySelector(selector) {
      if (selector === '#vpc-playlist-runtime') return body.children.find(n => n.id === selector.slice(1)) ?? null
      if (selector === '.vpc-timestamp-button') return row.children.find(n => n.className === 'vpc-timestamp-button') ?? null
      if (selector === '#top-level-buttons-computed') return row
      if (selector === 'video.html5-main-video' || selector === 'video') return video
      return null
    },
    querySelectorAll(selector) {
      if (selector === 'ytd-playlist-video-renderer') return items
      return []
    },
    addEventListener() {},
    execCommand() { return execCommand },
  }
  const location = { hostname, pathname, href: `https://${hostname}${pathname}${search}` }
  class MutationObserver {
    constructor(cb) { this.cb = cb }
    observe() { observers.push(this) }
  }
  const copied = []
  vm.runInNewContext(code, {
    document, location, window: { addEventListener() {} }, URL, MutationObserver,
    setTimeout, clearTimeout, console, navigator: { clipboard: clipboard ? { writeText: async text => copied.push(text) } : undefined },
    chrome: {
      storage: {
        sync: { get: (defaults, cb) => cb({ ...defaults, playlistRuntime, timestampButton }) },
        onChanged: { addListener: fn => storageListeners.push(fn) },
      },
    },
  })
  return {
    document, body, head, row, buttons, copied, created,
    summary: () => document.getElementById('vpc-playlist-runtime')?.textContent ?? null,
  }
}

const duration = (text, aria = '') => element('span', { textContent: text, attrs: { 'aria-label': aria } })
const item = (text, percent = null) => {
  const node = element('ytd-playlist-video-renderer')
  const durationNode = duration(text)
  const progressNode = percent == null ? null : element('div', { attrs: { 'aria-valuenow': String(percent) } })
  const resume = progressNode ? element('ytd-thumbnail-overlay-resume-playback-renderer') : null
  node.querySelector = selector => {
    if (selector === 'ytd-thumbnail-overlay-time-status-renderer #text') return durationNode
    if (selector === 'ytd-thumbnail-overlay-time-status-renderer') return durationNode
    if (selector === 'ytd-thumbnail-overlay-resume-playback-renderer #progress') return progressNode
    if (selector === 'ytd-thumbnail-overlay-resume-playback-renderer') return resume
    return null
  }
  return node
}

async function run() {
  const s = suite()

  {
    const env = load({ items: [item('3:20', 50), item('1:40', 0), item('unbekannt')] })
    await tick(200)
    s.check('Laufzeit der geladenen Videos zusammengefasst', env.summary(), '3 geladen · 2 mit Laufzeit · Gesamt 5 Min. 0 Sek. · gesehen 1 Min. 40 Sek. · übrig 3 Min. 20 Sek.')
  }

  {
    const env = load({ pathname: '/watch', items: [item('3:20', 50)] })
    await tick(200)
    s.check('Laufzeit nur auf Playlist-Seiten', env.summary(), null)
  }

  {
    const env = load({ items: [item('3:20', 50)], playlistRuntime: false })
    await tick(200)
    s.check('Deaktivierte Laufzeit wird nicht angezeigt', env.summary(), null)
  }

  {
    const env = load({ pathname: '/watch', time: 65, clipboard: true })
    await tick(200)
    const button = env.document.querySelector('.vpc-timestamp-button')
    s.check('Zeitstempel-Knopf auf Videoseiten', !!button, true)
    button.click()
    await tick(20)
    s.check('Link ab aktueller Stelle kopiert', env.copied[0], 'https://www.youtube.com/watch?t=65s')
    s.check('Knopf bestätigt das Kopieren', button.textContent, 'Kopiert')
  }

  {
    const env = load({ pathname: '/watch', timestampButton: false })
    await tick(200)
    s.check('Deaktivierter Zeitstempel-Knopf erscheint nicht', !!env.document.querySelector('.vpc-timestamp-button'), false)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
