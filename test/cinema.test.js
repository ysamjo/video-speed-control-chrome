// Kino-Modus (YouTube-Theatermodus): muss IMMER gesetzt werden – beim Laden, nach
// SPA-Navigation und wenn die Seite (oder der Nutzer) den Modus wieder ausschaltet.
const { load, tick, suite } = require('./harness')

const YT = { hostname: 'www.youtube.com', pathname: '/watch' }
// content.js bündelt Mutationen über 250 ms – Tests warten entsprechend lang.
const flush = () => tick(300)

async function run() {
  const s = suite()

  {
    const env = load({ ...YT })
    await flush()
    s.check('Theatermodus wird beim Laden eingeschaltet', env.theaterClicks(), 1)
    s.check('Player steht danach im Kino-Modus', env.theaterOn(), true)
    await flush()
    s.check('Kein zweiter Klick, solange der Modus aktiv ist', env.theaterClicks(), 1)
  }

  {
    const env = load({ ...YT, theater: true })
    await flush()
    s.check('Bereits aktiver Kino-Modus bleibt unangetastet', env.theaterClicks(), 0)
  }

  {
    const env = load()
    await flush()
    s.check('Außerhalb von YouTube kein Eingriff', env.theaterClicks(), 0)
  }

  {
    const env = load({ ...YT, pathname: '/' })
    await flush()
    s.check('Außerhalb von Watch-/Live-Seiten kein Eingriff', env.theaterClicks(), 0)
  }

  {
    const env = load({ ...YT, cinema: false })
    await flush()
    s.check('Abgeschaltete Einstellung wird respektiert', env.theaterClicks(), 0)
    env.changeCinema(true)
    await flush()
    s.check('Einschalten der Einstellung greift sofort', env.theaterClicks(), 1)
  }

  {
    const env = load({ ...YT, theater: true })
    await flush()
    env.setTheater(false) // Nutzer drückt „t“ / Player setzt zurück
    env.mutate()
    await flush()
    s.check('Manuell ausgeschalteter Kino-Modus wird gesetzt', env.theaterClicks(), 1)
    s.check('…und ist wieder aktiv', env.theaterOn(), true)
  }

  {
    const env = load({ ...YT, theater: true })
    await flush()
    env.setTheater(false)
    env.document.dispatchEvent({ type: 'yt-navigate-finish' })
    await flush()
    s.check('Nach YouTube-Navigation wird der Kino-Modus gesetzt', env.theaterClicks(), 1)
  }

  {
    // YouTube wendet den Klick verzögert an: innerhalb der Schutzfrist darf nicht
    // gegengetoggelt werden, danach wird erneut versucht.
    const env = load({ ...YT, applyTheaterOnClick: false })
    await flush()
    s.check('Erster Versuch klickt den Theatermodus an', env.theaterClicks(), 1)
    env.mutate()
    await flush()
    s.check('Kein Ping-Pong innerhalb der Schutzfrist', env.theaterClicks(), 1)
    env.advance(1000)
    env.mutate()
    await flush()
    s.check('Nach der Schutzfrist wird erneut versucht', env.theaterClicks(), 2)
  }

  {
    // Ohne Player-Controls (noch nicht gerendert) darf nichts passieren.
    const env = load({ ...YT, theaterButton: false })
    await flush()
    s.check('Ohne Theater-Button wird nicht geraten', env.theaterClicks(), 0)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
