// Regression 2026-09-22: "s und d geht nicht mehr".
// Ursache: step() rechnete die Schrittweite ab der gerade LAUFENDEN Rate. Steht das Video
// fremdbestimmt auf 1.00× (Player-Reset, frisch geladen, laufender Toggle), landete ein
// Schritt bei 1.10 statt 1.90 – und überschrieb die gespeicherte Geschwindigkeit mit dem
// Fremdwert. Basis muss die gespeicherte Geschwindigkeit sein.
const { load, press, tick, suite } = require('./harness')

/** Video in den Zustand "läuft mit 1.00×, kein Enforce-Fenster mehr aktiv" bringen. */
async function parkAtOne(env) {
  env.advance(2000)
  env.video.playbackRate = 1
  await tick()
}

async function run() {
  const s = suite()

  {
    const env = load({ initial: 1.8 })
    await parkAtOne(env)
    press(env.winListeners, 'd'); await tick()
    s.check('"d" bei laufender 1.00× → 1.90', env.video.playbackRate, 1.9)
    s.check('Toast zeigt 1.90', env.toast(), '1.90')
  }

  {
    const env = load({ initial: 1.8 })
    await parkAtOne(env)
    press(env.winListeners, 's'); await tick()
    s.check('"s" bei laufender 1.00× → 1.70', env.video.playbackRate, 1.7)
  }

  // Die gespeicherte Geschwindigkeit darf nicht mit der laufenden Rate verfälscht werden.
  {
    const env = load({ initial: 1.8 })
    await parkAtOne(env)
    press(env.winListeners, 'd'); await tick()
    s.check('Gespeichert wird 1.90, nicht 1.10', env.savedSpeed(), 1.9)
  }

  // Schritt für Schritt ab der gespeicherten Rate, nicht ab der laufenden.
  {
    const env = load({ initial: 1.8 })
    await parkAtOne(env)
    press(env.winListeners, 'd'); await tick()
    press(env.winListeners, 'd'); await tick()
    s.check('Zwei Schritte ab 1.80 → 2.00', env.video.playbackRate, 2)
  }

  // Gegenprobe: Steht das Video schon auf der gespeicherten Rate, bleibt alles wie gewohnt.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'd'); await tick()
    s.check('Ohne Fremdeinfluss: 1.80 → 1.90', env.video.playbackRate, 1.9)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0))
module.exports = { run }
