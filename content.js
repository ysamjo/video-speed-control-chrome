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
  const CHANNEL_RULES_KEY = 'channelSpeeds'
  const KIDS_KEY = 'youtubeKidsNormalSpeed'
  const DEFAULT_HOTKEYS = { decrease: 's', increase: 'd', toggle: 'r' }
  const MIN = 0.25, MAX = 10, STEP = 0.1, TOGGLE_LOW = 1
  const { DEFAULT_CHANNEL_RULES, normalizeRules, readChannel, resolve, mediaKey, isYouTube, isKids, channelKey } = VSC_RULES
  const ENFORCE_MS = 1500   // begrenzter Schutz nach Hotkey, Skip und Wiederaufnahme
  const MEDIA_EVENTS = ['play', 'playing', 'seeking', 'seeked', 'loadedmetadata']
  const MAX_RESTORES = 10   // Sicherheitsnetz gegen Endlosgefechte mit dem Player
  const ACTIONS = {
    decrease: { label: 'Langsamer', next: s => s - STEP },
    increase: { label: 'Schneller', next: s => s + STEP },
    toggle:   { label: 'Umschalten 1.00× / Auswahl' },
  }

  let speed = 1.8
  let hotkeys = { ...DEFAULT_HOTKEYS }
  let channelRules = []
  let kids = true
  let navigating = false
  let contextTimer
  let settingsLoaded = false
  let video
  const channelMetadata = new Map()
  // Auswahl und Schutz gehören zum jeweiligen Video, nicht zum zuletzt aktiven Player.
  // `speed` bleibt die gespeicherte Präferenz; z. B. R auf 1.00× gilt nur für dieses Video.
  const videoStates = new WeakMap()
  const handledMediaEvents = new WeakSet() // Dokument-Capture und Zielphase nur einmal behandeln

  const clamp = s => Math.round(Math.min(MAX, Math.max(MIN, s)) * 100) / 100
  let manualIntent
  const kidsContext = Array.from(location.ancestorOrigins || []).some(origin => {
    try { return isKids(new URL(origin).hostname) } catch { return false }
  })
  const channelsForContext = () => {
    const channels = readChannel(document, location)
    if (channels.length || !isYouTube(location.hostname) || location.pathname !== '/watch') return channels
    const id = new URL(location.href).searchParams.get('v')
    const watch = document.querySelector('ytd-watch-flexy')
    // Gemeinsame Uploads zeigen statt Owner-Links einen Dialogknopf. Keine alten
    // Head-Metadaten verwenden: diese bleiben nach SPA-Wechseln oft unverändert.
    if (!id || watch?.getAttribute?.('video-id') !== id || !document.querySelector('ytd-watch-flexy #owner') || typeof fetch !== 'function') return []
    if (channelMetadata.has(id)) return channelMetadata.get(id)
    channelMetadata.set(id, []) // parallele Aufrufe derselben Anfrage verhindern
    if (channelMetadata.size > 20) channelMetadata.delete(channelMetadata.keys().next().value)
    const key = mediaKey(location)
    ;(async () => {
      try {
        const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
        const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(5000) })
        if (!response.ok) return
        const data = await response.json()
        const owner = channelKey(data.author_url)
        if (!owner || !channelMetadata.has(id)) return
        channelMetadata.set(id, [owner, String(data.author_name || '').trim().toLowerCase()].filter(Boolean))
        if (mediaKey(location) === key) refreshContext()
      } catch (e) { log('Kanal-Metadaten nicht verfügbar', e.message) }
    })()
    return []
  }
  const context = () => resolve({ location, channels: navigating ? [] : channelsForContext(), rules: channelRules, speed, kids, kidsContext })

  // YouTube verwendet dieselbe Blob-Quelle auch beim Spulen/Qualitätswechsel.
  // Dort identifiziert die Video-URL den Inhalt; sonst zusätzlich die Medienquelle.
  const sourceKey = v => `${mediaKey(location)}${isYouTube(location.hostname) && /^\/(watch|shorts\/|live\/)/.test(location.pathname)
    ? '' : `|${v.currentSrc || v.src || ''}`}`

  const loadSettings = () => {
    try {
      chrome.storage.sync.get({ [SPEED_KEY]: 1.8, [HOTKEYS_KEY]: DEFAULT_HOTKEYS, [CHANNEL_RULES_KEY]: DEFAULT_CHANNEL_RULES, [KIDS_KEY]: true }, (res) => {
        if (chrome.runtime.lastError) return log('Fehler beim Laden der Einstellungen', chrome.runtime.lastError)
        speed = clamp(Number(res[SPEED_KEY]) || 1)
        hotkeys = { ...DEFAULT_HOTKEYS, ...res[HOTKEYS_KEY] }
        channelRules = normalizeRules(res[CHANNEL_RULES_KEY])
        kids = res[KIDS_KEY] !== false
        settingsLoaded = true
        scheduleInitialApply()
      })
      // Änderungen aus der Einstellungsseite (oder anderen Tabs) live übernehmen.
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return
        if (changes[SPEED_KEY]?.newValue != null) speed = clamp(Number(changes[SPEED_KEY].newValue) || 1)
        if (changes[HOTKEYS_KEY]?.newValue) hotkeys = { ...DEFAULT_HOTKEYS, ...changes[HOTKEYS_KEY].newValue }
        if (changes[CHANNEL_RULES_KEY]?.newValue != null) channelRules = normalizeRules(changes[CHANNEL_RULES_KEY].newValue)
        if (changes[KIDS_KEY]) kids = changes[KIDS_KEY].newValue !== false
        if (changes[SPEED_KEY] || changes[CHANNEL_RULES_KEY] || changes[KIDS_KEY]) refreshContext(true)
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
    syncContext(v)
    const state = videoStates.get(v)
    if (!state) return
    if (v.playbackRate === state.rate && v.defaultPlaybackRate === state.rate) return
    const youtube = isYouTube(location.hostname)
    if (v.playbackRate !== state.rate && VSC_RULES.validSpeed(v.playbackRate) !== null
      && ((!youtube && Date.now() > state.enforceUntil) || (manualIntent?.video === v && Date.now() <= manualIntent.until))) {
      // Native Player-Auswahl übernehmen, ohne Kanal- oder Standardtempo zu speichern.
      state.rate = state.stepRate = clamp(v.playbackRate)
      state.manual = true
      state.enforceUntil = 0
      manualIntent = null
      writeRate(v, state.rate)
      return
    }
    if (youtube && Date.now() > state.enforceUntil) {
      state.enforceUntil = Date.now() + ENFORCE_MS
      state.restores = 0
    }
    if (Date.now() > state.enforceUntil) return
    if (state.restores >= MAX_RESTORES) {
      if (youtube && !state.retry) state.retry = setTimeout(() => {
        state.retry = null
        if (v.isConnected !== false) restore({ currentTarget: v })
      }, ENFORCE_MS + 1)
      return
    }
    state.restores++
    log(`Player set ${v.playbackRate}, restoring ${state.rate}`)
    writeRate(v, state.rate)
  }

  /** Auswahl anwenden; automatische Medien-Events dürfen sie nicht neu speichern. */
  const apply = (value, v, { userAction = false, remember = userAction, reset = false } = {}) => {
    if (!v) return log('No video element found')
    value = clamp(value)
    let state = videoStates.get(v)
    if (!state) {
      state = { rate: value, stepRate: value, manual: false, enforceUntil: 0, restores: 0 }
      videoStates.set(v, state)
      v.addEventListener('ratechange', restore)
      // Medien-Events sind nicht composed: direkt am Video auch im Shadow DOM empfangen.
      on(v, MEDIA_EVENTS, onMedia, true)
    }
    state.rate = value
    const policy = context()
    state.contextKey = sourceKey(v)
    state.policyKey = policy.key
    state.policyRate = policy.rate
    if (reset || remember) state.stepRate = value
    if (reset && manualIntent?.video === v) manualIntent = null
    state.manual = reset ? false : state.manual || userAction
    state.enforceUntil = Date.now() + ENFORCE_MS
    state.restores = 0
    if (userAction || v.playbackRate !== value) toast.show(value.toFixed(2))
    writeRate(v, value)
  }

  const step = (action, v) => {
    const target = v ?? video ?? findVideo()
    syncContext(target)
    const selected = videoStates.get(target)?.stepRate ?? context().rate
    if (action === 'toggle') {
      // Immer auf 1.00× umschalten – und daraus zurück zur letzten Auswahl dieses Videos.
      // Die Richtung wird bewusst gegen 1.00× geprüft, nicht gegen das gewählte Tempo.
      const rate = target?.playbackRate ?? TOGGLE_LOW
      const resume = Math.abs(selected - TOGGLE_LOW) < 0.01 ? context().rate : selected
      const want = Math.abs(rate - TOGGLE_LOW) < 0.01 ? resume : TOGGLE_LOW
      return apply(want, target, { userAction: true, remember: false })
    }
    // Nach R bleibt die letzte Auswahl die Schrittbasis; Kanalvorgaben starten bei ihrem Tempo.
    apply(ACTIONS[action].next(selected), target, { userAction: true })
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

  const onPlayerControl = e => {
    if (!e.isTrusted) return
    const path = e.composedPath?.() ?? [e.target]
    const control = path.some(el => el?.matches?.('[role="menuitemradio"], [role="slider"], input[type="range"], .html5-video-player') || el?.localName === 'video')
    const speedControl = path.some(el => {
      if (el?.matches?.('.ytp-speedslider, .ytp-variable-speed-panel-button')) return true
      const label = `${el?.getAttribute?.('aria-label') || ''} ${el?.title || ''}`
      if (/playback\s*(?:speed|rate)|geschwindigkeit|\btempo\b|\bspeed\b/i.test(label)) return true
      return el?.getAttribute?.('role') === 'menuitemradio'
        && /^(?:normal|standard|\d+(?:[.,]\d+)?\s*[x×]?)$/i.test((el.textContent || '').trim())
    })
    const speedShortcut = e.type === 'keydown' && ['<', '>'].includes(e.key)
    if (!control && !speedControl && !speedShortcut) return
    const target = path.find(el => el?.localName === 'video') ?? video ?? findVideo()
    if (!target) return
    if (speedControl || speedShortcut) manualIntent = { video: target, until: Date.now() + ENFORCE_MS }
    else {
      // Zeit-/Lautstärkeregler und Play-Klicks sind keine Tempowahl. Den Schutz bereits
      // vor dem Medienevent erneuern, weil manche Player zuerst die Rate zurücksetzen.
      manualIntent = null
      const state = videoStates.get(target)
      if (state) { state.enforceUntil = Date.now() + ENFORCE_MS; state.restores = 0 }
    }
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
    syncContext(target)
    const state = videoStates.get(target)
    if (!state) {
      // Neues Video: passende Rate (Kanal/URL-Regel oder global) anwenden, aber nichts zurückschreiben und
      // Schutz aktivieren (Player setzen die Rate gern sofort wieder zurück).
      apply(context().rate, target, { reset: true })
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

  const syncContext = (v, force = false) => {
    if (!v || !settingsLoaded) return
    const state = videoStates.get(v)
    const policy = context()
    const sameVideo = state?.contextKey === sourceKey(v)
    const policyChanged = state?.policyKey !== policy.key || state?.policyRate !== policy.rate
    if (sameVideo && state.manual && (!force || !policyChanged)) {
      // Ein spät gerenderter Owner darf die manuelle Auswahl dieses Videos nicht kassieren.
      state.policyKey = policy.key
      state.policyRate = policy.rate
      return
    }
    if (!state || !sameVideo || policyChanged) {
      apply(policy.rate, v, { reset: true })
    }
  }

  const refreshContext = (force = false) => {
    if (!settingsLoaded) return
    const videos = new Set(document.querySelectorAll('video'))
    const active = findVideo()
    if (active) videos.add(active)
    if (video?.isConnected !== false && video) videos.add(video)
    for (const v of videos) syncContext(v, force)
  }

  const scheduleContext = () => {
    // YouTube mutiert ständig: einen kurzen Prüfzyklus bündeln, ohne Polling.
    if (contextTimer) return
    contextTimer = setTimeout(() => { contextTimer = null; refreshContext() }, 100)
  }

  const observeContext = () => {
    if (!isYouTube(location.hostname)) return
    document.addEventListener('yt-navigate-start', () => { navigating = true }, true)
    document.addEventListener('yt-navigate-finish', () => { navigating = false; refreshContext(); scheduleContext() }, true)
    window.addEventListener('popstate', scheduleContext, true)
    const start = () => new MutationObserver(scheduleContext).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'video-id', 'is-active'],
    })
    if (document.documentElement) start()
    else document.addEventListener('DOMContentLoaded', start, { once: true })
  }

  const applyToInitialVideo = () => {
    video = findVideo()
    // Initial nur anwenden, nichts zurückschreiben (sonst onChanged-Lärm in allen Tabs).
    refreshContext()
  }

  const scheduleInitialApply = () => {
    if (!settingsLoaded) return
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyToInitialVideo, { once: true })
    } else {
      applyToInitialVideo()
    }
  }

  const ownerLabel = () => {
    const selectors = location.pathname.startsWith('/shorts/')
      ? ['ytd-reel-video-renderer[is-active] #channel-name a[href]', 'ytd-reel-video-renderer[is-active] a.yt-simple-endpoint[href^="/@"]']
      : location.pathname.startsWith('/embed/')
        ? ['.ytp-title-channel-name[href]']
        : ['ytd-watch-flexy #owner ytd-channel-name a[href]', 'ytd-watch-flexy #upload-info a[href]', 'ytm-video-owner-renderer a[href]', 'ytm-slim-owner-renderer a[href]']
    for (const selector of selectors) {
      for (const link of document.querySelectorAll(selector)) {
        const name = String(link?.textContent || link?.getAttribute?.('aria-label') || '').trim()
        if (name) return name
      }
    }
    return ''
  }

  // Liefert der Optionsseite den erkannten Kanal und die aktuell greifende Regel.
  const diagnose = () => {
    const active = video && video.isConnected !== false ? video : findVideo()
    const state = active ? videoStates.get(active) : null
    return {
      url: location.href,
      title: document.title || '',
      youtube: isYouTube(location.hostname),
      kids: isKids(location.hostname) || kidsContext,
      channels: readChannel(document, location),
      channelName: ownerLabel(),
      rule: context(),
      currentRate: active ? active.playbackRate : null,
      storedSpeed: speed,
      manual: !!state?.manual,
    }
  }

  const listenForDiagnosis = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage?.addListener) return
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'VSC_DIAGNOSE') return
      try { sendResponse({ ok: true, data: diagnose() }) }
      catch (error) { sendResponse({ ok: false, error: String(error?.message || error) }) }
    })
  }

  const init = () => {
    // window + capture + document-start: läuft vor den eigenen Handlern der Seite.
    on(window, ['keydown', 'keypress', 'keyup'], onKey, true)
    on(window, ['pointerdown', 'click', 'input', 'change', 'keydown'], onPlayerControl, true)
    on(document, MEDIA_EVENTS, onMedia, true)

    listenForDiagnosis()
    loadSettings()
    observeContext()
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
