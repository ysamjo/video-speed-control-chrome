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
  const ids = ['error', 'status', 'settings-fields', 'decrease', 'increase', 'toggle', 'speed', 'kids', 'cinema', 'watch-later', 'ai-summary', 'channels', 'settings', 'add-channel', 'reset', 'diagnose', 'diagnose-result']
  const elements = Object.fromEntries(ids.map(id => [id, makeElement(id)]))
  const data = { channelSpeeds: [], ...stored }
  const saved = []
  const storageListeners = []
  const document = {
    getElementById: id => elements[id],
    createElement: () => makeElement(),
  }
  vm.runInNewContext(`${rulesCode}\n${optionsCode}`, {
    document, console, URL, AbortSignal,
    chrome: {
      storage: {
        sync: {
          get: (defaults, cb) => {
            const result = { ...defaults, ...data }
            if (cb) cb(result)
            else return Promise.resolve(result)
          },
          set: payload => { saved.push(payload); Object.assign(data, payload) },
        },
        onChanged: { addListener: fn => storageListeners.push(fn) },
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
    s.check('KI-Zusammenfassung ist in den Standardeinstellungen aus', elements['ai-summary'].checked, false)
  }

  {
    const { elements } = loadOptions({ youtubeAiSummary: true })
    await tick(0)
    s.check('Gespeicherte Aktivierung wird in der Option angezeigt', elements['ai-summary'].checked, true)
  }

  {
    const { elements, saved } = loadOptions()
    await tick(0)
    elements['ai-summary'].checked = true
    elements.settings.dispatch('submit')
    await tick(0)
    s.check('Speichern übernimmt die aktivierte KI-Zusammenfassung', saved.at(-1)?.youtubeAiSummary, true)
  }

  {
    const { elements, saved } = loadOptions()
    await tick(0)
    elements.settings.dispatch('submit')
    await tick(0)
    s.check('Speichern schreibt die standardmäßig deaktivierte Option', saved.at(-1)?.youtubeAiSummary, false)
  }

  {
    const { elements, saved } = loadOptions({ youtubeAiSummary: true })
    await tick(0)
    elements.reset.dispatch('click')
    await tick(0)
    s.check('Zurücksetzen deaktiviert die KI-Zusammenfassung', saved.at(-1)?.youtubeAiSummary, false)
    s.check('Zurücksetzen aktualisiert die Checkbox', elements['ai-summary'].checked, false)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
