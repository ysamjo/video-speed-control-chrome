// YouTubes Hinweis „Kommt es zu Unterbrechungen?“ erscheint als Toast und bleibt sonst stehen.
const { tick, makeEl, load, suite } = require('./harness')

const toast = text => makeEl({ localName: 'tp-yt-paper-toast', textContent: text })
const hidden = node => node.style.props.display === 'none'

async function run() {
  const s = suite()

  {
    const hint = toast('Kommt es zu Unterbrechungen?')
    const other = toast('Video zu „Später ansehen“ hinzugefügt')
    const env = load({ hostname: 'www.youtube.com', pathname: '/watch', toasts: [hint, other] })
    await tick(400)
    s.check('Hinweis-Toast wird ausgeblendet', hidden(hint), true)
    s.check('Andere Toasts bleiben sichtbar', hidden(other), false)
    env.document.dispatchEvent({ type: 'yt-navigate-finish' })
  }

  {
    // Englische Oberfläche: derselbe Toast, andere Beschriftung.
    const hint = toast('Experiencing interruptions?')
    load({ hostname: 'www.youtube.com', pathname: '/watch', toasts: [hint] })
    await tick(400)
    s.check('Englischer Hinweis wird ausgeblendet', hidden(hint), true)
  }

  {
    // Außerhalb von YouTube bleibt fremdes DOM unangetastet.
    const hint = toast('Kommt es zu Unterbrechungen?')
    load({ hostname: 'example.com', toasts: [hint] })
    await tick(400)
    s.check('Auf fremden Seiten wird nichts ausgeblendet', hidden(hint), false)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
