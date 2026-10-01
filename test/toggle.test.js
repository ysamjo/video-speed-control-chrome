// Regression 2026-09-22: Der Toggle zeigte 1,00× im Toast, während das Video weiter
// mit der gespeicherten Rate lief. Ursache: restore() prüfte gegen die GESPEICHERTE
// Geschwindigkeit und machte damit den eigenen Toggle sofort rückgängig.
const { load, press, tick, suite } = require('./harness')

async function run() {
  const s = suite()

  // Kern der Meldung: Toast und tatsächliche Rate müssen übereinstimmen.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r')
    s.check('Toast nach "r"', env.toast(), '1.00')
    await tick()
    s.check('Tatsächliche Rate nach "r"', env.video.playbackRate, 1)
    s.check('Toast == tatsächliche Rate', env.toast(), env.video.playbackRate.toFixed(2))
  }

  // Zurückschalten auf die gespeicherte Rate.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    press(env.winListeners, 'r'); await tick()
    s.check('Zweites "r" schaltet zurück auf 1.80', env.video.playbackRate, 1.8)
  }

  // Der Toggle darf die gespeicherte Geschwindigkeit nicht überschreiben.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    s.check('Toggle lässt die gespeicherte Geschwindigkeit bei 1.80', env.savedSpeed(), 1.8)
  }

  // Player setzt die Rate eigenmächtig zurück: im Enforce-Fenster muss die
  // GEWÜNSCHTE Rate (1.00) verteidigt werden, nicht die gespeicherte (1.80).
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    env.video.playbackRate = 1.8
    await tick()
    s.check('Player-Override wird mit der gewünschten Rate bekämpft', env.video.playbackRate, 1)
  }

  // Nach Ablauf des Enforce-Fensters (1,5 s) kein Eingriff mehr.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    env.advance(2000)
    env.video.playbackRate = 3
    await tick()
    s.check('Nach 1,5 s kein Zurücksetzen mehr', env.video.playbackRate, 3)
  }

  // Schrittweite ab der gespeicherten Rate – auch nach einem Toggle.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'r'); await tick()
    press(env.winListeners, 'd'); await tick()
    s.check('"d" nach Toggle → 1.90', env.video.playbackRate, 1.9)
  }

  // Ohne Toggle das dokumentierte Verhalten.
  {
    const env = load({ initial: 1.8 })
    press(env.winListeners, 'd'); await tick()
    s.check('"d" bei 1.80 → 1.90', env.video.playbackRate, 1.9)
    press(env.winListeners, 'd'); await tick()
    s.check('"d" bei 1.90 → 2.00', env.video.playbackRate, 2)
    press(env.winListeners, 's'); await tick()
    s.check('"s" bei 2.00 → 1.90', env.video.playbackRate, 1.9)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0))
module.exports = { run }
