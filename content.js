// Video Speed Control with Keyboard – Chrome Extension (MV3)
// Portiert aus dem gleichnamigen Userscript. Hotkeys sind über die
// Einstellungsseite konfigurierbar (chrome.storage.sync, live aktiv).
//
// Komplett in einer IIFE gekapselt: Content Scripts teilen sich die globalen
// lexical Bindungen (const/let) des Isolated World – top-level const würde
// Kollisionen mit content-redirect.js verursachen (dort gibt es ebenfalls ein `log`).
(() => {
const log = (...args) => console.info('%cVPC', 'color:grey', ...args)
const on = (target, types, fn, opts) => types.forEach(t => target.addEventListener(t, fn, opts))

/** Kurze Nachricht oben rechts. Nutzt das Popover-Top-Layer, damit sie auch im Vollbild erscheint. */
const toast = (() => {
  const DURATION_MS = 2500
  const STYLE = {
    position: 'fixed', inset: '0 0 auto auto', margin: '3vw', padding: '10px 20px',
    width: 'auto', height: 'auto', overflow: 'visible', border: 'none', 'border-radius': '5px',
    color: 'white', background: 'linear-gradient(to right, rgb(7 128 113), rgb(111 155 35))',
    font: '18px/1.2 sans-serif', 'z-index': '2147483647', 'pointer-events': 'none',
  }
  let el, timer

  const hide = () => {
    clearTimeout(timer)
    el?.remove()
    el = null
  }

  const fullscreenElement = () => {
    let fs = document.fullscreenElement ?? document.webkitFullscreenElement
    while (fs?.shadowRoot?.fullscreenElement) fs = fs.shadowRoot.fullscreenElement
    return fs
  }

  const attach = (node) => {
    document.body.append(node)
    try {
      node.setAttribute('popover', 'manual')
      node.showPopover()
      if (node.matches(':popover-open')) return
    } catch { /* kein Popover-Support */ }
    // Fallback: innerhalb des Fullscreen-Elements platzieren (unmöglich, wenn dieses selbst das Media-Element ist).
    node.removeAttribute('popover')
    const fs = fullscreenElement()
    if (fs && !['video', 'audio', 'iframe'].includes(fs.localName)) fs.append(node)
  }

  const show = (text) => {
    if (!document.body) return
    hide()
    el = Object.assign(document.createElement('div'), { textContent: text })
    Object.entries(STYLE).forEach(([k, v]) => el.style.setProperty(k, v, 'important'))
    attach(el)
    timer = setTimeout(hide, DURATION_MS)
  }

  // Vollbild an/aus schließt Popover: Toast erneut sichtbar machen, ganz oben.
  on(document, ['fullscreenchange', 'webkitfullscreenchange'], () => el && show(el.textContent), true)

  return { show }
})()

const speedControl = (() => {
  const SPEED_KEY = 'playbackSpeed'
  const HOTKEYS_KEY = 'hotkeys'
  const DEFAULT_HOTKEYS = { decrease: 's', increase: 'd', toggle: 'r' }
  const MIN = 0.25, MAX = 10, STEP = 0.1, TOGGLE_LOW = 1
  const ENFORCE_MS = 1500   // begrenzter Schutz nach Hotkey, Skip und Wiederaufnahme
  const MEDIA_EVENTS = ['play', 'playing', 'seeking', 'seeked', 'loadedmetadata']
  const MAX_RESTORES = 10   // Sicherheitsnetz gegen Endlosgefechte mit dem Player
  const ACTIONS = {
    decrease: { label: 'Langsamer', next: s => s - STEP },
    increase: { label: 'Schneller', next: s => s + STEP },
    toggle:   { label: 'Umschalten 1.00× / gespeichert' },
  }

  let speed = 1.8
  let hotkeys = { ...DEFAULT_HOTKEYS }
  let settingsLoaded = false
  let video
  // Auswahl und Schutz gehören zum jeweiligen Video, nicht zum zuletzt aktiven Player.
  // `speed` bleibt die gespeicherte Präferenz; z. B. R auf 1.00× gilt nur für dieses Video.
  const videoStates = new WeakMap()
  const handledMediaEvents = new WeakSet() // Dokument-Capture und Zielphase nur einmal behandeln

  const clamp = s => Math.round(Math.min(MAX, Math.max(MIN, s)) * 100) / 100
  const stored = () => speed

  const saveSpeed = (v) => {
    speed = v
    try { chrome.storage?.sync.set({ [SPEED_KEY]: v }) } catch (e) { log('Speichern fehlgeschlagen', e) }
  }

  const loadSettings = () => {
    try {
      chrome.storage.sync.get({ [SPEED_KEY]: 1.8, [HOTKEYS_KEY]: DEFAULT_HOTKEYS }, (res) => {
        if (chrome.runtime.lastError) return log('Fehler beim Laden der Einstellungen', chrome.runtime.lastError)
        speed = clamp(Number(res[SPEED_KEY]) || 1)
        hotkeys = { ...DEFAULT_HOTKEYS, ...res[HOTKEYS_KEY] }
        settingsLoaded = true
        scheduleInitialApply()
      })
      // Änderungen aus der Einstellungsseite (oder anderen Tabs) live übernehmen.
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return
        if (changes[SPEED_KEY]?.newValue != null) speed = clamp(Number(changes[SPEED_KEY].newValue) || 1)
        if (changes[HOTKEYS_KEY]?.newValue) hotkeys = { ...DEFAULT_HOTKEYS, ...changes[HOTKEYS_KEY].newValue }
      })
    } catch (e) {
      log('Kein Zugriff auf chrome.storage – nutze Defaults', e)
      settingsLoaded = true
      scheduleInitialApply()
    }
  }

  const shadowRoots = (node) => [node, ...node.querySelectorAll('*')]
    .filter(e => e.shadowRoot)
    .flatMap(e => [e.shadowRoot, ...shadowRoots(e.shadowRoot)])

  const findVideo = () => document.querySelector('video')
    ?? (document.body ? shadowRoots(document.body) : []).map(r => r.querySelector('video')).find(Boolean)

  const writeRate = (v, value) => {
    // Unveränderte Setter vermeiden: auch defaultPlaybackRate löst ratechange aus.
    if (v.defaultPlaybackRate !== value) v.defaultPlaybackRate = value
    if (v.playbackRate !== value) v.playbackRate = value
  }

  const restore = ({ currentTarget: v }) => {
    const state = videoStates.get(v)
    if (!state || Date.now() > state.enforceUntil || state.restores >= MAX_RESTORES) return
    if (v.playbackRate === state.rate && v.defaultPlaybackRate === state.rate) return
    state.restores++
    log(`Player set ${v.playbackRate}, restoring ${state.rate}`)
    writeRate(v, state.rate)
  }

  /** Auswahl anwenden; automatische Medien-Events dürfen sie nicht neu speichern. */
  const apply = (value, v, userAction = false, save = true, protect = userAction) => {
    if (!v) return log('No video element found')
    value = clamp(value)
    let state = videoStates.get(v)
    if (!state) {
      state = { rate: value, enforceUntil: 0, restores: 0 }
      videoStates.set(v, state)
      v.addEventListener('ratechange', restore)
      // Medien-Events sind nicht composed: direkt am Video auch im Shadow DOM empfangen.
      on(v, MEDIA_EVENTS, onMedia, true)
    }
    state.rate = value
    if (save) saveSpeed(value)
    if (protect) {
      state.enforceUntil = Date.now() + ENFORCE_MS
      state.restores = 0
    }
    if (userAction || v.playbackRate !== value) toast.show(value.toFixed(2))
    writeRate(v, value)
  }

  const step = (action, v) => {
    const target = v ?? video ?? findVideo()
    if (action === 'toggle') {
      // Immer auf 1.00× umschalten – und aus 1.00× heraus zurück auf die gespeicherte Rate.
      // Die Richtung wird bewusst gegen 1.00× geprüft, NICHT gegen `stored()`: sonst schaltet
      // „r" bei jeder Rate, die nicht exakt die gespeicherte ist (Player-Eigenwert, verstellte
      // Einstellung), auf `stored()` statt auf 1.00× – die Taste wirkt dann, als täte sie nichts.
      const rate = target?.playbackRate ?? TOGGLE_LOW
      const want = Math.abs(rate - TOGGLE_LOW) < 0.01 ? stored() : TOGGLE_LOW
      log(`Toggle: ${rate} → ${want} (gespeichert ${stored()})`)
      return apply(want, target, true, false)
    }
    // Schrittweite immer ab der GESPEICHERTEN Geschwindigkeit, nicht ab der gerade laufenden:
    // die laufende Rate kann der Player jederzeit selbst gesetzt haben (Reset, neues Video,
    // laufender Toggle) – dann würde ein Schritt bei 1.00× landen statt bei 1.90× und die
    // gespeicherte Geschwindigkeit mit dem Fremdwert überschreiben.
    apply(ACTIONS[action].next(stored()), target, true)
  }

  /**
   * Wird gerade in ein Eingabefeld getippt? Dann gehört der Tastendruck der Seite, nicht uns.
   * Über composedPath, damit auch Eingabefelder in Shadow DOM und Inhalte innerhalb eines
   * contenteditable-Bereichs erkannt werden (dort ist isContentEditable ebenfalls true).
   */
  const isTyping = (e) => (e.composedPath?.() ?? [e.target])
    .some(el => ['input', 'textarea', 'select'].includes(el?.localName) || el?.isContentEditable === true)

  /** Gibt es auf dieser Seite überhaupt ein Video? Ohne Video haben wir hier nichts zu suchen. */
  const hasVideo = () => video ?? document.querySelector('video') ?? findVideo()

  /** Aktion für ein Tastatur-Event anhand der konfigurierten Hotkeys ermitteln. */
  const actionForKey = (e) => {
    const k = (e.key ?? '').toLowerCase()
    if (!k || k.length !== 1) return null
    for (const [action, configured] of Object.entries(hotkeys)) {
      if (!configured || configured.toLowerCase() !== k) continue
      if (e.ctrlKey || e.altKey || e.metaKey) return null
      // Shift-Buchstaben (z. B. Großbuchstaben) nicht auslösen, um versehentliche Treffer zu vermeiden.
      if (e.shiftKey && /^[a-z]$/.test(configured.toLowerCase())) return null
      return action
    }
    return null
  }

  const onKey = (e) => {
    // Zuerst die Ausstiege: in Eingabefeldern (sonst wäre „r" nirgends mehr tippbar) und auf
    // Seiten ohne Video lassen wir den Tastendruck unangetastet.
    if (isTyping(e) || !hasVideo()) return
    const action = actionForKey(e)
    if (!action) return
    e.preventDefault()
    e.stopImmediatePropagation() // den Player nicht denselben Tastendruck verarbeiten lassen
    if (e.type === 'keydown') step(action)
  }

  const onMedia = (e) => {
    const { type, target } = e
    if (target?.localName !== 'video') return
    if (!settingsLoaded) return
    // Dokument-Capture und Zielphase teilen sich EIN Event-Objekt (Browser wie Harness):
    // nur einmal behandeln, sonst wird jede Resume/Seek doppelt angewendet.
    if (handledMediaEvents.has(e)) return
    handledMediaEvents.add(e)
    if (type === 'play' || type === 'playing') video = target
    const state = videoStates.get(target)
    if (!state) {
      // Neues Video: gespeicherte Rate anwenden, aber nichts zurückschreiben und
      // Schutz aktivieren (Player setzen die Rate gern sofort wieder zurück).
      apply(stored(), target, false, false, true)
      return
    }
    // Bekanntes Video: die EIGENE Auswahl behalten – z. B. das temporäre 1.00× nach „r".
    // Ein blindes apply(stored()) würde jeden Skip/Resume auf die gespeicherte Rate
    // zurücksetzen und damit „r" kassieren. Stattdessen Schutz für die eigene Rate erneuern
    // und einen bereits erfolgten Player-Reset sofort still korrigieren (kein Toast, kein Save).
    state.enforceUntil = Date.now() + ENFORCE_MS
    state.restores = 0
    if (target.playbackRate !== state.rate || target.defaultPlaybackRate !== state.rate) {
      log(`Skip/Resume (${type}): halte ${state.rate} (Player wollte ${target.playbackRate})`)
      writeRate(target, state.rate)
    }
  }

  const applyToInitialVideo = () => {
    video = findVideo()
    // Initial nur anwenden, nichts zurückschreiben (sonst onChanged-Lärm in allen Tabs).
    if (video) apply(stored(), video, false, false, true)
  }

  const scheduleInitialApply = () => {
    if (!settingsLoaded) return
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyToInitialVideo, { once: true })
    } else {
      applyToInitialVideo()
    }
  }

  const init = () => {
    // window + capture + document-start: läuft vor den eigenen Handlern der Seite.
    on(window, ['keydown', 'keypress', 'keyup'], onKey, true)
    on(document, ['play', 'playing'], onMedia, true)

    loadSettings()
  }

  return { init }
})()

speedControl.init()

// Kino-Modus (YouTube-Theatermodus): den Player breit schalten, aber nicht ins Vollbild.
// YouTube ist eine SPA und baut den Player ständig neu – deshalb wird der Zustand nicht
// nur einmal gesetzt, sondern immer wieder nachgefasst, solange die Watch-Seite läuft.
const cinemaMode = (() => {
  const CINEMA_KEY = 'cinemaMode'
  const DEBOUNCE_MS = 250   // YouTube mutiert sehr viel: Meldungen bündeln
  const GRACE_MS = 900      // Zeit, bis YouTube den Klick angewendet hat (kein Ping-Pong)
  const WATCH_PATH = /^\/(watch$|live\/)/  // Theatermodus gibt es nur auf Watch-/Live-Seiten

  let enabled = true
  let lastClick = 0
  let timer

  const isSupported = () => typeof location !== 'undefined'
    && /(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname)

  const onWatchPage = () => isSupported() && WATCH_PATH.test(location.pathname)

  const flexy = () => document.querySelector('ytd-watch-flexy')

  /** Der Watch-Container trägt `theater` (`fullbleed` = randlosen Theatermodus). */
  const isTheater = () => {
    const f = flexy()
    return !!f && (f.hasAttribute('theater') || f.hasAttribute('fullbleed'))
  }

  /** Fallback-Texte decken locale UIs ab („Theatermodus“, „Theatre mode“). */
  const theaterButton = () => {
    const direct = document.querySelector('.ytp-size-button')
    if (direct) return direct
    const buttons = document.querySelectorAll?.('button')
    if (!buttons) return null
    return Array.from(buttons).find(b =>
      /theat|kino|cinema/i.test(b.title || b.getAttribute?.('aria-label') || '')) ?? null
  }

  const ensure = () => {
    if (!enabled || !onWatchPage() || isTheater()) return
    if (Date.now() - lastClick < GRACE_MS) return  // Klick wirkt erst asynchron
    const btn = theaterButton()
    if (!btn) return   // Controls noch nicht gerendert – die nächste Meldung versucht es erneut
    lastClick = Date.now()
    log('Kino-Modus: Theatermodus einschalten')
    btn.click()
  }

  const schedule = () => {
    if (!enabled || !onWatchPage()) return
    clearTimeout(timer)
    timer = setTimeout(ensure, DEBOUNCE_MS)
  }

  const loadSetting = () => {
    try {
      chrome.storage.sync.get({ [CINEMA_KEY]: true }, (res) => {
        if (chrome.runtime.lastError) return log('Kino-Modus: Einstellung nicht lesbar', chrome.runtime.lastError)
        enabled = res[CINEMA_KEY] !== false
        schedule()
      })
      // live reagieren, wenn die Einstellung in einem anderen Tab umgeschaltet wird
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' || changes[CINEMA_KEY] == null) return
        enabled = changes[CINEMA_KEY].newValue !== false
        if (enabled) schedule()
      })
    } catch (e) {
      log('Kein Zugriff auf chrome.storage – Kino-Modus bleibt aktiv', e)
    }
  }

  const init = () => {
    if (!isSupported()) return  // außerhalb von YouTube gibt es keinen Kino-Modus
    loadSetting()
    document.addEventListener('yt-navigate-finish', schedule, true) // SPA-Navigation (zurück/weiter)
    const startObserver = () => {
      if (typeof MutationObserver !== 'function' || !document.documentElement) return
      // Eigene Zurücksetzungen und das manuelle Ausschalten werden hier gemeldet.
      new MutationObserver(schedule).observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['theater', 'fullbleed'],
      })
    }
    if (document.documentElement) startObserver()
    else document.addEventListener('DOMContentLoaded', startObserver, { once: true })
    schedule() // einmal direkt: Theatermodus gilt auch beim ersten Laden der Seite
  }

  return { init }
})()

cinemaMode.init()
})()