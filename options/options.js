// options.js – Einstellungsseite: Hotkeys konfigurieren (live aktiv in allen Tabs).

const HOTKEYS_KEY = 'hotkeys'
const SPEED_KEY = 'playbackSpeed'
const CHANNELS_KEY = 'channelSpeeds'
const CINEMA_KEY = 'cinemaMode'
const DEFAULT_HOTKEYS = { decrease: 's', increase: 'd', toggle: 'r' }
const DEFAULT_SPEED = 1.8
const DEFAULT_CHANNEL_RULES = [{ pattern: 'sport', speed: 1.1 }]
const DEFAULT_CINEMA = true
const MIN_SPEED = 0.25, MAX_SPEED = 10
const FIELDS = ['decrease', 'increase', 'toggle']

const $ = (id) => document.getElementById(id)
const inputs = Object.fromEntries(FIELDS.map(id => [id, $(id)]))
const speedInput = $('speed')
const channelsInput = $('channels')
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
    { [HOTKEYS_KEY]: DEFAULT_HOTKEYS, [SPEED_KEY]: DEFAULT_SPEED, [CHANNELS_KEY]: DEFAULT_CHANNEL_RULES, [CINEMA_KEY]: DEFAULT_CINEMA },
    (res) => {
      if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
      const hotkeys = { ...DEFAULT_HOTKEYS, ...res[HOTKEYS_KEY] }
      FIELDS.forEach(id => { inputs[id].value = hotkeys[id] ?? '' })
      speedInput.value = Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(res[SPEED_KEY]) || DEFAULT_SPEED)) * 100) / 100
      channelsInput.value = (res[CHANNELS_KEY] || []).map(r => `${r.pattern} = ${r.speed}`).join('\n')
      cinemaInput.checked = res[CINEMA_KEY] !== false
    })
}

const clampSpeed = (v) => Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, v)) * 100) / 100

const parseChannels = (text) => {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
  const out = []
  for (const line of lines) {
    const m = line.match(/^(.+?)\s*=\s*(.+)$/)
    if (!m) { showError(`Ungültige Zeile: „${line}“ (erwartet Muster = Geschwindigkeit)`); return null }
    const pattern = m[1].trim()
    const speed = Number(String(m[2]).replace(',', '.'))
    if (!pattern) { showError(`Leeres Muster in Zeile: „${line}“`); return null }
    if (!Number.isFinite(speed)) { showError(`Ungültige Geschwindigkeit in Zeile: „${line}“`); return null }
    out.push({ pattern, speed: clampSpeed(speed) })
  }
  return out
}

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
  const channels = parseChannels(channelsInput.value)
  if (channels === null) return
  chrome.storage.sync.set({ [HOTKEYS_KEY]: values, [SPEED_KEY]: clampSpeed(speed), [CHANNELS_KEY]: channels, [CINEMA_KEY]: cinemaInput.checked }, () => {
    if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
    showStatus('Gespeichert – gilt ab sofort in allen Tabs.')
  })
}

const resetToDefaults = () => {
  chrome.storage.sync.set(
    { [HOTKEYS_KEY]: { ...DEFAULT_HOTKEYS }, [SPEED_KEY]: DEFAULT_SPEED, [CHANNELS_KEY]: DEFAULT_CHANNEL_RULES, [CINEMA_KEY]: DEFAULT_CINEMA },
    () => {
      if (chrome.runtime.lastError) return showError(chrome.runtime.lastError.message)
      FIELDS.forEach(id => { inputs[id].value = DEFAULT_HOTKEYS[id] })
      speedInput.value = DEFAULT_SPEED
      channelsInput.value = DEFAULT_CHANNEL_RULES.map(r => `${r.pattern} = ${r.speed}`).join('\n')
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