// options.js – Einstellungsseite: Hotkeys konfigurieren (live aktiv in allen Tabs).

const HOTKEYS_KEY = 'hotkeys'
const SPEED_KEY = 'playbackSpeed'
const CINEMA_KEY = 'cinemaMode'
const DEFAULT_HOTKEYS = { decrease: 's', increase: 'd', toggle: 'r' }
const DEFAULT_SPEED = 1.8
const DEFAULT_CINEMA = true
const MIN_SPEED = 0.25, MAX_SPEED = 10
const FIELDS = ['decrease', 'increase', 'toggle']

const $ = (id) => document.getElementById(id)
const inputs = Object.fromEntries(FIELDS.map(id => [id, $(id)]))
const speedInput = $('speed')
const cinemaInput = $('cinema')
const error = $('error')
const status = $('status')

let statusTimer
const showStatus = (text) => {
  status.textContent = text
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => { status.textContent = '' }, 2500)
}

const showError = (text) => {
  error.textContent = text
  error.hidden = false
}

const showErrorFor = (id, key, other) => {
  const labels = { decrease: 'Verringern', increase: 'Erhöhen', toggle: 'Umschalten' }
  const usedBy = FIELDS.find(f => inputs[f].value.toLowerCase() === key.toLowerCase() && f !== id)
  if (usedBy) return `Die Taste „${key}" ist bereits für „${labels[usedBy]}" vergeben.`
  if (key.trim() === '') return `Bitte eine Taste für „${labels[id]}" festlegen.`
  return null
}

const load = () => {
  chrome.storage.sync.get(
    { [HOTKEYS_KEY]: DEFAULT_HOTKEYS, [SPEED_KEY]: DEFAULT_SPEED, [CINEMA_KEY]: DEFAULT_CINEMA },
    (res) => {
      if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
      const hotkeys = { ...DEFAULT_HOTKEYS, ...res[HOTKEYS_KEY] }
      FIELDS.forEach(id => { inputs[id].value = hotkeys[id] ?? '' })
      speedInput.value = Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(res[SPEED_KEY]) || DEFAULT_SPEED)) * 100) / 100
      cinemaInput.checked = res[CINEMA_KEY] !== false
    })
}

const clampSpeed = (v) => Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, v)) * 100) / 100

const save = () => {
  error.hidden = true
  const values = {}
  for (const id of FIELDS) {
    const key = inputs[id].value
    const problem = showErrorFor(id, key)
    if (problem) return showError(problem)
    values[id] = key
  }
  if (new Set(FIELDS.map(id => values[id].toLowerCase())).size !== FIELDS.length) {
    return showError('Jede Taste darf nur einmal vergeben sein.')
  }
  const speed = Number(String(speedInput.value).replace(',', '.'))
  if (!Number.isFinite(speed)) return showError('Bitte eine gültige Geschwindigkeit eingeben.')
  chrome.storage.sync.set({ [HOTKEYS_KEY]: values, [SPEED_KEY]: clampSpeed(speed), [CINEMA_KEY]: cinemaInput.checked }, () => {
    if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
    showStatus('Gespeichert – gilt ab sofort in allen Tabs.')
  })
}

const resetToDefaults = () => {
  chrome.storage.sync.set(
    { [HOTKEYS_KEY]: { ...DEFAULT_HOTKEYS }, [SPEED_KEY]: DEFAULT_SPEED, [CINEMA_KEY]: DEFAULT_CINEMA },
    () => {
      if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
      FIELDS.forEach(id => { inputs[id].value = DEFAULT_HOTKEYS[id] })
      speedInput.value = DEFAULT_SPEED
      cinemaInput.checked = DEFAULT_CINEMA
      showStatus('Standard (S / D / R, 1.8×, Kino-Modus an) wiederhergestellt.')
    })
}

$('save').addEventListener('click', save)
$('reset').addEventListener('click', resetToDefaults)
FIELDS.forEach(id => inputs[id].addEventListener('input', () => { error.hidden = true }))
speedInput.addEventListener('input', () => { error.hidden = true })
cinemaInput.addEventListener('change', () => { error.hidden = true })
document.addEventListener('DOMContentLoaded', load)