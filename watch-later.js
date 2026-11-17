// watch-later.js
// „Später ansehen“ (youtube.com/playlist?list=WL) aufräumen:
// 1. Die Playlist-Karte (linke Spalte) wird ausgeblendet, ihre Wiedergabe-Leiste über die
//    Liste gesetzt und die Liste nimmt die volle Breite ein.
// 2. Jedes Listenelement bekommt einen Papierkorb-Button, der es ohne Umweg über das
//    Drei-Punkte-Menü entfernt.
//
// Wie die anderen Content Scripts komplett in einer IIFE gekapselt (gemeinsame globale
// Bindungen im Isolated World). Der Button entfernt bewusst über YouTubes eigenes Menü,
// damit ausschließlich der sichtbare Eintrag aus der Wiedergabeliste fällt (nicht das Video gelöscht wird).
(() => {
const log = (...args) => console.info('%cVPC', 'color:grey', ...args)

const watchLater = (() => {
  const KEY = 'watchLaterCleanup'
  const MARK = 'data-vpc-remove'
  const PLAY_BAR = 'data-vpc-play-bar'
  // Menüpunkte, die entfernen – deutsche und englische Oberfläche. Anführungszeichen
  // (typografisch oder gerade) und Zusätze wie „(Watch Later)“ werden vorher entfernt.
  const REMOVE_TEXT = /^(?:aus\s*(?:„|“|")?später ansehen(?:„|“|")?\s*entfernen|remove from\s*(?:„|“|")?(?:watch later|später ansehen)(?:„|“|")?)$/i
  const STYLE_ID = 'vpc-watch-later-style'
  const CSS = `
    /* Die linke Playlist-Karte (Titel, Cover, Statistik) kostet nur Platz – weg damit.
       Die Wiedergabe-Leiste wird per JS über die Liste gesetzt. */
    ytd-playlist-header-renderer,
    ytd-playlist-sidebar-renderer,
    ytd-playlist-panel-renderer,
    ytd-playlist-video-list-renderer #header-description { display: none !important; }
    /* YouTube reserviert links den Platz für die feste Karte – ohne Karte volle Breite. */
    ytd-two-column-browse-results-renderer { padding-left: 0 !important; }
    /* Wiedergabe/Zufallsmix über der Liste (verschobener Menüknoten der Karte). */
    #primary > .vpc-play-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 16px; }
    /* Hinweise wie „Kommt es zu Unterbrechungen?“ (Alters-/Regionssperre) blähen die Einträge auf. */
    ytd-playlist-video-renderer #description,
    ytd-playlist-video-renderer .ytd-video-primary-info-renderer,
    ytd-playlist-video-renderer ytd-badge-supported-renderer { display: none !important; }
    /* Papierkorb im Menü des Listeneintrags: gleiche Fläche wie die Drei-Punkte-Schaltfläche. */
    /* Farbe erben: YouTubes Theme-Variablen sind hier nicht definiert, ein fester
       Fallback wäre im Dark Mode unsichtbar. „inherit“ trifft exakt die Farbe der
       benachbarten Drei-Punkte-Schaltfläche. */
    .vpc-remove { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
      padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit;
      cursor: pointer; opacity: 0.7; }
    .vpc-remove:hover { background: rgba(128, 128, 128, .2); opacity: 1; }
    .vpc-remove:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #065fd4); outline-offset: 1px; }
    .vpc-remove svg { width: 24px; height: 24px; }
    .vpc-remove[aria-disabled="1"], .vpc-remove[data-busy] { opacity: 0.4; cursor: progress; }
    ytd-browse[page-subtype="playlist"] ytd-two-column-browse-results-renderer #primary { max-width: none !important; }
  `

  let enabled = true
  let observer = null
  let timer = null
  let running = false

  const isPlaylistPage = () => /(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname)
    && location.pathname === '/playlist'

  const isWatchLater = () => {
    if (!isPlaylistPage()) return false
    try { return new URL(location.href).searchParams.get('list') === 'WL' } catch { return false }
  }

  const active = () => enabled && isWatchLater()

  /** Einen Menüpunkt über Text oder aria-label finden (YouTubes Menüeinträge sind mehrsprachig). */
  const findRemoveItem = (root = document) => {
    if (!root?.querySelectorAll) return null
    const items = [...root.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item, [role="menuitem"]')]
    return items.find(item => {
      if (/späteres video|start watching|wiedergabezeit/i.test(item.textContent || '')) return false
      const label = `${item.textContent || ''} ${item.getAttribute?.('aria-label') || ''}`
        .replace(/[„“”"']/g, ' ').replace(/\s+/g, ' ').trim()
      return REMOVE_TEXT.test(label)
    }) ?? null
  }

  /** Einmalig das Kontextmenü öffnen, den Entfernen-Punkt klicken und wieder schließen. */
  const removeViaMenu = async (item, button) => {
    if (button.dataset.busy) return
    button.dataset.busy = '1'
    button.setAttribute('aria-disabled', '1')
    const restore = () => { delete button.dataset.busy; button.removeAttribute('aria-disabled') }
    const menuButton = item.querySelector('ytd-menu-renderer yt-icon-button#button, ytd-menu-renderer yt-icon-button, #menu yt-icon-button, ytd-menu-renderer button')
    if (!menuButton) return restore()
    menuButton.click()
    try {
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 50))
        const remove = findRemoveItem()
        if (!remove) continue
        remove.click()
        log('Eintrag aus „Später ansehen“ entfernt')
        // Ohne Bestätigungsdialog bleibt das Menü offen: schließen, sonst blockiert es die Seite.
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }))
          document.body?.click?.()
        }, 150)
        return
      }
      log('Menüpunkt „Aus Später ansehen entfernen“ nicht gefunden')
    } finally { restore() }
  }

  const icon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h1v-8h-1zm3 0v8h1v-8h-1z')
    path.setAttribute('fill', 'currentColor')
    svg.append(path)
    return svg
  }

  const addButton = (item) => {
    const menu = item.querySelector('ytd-menu-renderer, #menu')
    if (!menu || menu.querySelector(`[${MARK}]`)) return false
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute(MARK, '1')
    button.className = 'vpc-remove'
    button.title = 'Aus „Später ansehen“ entfernen'
    button.setAttribute('aria-label', 'Aus „Später ansehen“ entfernen')
    button.append(icon())
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      removeViaMenu(item, button)
    }, true)
    // In die Menüleiste des Eintrags einhängen (vor den Drei-Punkte-Knopf).
    menu.insertBefore(button, menu.firstChild)
    return true
  }

  /**
   * „Alle abspielen“/„Zufallsmix“ aus der ausgeblendeten Playlist-Karte über die Liste
   * setzen. Der Knoten wird verschoben statt geklont: ein Klon verliert beim erneuten
   * Upgrade den gerenderten Button-Inhalt. Rendert YouTube die Karte neu, wird der neue
   * Menüknoten beim nächsten Tick wieder nach oben geholt.
   */
  const ensurePlayBar = () => {
    const primary = document.querySelector('ytd-two-column-browse-results-renderer #primary')
    if (!primary) return false
    const source = document.querySelector('ytd-playlist-header-renderer .play-menu.wide-screen-form')
      ?? document.querySelector('ytd-playlist-header-renderer .play-menu')
    if (!source) return false
    const href = source.querySelector('a[href]')?.getAttribute('href')
    if (!href) return false
    for (const bar of primary.querySelectorAll(`[${PLAY_BAR}]`)) bar.remove()
    source.classList.remove('wide-screen-form', 'small-screen-form')
    source.classList.add('vpc-play-bar')
    source.setAttribute(PLAY_BAR, href)
    primary.insertBefore(source, primary.firstChild ?? null)
    return true
  }

  const decorate = () => {
    let added = 0
    for (const item of document.querySelectorAll('ytd-playlist-video-renderer')) {
      // Eingehängte Buttons gehen beim Neu-Rendern verloren – deshalb ist addButton idempotent.
      if (addButton(item)) added++
    }
    ensurePlayBar()
    return added
  }

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.setAttribute('id', STYLE_ID) // style.id gibt es in älteren Browsern nicht immer
    style.textContent = CSS
    ;(document.head || document.documentElement).append(style)
  }

  const removeStyle = () => document.getElementById(STYLE_ID)?.remove()

  const applyLayout = () => {
    ensureStyle()
    const primary = document.querySelector('ytd-browse[page-subtype="playlist"] #primary')
    if (primary) primary.style.setProperty('max-width', 'none', 'important')
  }

  const tick = () => {
    timer = null
    if (!active()) return
    applyLayout()
    decorate()
  }

  // YouTube mutiert auf der Playlist dauerhaft (Lazy Loading, Hover-Vorschauen):
  // Meldungen bündeln, damit die Arbeit nicht pro Mutation läuft.
  const schedule = () => {
    if (timer || !active()) return
    timer = setTimeout(tick, 200)
  }

  const start = () => {
    if (running || !active()) return
    running = true
    if (!observer && typeof MutationObserver === 'function') observer = new MutationObserver(schedule)
    observer?.observe(document.documentElement, { childList: true, subtree: true })
    schedule()
  }

  /** Beim Abschalten die Wiedergabe-Leiste zurück in die Playlist-Karte hängen. */
  const restorePlayBar = () => {
    const bar = document.querySelector(`[${PLAY_BAR}]`)
    if (!bar) return
    bar.classList.remove('vpc-play-bar')
    bar.classList.add('wide-screen-form')
    bar.removeAttribute(PLAY_BAR)
    const wrapper = document.querySelector('ytd-playlist-header-renderer .metadata-wrapper')
      ?? document.querySelector('ytd-playlist-header-renderer')
    wrapper?.append(bar)
  }

  const stop = () => {
    running = false
    clearTimeout(timer)
    timer = null
    observer?.disconnect()
    restorePlayBar()
    removeStyle()
    for (const button of document.querySelectorAll(`[${MARK}]`)) button.remove()
    for (const bar of document.querySelectorAll(`[${PLAY_BAR}]`)) bar.remove()
  }

  /** Einmalige Direktprüfung ohne Warteschleife – auch für Tests nutzbar. */
  const run = (force) => {
    if (!force && !active()) return
    applyLayout()
    decorate()
    start()
  }

  const loadSetting = () => {
    try {
      chrome.storage.sync.get({ [KEY]: true }, (res) => {
        if (chrome.runtime.lastError) return log('Später-ansehen-Aufräumer: Einstellung nicht lesbar', chrome.runtime.lastError)
        enabled = res[KEY] !== false
        if (enabled) start()
        else stop()
      })
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' || changes[KEY] == null) return
        enabled = changes[KEY].newValue !== false
        if (enabled) start()
        else stop()
      })
      document.addEventListener('yt-navigate-finish', () => { enabled ? start() : stop() }, true)
    } catch (e) {
      log('Kein Zugriff auf chrome.storage – Später-ansehen-Aufräumer bleibt aktiv', e)
    }
  }

  loadSetting()

  return { run, tick, stop, removeViaMenu, findRemoveItem, isWatchLater, active }
})()

watchLater.run()
})()
