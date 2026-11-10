// Einstellungsseite: explizit speichern, Änderungen gelten live in offenen Tabs.
const { DEFAULT_CHANNEL_RULES, channelKey, normalizeRules, validSpeed } = VSC_RULES
const DEFAULTS = {
  hotkeys: { decrease: 's', increase: 'd', toggle: 'r' },
  playbackSpeed: 1.8,
  channelSpeeds: DEFAULT_CHANNEL_RULES,
  youtubeKidsNormalSpeed: true,
  cinemaMode: true,
  watchLaterCleanup: true,
}
const FIELDS = ['decrease', 'increase', 'toggle']
const $ = id => document.getElementById(id)
let rowId = 0

const clearError = () => { $('error').hidden = true }
const showError = (message, field) => {
  $('error').textContent = message
  $('error').hidden = false
  ;(field || $('error')).focus()
}
const showStatus = text => { $('status').textContent = text }

const addRule = (rule = { type: 'channel', pattern: '', speed: 1 }, focus = false) => {
  const id = ++rowId
  const row = document.createElement('fieldset')
  row.className = 'rule'
  row.dataset.type = rule.type
  row.savedPattern = rule.pattern
  row.aliases = rule.aliases || []
  const legend = document.createElement('legend')
  legend.textContent = rule.type === 'url' ? 'Bestehende URL-Regel' : 'YouTube-Kanal'
  row.append(legend)
  const fields = document.createElement('div')
  fields.className = 'rule-fields'
  const patternLabel = document.createElement('label')
  patternLabel.htmlFor = `pattern-${id}`
  patternLabel.textContent = rule.type === 'url' ? 'URL enthält' : 'Kanal'
  const pattern = document.createElement('input')
  Object.assign(pattern, { id: `pattern-${id}`, name: `pattern-${id}`, className: 'rule-pattern', value: rule.pattern, required: true, autocomplete: 'off', spellcheck: false })
  pattern.setAttribute('autocapitalize', 'off')
  pattern.setAttribute('autocorrect', 'off')
  pattern.setAttribute('aria-describedby', 'channels-help')
  pattern.placeholder = rule.type === 'url' ? 'example.com/videos' : '@sportstudio'
  patternLabel.append(pattern)
  const speedLabel = document.createElement('label')
  speedLabel.htmlFor = `rate-${id}`
  speedLabel.textContent = 'Tempo (×)'
  const rate = document.createElement('input')
  Object.assign(rate, { id: `rate-${id}`, name: `rate-${id}`, className: 'rule-speed', type: 'number', min: '0.25', max: '10', step: '0.01', value: rule.speed, required: true })
  rate.setAttribute('inputmode', 'decimal')
  speedLabel.append(rate)
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.textContent = 'Entfernen'
  remove.addEventListener('click', () => { row.remove(); $('add-channel').focus(); clearError(); showStatus('Änderungen noch nicht gespeichert.') })
  fields.append(patternLabel, speedLabel, remove)
  row.append(fields)
  $('channels').append(row)
  if (focus) pattern.focus()
}

const render = settings => {
  for (const id of FIELDS) $(id).value = settings.hotkeys?.[id] || DEFAULTS.hotkeys[id]
  $('speed').value = validSpeed(settings.playbackSpeed) ?? DEFAULTS.playbackSpeed
  $('kids').checked = settings.youtubeKidsNormalSpeed !== false
  $('cinema').checked = settings.cinemaMode !== false
  $('watch-later').checked = settings.watchLaterCleanup !== false
  $('channels').replaceChildren()
  normalizeRules(settings.channelSpeeds).forEach(rule => addRule(rule))
}

const resolveAliases = async pattern => {
  if (!/^(?:@|channel\/|c\/|user\/)/.test(pattern)) return []
  const response = await fetch(`https://www.youtube.com/${pattern}`, { credentials: 'omit', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Kanal nicht erreichbar')
  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const canonical = channelKey(doc.querySelector('meta[property="og:url"]')?.content || '')
  const match = html.match(/"vanityChannelUrl":"([^"\\]*(?:\\.[^"\\]*)*)"/)
  const handle = match ? channelKey(JSON.parse(`"${match[1]}"`)) : ''
  if (!canonical.startsWith('channel/')) throw new Error('Kanal konnte nicht eindeutig erkannt werden')
  return [...new Set([canonical, handle].filter(Boolean))]
}

const save = async event => {
  event.preventDefault()
  clearError()
  showStatus('')
  const hotkeys = Object.fromEntries(FIELDS.map(id => [id, $(id).value]))
  for (const id of FIELDS) {
    if (hotkeys[id].trim().length !== 1) return showError('Bitte für jede Aktion genau ein Zeichen festlegen.', $(id))
    if (FIELDS.some(other => other !== id && hotkeys[id].toLowerCase() === hotkeys[other].toLowerCase())) {
      return showError('Jede Taste darf nur einmal vergeben sein.', $(id))
    }
  }
  const speed = validSpeed($('speed').value)
  if (speed === null) return showError('Bitte ein Standardtempo zwischen 0,25 und 10 eingeben.', $('speed'))
  const rules = []
  const seen = new Set()
  for (const row of $('channels').children) {
    const field = row.querySelector('.rule-pattern')
    const rate = row.querySelector('.rule-speed')
    const type = row.dataset.type
    const pattern = type === 'channel' ? channelKey(field.value) : field.value.trim().toLowerCase()
    if (!pattern) return showError('Bitte einen @Handle, Kanal-Link oder exakten Kanalnamen eingeben.', field)
    const value = validSpeed(rate.value)
    if (value === null) return showError('Bitte ein Kanaltempo zwischen 0,25 und 10 eingeben.', rate)
    const key = `${type}:${pattern}`
    if (seen.has(key)) return showError('Für diesen Kanal oder dieses URL-Muster gibt es bereits eine Regel.', field)
    seen.add(key)
    rules.push({ type, pattern, speed: value, aliases: row.savedPattern === pattern ? row.aliases : [] })
  }
  $('settings-fields').disabled = true
  try {
    for (const rule of rules) {
      if (rule.type === 'channel' && !rule.aliases.length) rule.aliases = await resolveAliases(rule.pattern)
    }
    await chrome.storage.sync.set({ hotkeys, playbackSpeed: speed, channelSpeeds: rules, youtubeKidsNormalSpeed: $('kids').checked, cinemaMode: $('cinema').checked, watchLaterCleanup: $('watch-later').checked })
    // Nach erfolgreicher Auflösung Aliasse behalten, auch wenn die Seite offen bleibt.
    ;[...$('channels').children].forEach((row, index) => { row.savedPattern = rules[index].pattern; row.aliases = rules[index].aliases })
    showStatus('Gespeichert – gilt ab sofort in allen Tabs.')
  } catch (e) { showError(`Speichern fehlgeschlagen: ${e.message}. Bitte Verbindung und Kanal-Link prüfen.`) }
  finally { $('settings-fields').disabled = false }
}

$('settings').addEventListener('submit', save)
$('settings').addEventListener('input', () => { clearError(); showStatus('Änderungen noch nicht gespeichert.') })
$('add-channel').addEventListener('click', () => { addRule(undefined, true); showStatus('Änderungen noch nicht gespeichert.') })
$('reset').addEventListener('click', async () => {
  clearError()
  try {
    await chrome.storage.sync.set(DEFAULTS)
    render(DEFAULTS)
    showStatus('Standard wiederhergestellt: sportstudio 1,0×, YouTube Kids 1,0×, sonst 1,8×; Kino-Modus und Später-ansehen-Aufräumer an.')
  } catch (e) { showError(`Zurücksetzen fehlgeschlagen: ${e.message}`) }
})
const load = async () => {
  try {
    render(await chrome.storage.sync.get(DEFAULTS))
    $('settings-fields').disabled = false
  } catch (e) { showError(`Einstellungen konnten nicht geladen werden: ${e.message}`) }
}
load()
