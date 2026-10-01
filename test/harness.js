// Minimal-DOM für gezielte Regressionstests, kein vollständiger Browser-Ersatz.
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const code = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8')
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms))

// Identische Listener werden wie im DOM nur einmal registriert.
function eventTarget() {
  const listeners = new Map()
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    dispatchEvent(event) {
      event.target ??= this
      event.currentTarget = this
      for (const fn of [...(listeners.get(event.type) ?? [])]) fn(event)
      event.currentTarget = null
      return true
    },
  }
}

// Beide Rate-Setter erzeugen asynchrone Events. Lifecycle-Events werden explizit simuliert.
function makeVideo(initial) {
  let rate = initial, defaultRate = initial
  const v = Object.assign(eventTarget(), {
    localName: 'video',
    isConnected: true,
  })
  for (const name of ['playbackRate', 'defaultPlaybackRate']) {
    Object.defineProperty(v, name, {
      get: () => name === 'playbackRate' ? rate : defaultRate,
      set(value) {
        if (v[name] === value) return
        if (name === 'playbackRate') rate = value
        else defaultRate = value
        setTimeout(() => v.dispatchEvent({ type: 'ratechange' }), 0)
      },
    })
  }
  return v
}

const makeEl = (over = {}) => Object.assign({
  localName: 'div', isContentEditable: false, textContent: '',
  style: { setProperty() {} }, setAttribute() {}, removeAttribute() {}, remove() {},
  matches: () => false, showPopover() {}, append() {}, querySelectorAll: () => [],
}, over)

function load({ initial = 1.8, withVideo = true, storedSpeed = 1.8, deferSettings = false,
  cinema = true, hostname = 'example.com', pathname = '/', theater = false,
  theaterButton = true, applyTheaterOnClick = true } = {}) {
  const winListeners = {}
  const created = [], saved = [], storageListeners = [], pendingGets = [], observers = []
  const storage = { playbackSpeed: storedSpeed, cinemaMode: cinema }
  let fakeNow = 1000, theaterClicks = 0
  const video = makeVideo(initial)

  // YouTube-Fakes für den Kino-Modus (Theatermodus).
  const isYouTube = /(^|\.)youtube(-nocookie)?\.com$/.test(hostname)
  const theaterAttrs = new Set(theater ? ['theater'] : [])
  const flexy = isYouTube ? {
    hasAttribute: (n) => theaterAttrs.has(n),
    setAttribute: (n) => { theaterAttrs.add(n) },
    removeAttribute: (n) => { theaterAttrs.delete(n) },
  } : null
  const sizeButton = isYouTube && theaterButton ? {
    title: 'Theatermodus (t)',
    click() { theaterClicks++; if (applyTheaterOnClick) theaterAttrs.add('theater') },
  } : null

  const location = { hostname, pathname, href: `https://${hostname}${pathname}` }

  class MutationObserver {
    constructor(cb) { this.cb = cb }
    observe() { observers.push(this) }
    disconnect() { const i = observers.indexOf(this); if (i >= 0) observers.splice(i, 1) }
  }

  const document = Object.assign(eventTarget(), {
    readyState: 'complete',
    body: makeEl({ localName: 'body' }),
    documentElement: makeEl({ localName: 'html' }),
    fullscreenElement: null,
    querySelector: (s) => {
      if (s === 'video') return withVideo ? video : null
      if (s === 'ytd-watch-flexy') return flexy
      if (s === '.ytp-size-button') return sizeButton
      return null
    },
    querySelectorAll: () => [],
    createElement: () => { const el = makeEl(); created.push(el); return el },
  })
  const window = { addEventListener: (t, f) => (winListeners[t] ||= []).push(f), document }

  vm.runInNewContext(code, {
    document, window, console, setTimeout, clearTimeout, location, MutationObserver,
    Date: { now: () => fakeNow },
    chrome: {
      storage: {
        sync: {
          // Mehrere parallele Reads (Geschwindigkeit UND Kino-Modus) dürfen offen sein.
          get: (defaults, cb) => {
            const run = () => cb({ ...defaults, ...storage })
            if (deferSettings) pendingGets.push(run)
            else run()
          },
          set: (payload) => { saved.push(payload); Object.assign(storage, payload) },
        },
        onChanged: { addListener: fn => storageListeners.push(fn) },
      },
      runtime: { lastError: null },
    },
  })

  return {
    winListeners, video, saved, document, location,
    finishSettings: () => pendingGets.splice(0).forEach(run => run()),
    advance: (ms) => { fakeNow += ms },
    // Dokument-Capture und Zielphase teilen EIN Event; Shadow DOM verlässt nur die Zielphase.
    media(type, target = video, { shadow = false } = {}) {
      const event = { type, target }
      if (!shadow) document.dispatchEvent(event)
      target.dispatchEvent(event)
    },
    changeStoredSpeed(value) {
      storage.playbackSpeed = value
      for (const fn of storageListeners) fn({ playbackSpeed: { newValue: value } }, 'sync')
    },
    changeCinema(value) {
      storage.cinemaMode = value
      for (const fn of storageListeners) fn({ cinemaMode: { newValue: value } }, 'sync')
    },
    toast: () => created.filter(e => /^\d+\.\d\d$/.test(e.textContent)).pop()?.textContent ?? null,
    savedSpeed: () => storage.playbackSpeed,
    // Kino-Modus: YouTube-Zustand steuern und gemeldete DOM-Änderungen auslösen.
    theaterOn: () => theaterAttrs.has('theater'),
    setTheater: (on) => { if (on) theaterAttrs.add('theater'); else theaterAttrs.delete('theater') },
    theaterClicks: () => theaterClicks,
    mutate: () => { for (const o of [...observers]) o.cb([]) },
  }
}

function press(winListeners, key, { path, ...mods } = {}) {
  const chain = path ?? [makeEl({ localName: 'body' }), makeEl({ localName: 'html' })]
  const e = {
    key, type: 'keydown', ctrlKey: false, altKey: false, metaKey: false, shiftKey: false,
    ...mods,
    target: chain[0],
    composedPath: () => chain,
    preventDefault() { e.defaultPrevented = true },
    stopImmediatePropagation() {},
  }
  winListeners.keydown.forEach(f => f(e))
  return e
}

const suite = () => {
  const results = []
  return {
    check: (name, actual, expected) => results.push({ name, ok: actual === expected, actual, expected }),
    report: () => {
      for (const r of results) {
        console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : ` (erwartet ${r.expected}, war ${r.actual})`}`)
      }
      const failed = results.filter(r => !r.ok).length
      console.log(`${results.length - failed}/${results.length} bestanden`)
      return failed
    },
  }
}

module.exports = { tick, makeVideo, makeEl, load, press, suite }
