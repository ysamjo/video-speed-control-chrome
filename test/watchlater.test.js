// Später ansehen (youtube.com/playlist?list=WL): linke Spalte ausblenden, Liste breit,
// Papierkorb-Button pro Eintrag, der über YouTubes eigenes Menü entfernt.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { tick, suite } = require('./harness')

const code = fs.readFileSync(path.join(__dirname, '..', 'watch-later.js'), 'utf8')

/** Minimal-DOM mit Playlist-Einträgen und einem nachgebauten Drei-Punkte-Menü. */
function load({ list = 'WL', hostname = 'www.youtube.com', pathname = '/playlist', enabled = true,
  removeLabel = 'Aus "Später ansehen" entfernen', menuDelay = 0, items = 2 } = {}) {
  const listeners = new Map()
  const on = (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn) }
  const fire = (type) => { for (const fn of [...(listeners.get(type) ?? [])]) fn({ type }) }

  function el(localName, extra = {}) {
    const children = []
    const node = Object.assign({
      localName, children, dataset: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v } },
      attributes: {}, classList: { add() {} }, textContent: '',
      append(...nodes) { for (const n of nodes) { children.push(n); n.parent = node } },
      // setAttribute/append arbeiten auf live-Objekten; `attributes` bleibt trotzdem nutzbar.
      insertBefore(n) { children.unshift(n); n.parent = node; return n },
      remove() { const p = node.parent; if (p) { const i = p.children.indexOf(node); if (i >= 0) p.children.splice(i, 1) } node.removed = true },
      setAttribute(k, v) {
        node.attributes[k] = String(v)
        if (k === 'class') node.className = String(v)
        if (k === 'id') node.id = String(v)
      }, removeAttribute(k) { delete node.attributes[k] },
      getAttribute(k) { return node.attributes[k] ?? null },
      hasAttribute(k) { return k in node.attributes },
      addEventListener(type, fn) { (node.handlers ||= {}); (node.handlers[type] ||= []).push(fn) },
      click() { for (const fn of node.handlers?.click ?? []) fn({ type: 'click', preventDefault() {}, stopPropagation() {} }) },
      // Nur die im Code genutzten Selektoren: Menüleiste eines Listeneintrags.
      querySelector(selector) {
        if (selector === 'ytd-menu-renderer, #menu') return children.find(c => c.localName === 'ytd-menu-renderer') ?? null
        if (selector === '.vpc-remove') return children.find(c => c.className === 'vpc-remove') ?? null
        // Drei-Punkte-Menü: der echte YouTube-Knopf; sein Fehlen sperrt den Papierkorb nicht.
        if (selector.startsWith('ytd-menu-renderer')) {
          // Knopf liegt in der Menüleiste des Eintrags, nicht direkt darin.
          const menu = children.find(c => c.localName === 'ytd-menu-renderer')
          return menu?.children.find(c => c.localName === 'yt-icon-button') ?? null
        }
        return null
      },
    }, extra)
    return node
  }

  // Menü: Drei-Punkte-Knopf rendert den Entfernen-Eintrag verzögert ins Dokument.
  let openMenu = null
  let removed = 0
  let menuClicks = 0
  const menuItem = el('ytd-menu-service-item-renderer', { textContent: removeLabel, click() { removed++ } })
  // EIN Menüknopf für alle Einträge – der Erste, der klickt, öffnet das Menü.
  // Pro Eintrag ein eigener Menüknopf; welcher klickt, öffnet das (einzige) Menü.
  const makeMenuButton = () => el('yt-icon-button', {
    click() { menuClicks++; setTimeout(() => { openMenu = menuItem }, menuDelay) },
  })

  const makeItem = () => {
    const menu = el('ytd-menu-renderer')
    menu.append(makeMenuButton())
    const item = el('ytd-playlist-video-renderer', { textContent: 'Video' })
    item.append(menu)
    return item
  }
  const listItems = Array.from({ length: items }, makeItem)
  let removeQueries = 0


  const primary = el('div')
  const document = {
    documentElement: el('html'), head: el('head'),
    querySelector(selector) {
      if (selector === 'ytd-browse[page-subtype="playlist"] #primary') return primary
      if (selector === '.vpc-remove') return listItems.map(i => i.children[0].children[0]).find(n => n?.className === 'vpc-remove') ?? null
      return null
    },
    querySelectorAll(selector) {
      if (selector === 'ytd-playlist-video-renderer') return listItems
      if (selector.startsWith('ytd-menu-service-item-renderer')) return openMenu ? [openMenu] : []
      if (selector === '[data-vpc-remove]') {
        const found = listItems.flatMap(i => i.children[0].children).filter(n => n.attributes['data-vpc-remove'])
        removeQueries = found.length
        return found
      }
      return []
    },
    // Dokument-Getter: Styles landen per append im Kopf, id kommt über setAttribute.
    getElementById(id) {
      const all = [document.head, document.documentElement].flatMap(h => h.children)
      return all.find(c => c.localName === 'style' && (c.attributes.id === id || c.id === id)) ?? null
    },
    createElement(localName) { return el(localName) },
    createElementNS(ns, localName) { return el(localName) },
    addEventListener: on, dispatchEvent: fire,
    body: el('body'),
  }
  document.body.click = () => {}

  const location = { hostname, pathname, href: `https://${hostname}${pathname}?list=${list}` }
  const observers = []
  class MutationObserver {
    constructor(cb) { this.cb = cb }
    observe() { observers.push(this) }
    disconnect() { const i = observers.indexOf(this); if (i >= 0) observers.splice(i, 1) }
  }
  const storageListeners = []
  const storage = { watchLaterCleanup: enabled }

  vm.runInNewContext(code, {
    document, window: { addEventListener() {} }, location, MutationObserver, setTimeout, clearTimeout,
    console, URL, KeyboardEvent: class { constructor(type, init) { Object.assign(this, { type }, init) } },
    Date, Promise,
    chrome: {
      storage: {
        sync: { get: (defaults, cb) => cb({ ...defaults, ...storage }) },
        onChanged: { addListener: fn => storageListeners.push(fn) },
      },
      runtime: { lastError: null },
    },
  })

  return {
    document, primary, listItems, menuItem, storage,
    removed: () => removed,
    // stop() räumt über diese Selektor-Liste ab: Anzahl der gefundenen Buttons mitschreiben.
    removeButtonsCalled: () => removeQueries,
    menuClicks: () => menuClicks,
    buttons: () => listItems.map(i => i.children[0].children.find(n => n.className === 'vpc-remove')).filter(Boolean),
    styleInserted: () => !!document.getElementById('vpc-watch-later-style'),
    primaryWidth: () => primary.style.props['max-width'] ?? null,
    mutate: () => observers.forEach(o => o.cb([])),
    changeEnabled(value) { storage.watchLaterCleanup = value; storageListeners.forEach(fn => fn({ watchLaterCleanup: { newValue: value } }, 'sync')) },
  }
}

async function run() {
  const s = suite()

  {
    const env = load()
    await tick(300)
    s.check('Linke Playlist-Spalte wird ausgeblendet (CSS vorhanden)', env.styleInserted(), true)
    s.check('Liste nutzt die volle Breite', env.primaryWidth(), 'none')
    s.check('Jeder Eintrag bekommt einen Papierkorb', env.buttons().length, 2)
    s.check('Papierkorb hat zugängliche Beschriftung', env.buttons()[0].getAttribute('aria-label'), 'Aus „Später ansehen“ entfernen')
    await tick(300)
    env.mutate()
    await tick(300)
    s.check('Erneute Mutation erzeugt keine Doppel-Buttons', env.buttons().length, 2)
  }

  {
    // Menüpunkt erscheint verzögert – der Papierkorb muss darauf warten.
    const env = load({ menuDelay: 60 })
    await tick(300)
    const button = env.buttons()[0]
    button.click()
    s.check('Klick auf den Papierkorb öffnet das Menü des Eintrags', env.menuClicks(), 1)
    await tick(400)
    s.check('Entfernen-Punkt des Menüs wird ausgelöst', env.removed(), 1)
  }

  {
    // Unbekannte Beschriftung (andere Sprache): kein Klick, keine Sperre, kein Absturz.
    const env = load({ removeLabel: 'Etwas anderes' })
    await tick(300)
    env.buttons()[0].click()
    // Der Papierkorb sucht bis zu 30 × 50 ms nach dem Menüpunkt, bevor er aufgibt.
    await tick(1700)
    s.check('Ohne passenden Menüpunkt wird nichts geklickt', env.removed(), 0)
    // Zweiter Klick muss wieder arbeiten können (Sperre wurde aufgehoben).
    env.buttons()[0].click()
    await tick(200)
    s.check('Papierkorb bleibt nach erfolglosem Versuch benutzbar', env.menuClicks(), 2)
  }

  {
    const env = load({ list: 'PL12345' })
    await tick(300)
    s.check('Andere Wiedergabelisten bleiben unangetastet', env.buttons().length, 0)
    s.check('…und ihr Layout bleibt unverändert', env.styleInserted(), false)
  }

  {
    const env = load({ pathname: '/watch', list: 'WL' })
    await tick(300)
    s.check('Watch-Seite mit WL-Panel wird nicht umgebaut', env.buttons().length, 0)
  }

  {
    const env = load()
    await tick(300)
    env.changeEnabled(false)
    s.check('Abschalten entfernt den Style', env.styleInserted(), false)
    // stop() löscht alle vorhandenen Papierkörbe (hier je Eintrag einer).
    s.check('Abschalten entfernt die Papierkörbe', env.removeButtonsCalled() > 0, true)
    env.changeEnabled(true)
    await tick(300)
    s.check('Einschalten greift sofort', env.buttons().length, 2)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
