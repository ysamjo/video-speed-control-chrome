// Regression 2026-09-22: "R geht immer noch nicht".
// Der Toggle entschied die Richtung gegen die GESPEICHERTE Rate:
//   |rate - stored| < 0.01 ? 1 : stored
// Steht die laufende Rate weder auf 1.00× noch exakt auf der gespeicherten Geschwindigkeit,
// schaltet "r" auf die GESPEICHERTE Rate – statt auf 1.00×. Drückt man "r", um auf 1.00× zu
// kommen, passiert gefühlt nichts (oder das Video wird sogar schneller).
const { load, press, tick, suite } = require('./harness')

/** Video auf eine beliebige Rate bringen, ohne dass das Enforce-Fenster dazwischenfunkt. */
async function parkAt(env, rate) {
  env.advance(2000)
  env.video.playbackRate = rate
  await tick()
}

async function run() {
  const s = suite()

  // Erwartung: "r" schaltet auf 1.00×, außer wir stehen schon dort – dann zurück auf gespeichert.

  // 1. Der Normalfall: Video läuft auf der gespeicherten Rate.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    s.check('1.80 → 1.00', env.video.playbackRate, 1)
    press(env.winListeners, 'r'); await tick()
    s.check('1.00 → 1.80', env.video.playbackRate, 1.8)
  }

  // 2. Gespeicherte Geschwindigkeit ist verstellt (z. B. durch den früheren Bug),
  //    Video läuft aber auf 1.80: "r" muss trotzdem auf 1.00× führen.
  {
    const env = load({ initial: 1.8 })
    env.advance(2000)
    press(env.winListeners, 's'); await tick()   // speichert 1.70
    press(env.winListeners, 's'); await tick()   // speichert 1.60
    env.advance(2000)
    env.video.playbackRate = 1.8                 // Player steht wieder auf 1.80
    await tick()
    press(env.winListeners, 'r'); await tick()
    s.check('Gespeichert 1.60, laufend 1.80 → "r" ergibt 1.00', env.video.playbackRate, 1)
  }

  // 3. Die laufende Rate ist weder 1.00 noch die gespeicherte (Player-Eigenwert).
  {
    const env = load({ initial: 1.8 })
    await parkAt(env, 1.5)
    press(env.winListeners, 'r'); await tick()
    s.check('Laufend 1.50, gespeichert 1.80 → "r" ergibt 1.00', env.video.playbackRate, 1)
    s.check('Toast zeigt 1.00', env.toast(), '1.00')
  }

  // 4. Aus 1.00× heraus muss "r" die gespeicherte Rate wiederherstellen.
  {
    const env = load({ initial: 1.8 })
    await parkAt(env, 1)
    press(env.winListeners, 'r'); await tick()
    s.check('Laufend 1.00 → "r" ergibt 1.80', env.video.playbackRate, 1.8)
  }

  // 5. Der Toggle darf die gespeicherte Geschwindigkeit nie verändern.
  {
    const env = load({ initial: 1.8 })
    await parkAt(env, 1.5)
    press(env.winListeners, 'r'); await tick()
    s.check('Gespeicherte Geschwindigkeit bleibt 1.80', env.savedSpeed(), 1.8)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0))
module.exports = { run }
