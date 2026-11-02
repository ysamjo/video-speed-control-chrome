// Schrittweite bleibt unabhängig von automatischen Player-Resets und R.
// Manuelle Änderungen gelten nur für das aktuelle Video; Vorgaben bleiben unverändert.
const { load, press, tick, suite } = require('./harness')
async function run() {
  const s = suite()
  {
    const env = load()
    env.video.playbackRate = 1 // Player-Reset direkt vor dem Hotkey
    press(env.winListeners, 'd'); await tick()
    s.check('D ignoriert automatischen Player-Reset', env.video.playbackRate, 1.9)
    s.check('Toast zeigt die tatsächliche Auswahl', env.toast(), '1.90')
    s.check('Standardtempo bleibt 1,8×', env.savedSpeed(), 1.8)
  }
  {
    const env = load()
    press(env.winListeners, 'r'); await tick()
    press(env.winListeners, 's'); await tick()
    s.check('S nach R rechnet ab der bisherigen Auswahl', env.video.playbackRate, 1.7)
  }
  {
    const env = load()
    env.playerSelect(1.25); await tick()
    press(env.winListeners, 'd'); await tick()
    s.check('D rechnet ab der nativen manuellen Auswahl', env.video.playbackRate, 1.35)
  }
  {
    const env = load()
    press(env.winListeners, 'd'); await tick()
    press(env.winListeners, 'd'); await tick()
    s.check('Zwei Schritte ab 1,8× ergeben 2,0×', env.video.playbackRate, 2)
    s.check('Hotkeys schreiben keine Vorgaben in Storage', env.saved.length, 0)
    env.navigate('/next-video')
    env.media('loadedmetadata')
    s.check('Neues Video nutzt wieder 1,8×', env.video.playbackRate, 1.8)
  }
  return s.report()
}
module.exports = { run }
