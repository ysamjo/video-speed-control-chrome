// Regression 2026-09-22: Hotkeys schluckten Tastendrücke in Eingabefeldern.
// „r" ließ sich auf keiner Seite mehr tippen, weil onKey für jede Hotkey-Taste
// unbedingt preventDefault() rief – ohne Rücksicht auf das fokussierte Element.
const { load, makeEl, press, suite } = require('./harness')

async function run() {
  const s = suite()
  const body = () => [makeEl({ localName: 'body' }), makeEl({ localName: 'html' })]
  const onVideoPage = () => load()

  // Hotkey muss weiter funktionieren, wenn niemand tippt.
  {
    const env = onVideoPage()
    const e = press(env.winListeners, 'r')
    s.check('Video-Seite, kein Eingabefeld: Taste wird abgefangen', e.defaultPrevented === true, true)
    s.check('Video-Seite: "r" schaltet auf 1.00x um', env.video.playbackRate, 1)
  }

  // Eingabefelder: Taste muss durchgehen, Rate unverändert.
  for (const tag of ['input', 'textarea', 'select']) {
    const env = onVideoPage()
    const e = press(env.winListeners, 'r', { path: [makeEl({ localName: tag }), ...body()] })
    s.check(`<${tag}>: Taste wird durchgelassen`, e.defaultPrevented === true, false)
    s.check(`<${tag}>: Rate bleibt unverändert`, env.video.playbackRate, 1.8)
  }

  // contenteditable, auch wenn das Ziel ein Kindknoten ist.
  {
    const env = onVideoPage()
    const editable = makeEl({ isContentEditable: true })
    const e = press(env.winListeners, 'r', { path: [makeEl(), makeEl(), editable, ...body()] })
    s.check('contenteditable (Kindknoten): durchgelassen', e.defaultPrevented === true, false)
    s.check('contenteditable: Rate bleibt unverändert', env.video.playbackRate, 1.8)
  }

  // Eingabefeld im Shadow DOM: der Treffer im composedPath ist der Host.
  {
    const env = onVideoPage()
    const shadowRoot = { localName: undefined, nodeType: 11 }
    const host = makeEl({ isContentEditable: true })
    const e = press(env.winListeners, 'r', { path: [makeEl(), shadowRoot, host, ...body()] })
    s.check('Shadow-DOM-contenteditable: durchgelassen', e.defaultPrevented === true, false)
  }

  // Ohne Video auf der Seite sind wir komplett transparent.
  {
    const env = load({ withVideo: false })
    s.check('Seite ohne Video: "r" wird durchgelassen', press(env.winListeners, 'r').defaultPrevented === true, false)
    s.check('Seite ohne Video: "s" wird durchgelassen', press(env.winListeners, 's').defaultPrevented === true, false)
    s.check('Seite ohne Video: "d" wird durchgelassen', press(env.winListeners, 'd').defaultPrevented === true, false)
  }

  // Unbelegte Tasten und Modifier-Kombinationen bleiben unberührt.
  {
    const env = onVideoPage()
    s.check('Unbelegte Taste "q": durchgelassen', press(env.winListeners, 'q').defaultPrevented === true, false)
    s.check('Strg+R: nicht abgefangen', press(env.winListeners, 'r', { ctrlKey: true }).defaultPrevented === true, false)
    s.check('Shift+R: nicht abgefangen', press(env.winListeners, 'r', { shiftKey: true }).defaultPrevented === true, false)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0))
module.exports = { run }
