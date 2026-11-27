// Einstellungen für Playlist-Laufzeit und Zeitstempel-Knopf.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { tick, suite } = require('./harness')

const rulesCode = fs.readFileSync(path.join(__dirname, '..', 'rules.js'), 'utf8')
const optionsCode = fs.readFileSync(path.join(__dirname, '..', 'options', 'options.js'), 'utf8')

function makeElement(id = '') {
  const listeners = new Map()
  return {
    id, value: '', checked: false, hidden: false, disabled: false, textContent: '', className: '', children: [], dataset: {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    dispatch(type) {
      for (const fn of listeners.get(type) || []) fn({ preventDefault() {} })
    },
    focus() {}, append(...nodes) { this.children.push(...nodes) }, replaceChildren(...nodes) { this.children = [...nodes] },
    querySelector() { return null },
  }
}

function loadOptions(stored = {}) {
  const ids = ['error', 'status', 'settings-fields', 'decrease', 'increase', 'toggle', 'speed', 'kids', 'cinema',
    'watch-later', 'ai-summary', 'playlist-runtime', 'timestamp-button', 'channels', 'settings', 'add-channel',
    'reset', 'diagnose', 'diagnose-result']
  const elements = Object.fromEntries(ids.map(id => [id, makeElement(id)]))
  const data = { channelSpeeds: [], ...stored }
  const saved = []
  vm.runInNewContext(`${rulesCode}\n${optionsCode}`, {
    document: { getElementById: id => elements[id], createElement: () => makeElement() },
    console, URL, AbortSignal,
    chrome: {
      storage: {
        sync: {
          get: (defaults, cb) => cb ? cb({ ...defaults, ...data }) : Promise.resolve({ ...defaults, ...data }),
          set: payload => { saved.push(payload); Object.assign(data, payload) },
        },
        onChanged: { addListener() {} },
      },
      tabs: { query: async () => [] },
      runtime: { lastError: null },
    },
  })
  return { elements, saved }
}

async function run() {
  const s = suite()

  {
    const { elements } = loadOptions()
    await tick(0)
    s.check('Beide Werkzeuge sind standardmäßig aktiv', elements['playlist-runtime'].checked && elements['timestamp-button'].checked, true)
  }

  {
    const { elements, saved } = loadOptions({ playlistRuntime: false, timestampButton: false })
    await tick(0)
    s.check('Gespeicherte Auswahl wird angezeigt', !elements['playlist-runtime'].checked && !elements['timestamp-button'].checked, true)
    elements.settings.dispatch('submit')
    await tick(0)
    const stored = Object.assign({}, ...saved)
    s.check('Speichern übernimmt beide Einstellungen', stored.playlistRuntime === false && stored.timestampButton === false, true)
  }

  {
    const { elements, saved } = loadOptions()
    await tick(0)
    elements.reset.dispatch('click')
    await tick(0)
    s.check('Zurücksetzen aktiviert beide Werkzeuge', saved.at(-1)?.playlistRuntime === true && saved.at(-1)?.timestampButton === true, true)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
