const { load, suite } = require('./harness')

const YT = { hostname: 'www.youtube.com', pathname: '/' }

async function run() {
  const s = suite()

  {
    const env = load({ ...YT })
    s.check('YouTube setzt die native Dunkelvorgabe', env.pref(), 'f6=400')
    s.check('YouTube aktiviert das native dunkle Design', env.root.hasAttribute('dark'), true)
  }

  {
    const env = load({ ...YT, initialPref: 'f4=4000000&tz=Europe.Berlin&f5=30000&f7=100' })
    s.check('Vorhandene YouTube-Vorgaben bleiben erhalten', env.pref(), 'f4=4000000&tz=Europe.Berlin&f5=30000&f7=100&f6=400')
  }

  {
    const env = load({ hostname: 'example.com', initialPref: 'f6=100' })
    s.check('Außerhalb von YouTube bleibt die Vorgabe unverändert', env.pref(), 'f6=100')
    s.check('Außerhalb von YouTube wird kein dunkles Design erzwungen', env.root.hasAttribute('dark'), false)
  }

  {
    const env = load({ ...YT })
    env.root.removeAttribute('dark')
    env.document.dispatchEvent({ type: 'yt-navigate-finish' })
    s.check('Nach SPA-Navigation bleibt YouTube dunkel', env.root.hasAttribute('dark'), true)
  }

  {
    const env = load({ ...YT, deferRoot: true })
    env.attachRoot()
    s.check('Dunkelansicht greift auch bei spät verfügbarem Dokument-Element', env.root.hasAttribute('dark'), true)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
