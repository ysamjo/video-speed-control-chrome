// Tastenschritte (S/D) merken das Tempo dauerhaft als neues Standardtempo.
// R auf 1,00×, Kanalvorgaben und automatische Media-Events schreiben nichts.
const { load, press, tick, suite } = require('./harness')
const SAVE_WAIT = 600 // SAVE_DELAY_MS in content.js ist 500
const YT = { hostname: 'www.youtube.com', pathname: '/watch?v=first', channel: '@sportstudio', cinema: false }
async function run() {
  const s = suite()
  {
    const env = load()
    press(env.winListeners, 'd')
    await tick(SAVE_WAIT)
    s.check('D speichert 1,90 als Standardtempo', env.savedSpeed(), 1.9)
    s.check('Genau ein Schreibvorgang', env.saved.length, 1)
    s.check('Nur das Tempo wird geschrieben', Object.keys(env.saved[0]).join(','), 'playbackSpeed')
    s.check('Video läuft weiter mit 1,90', env.video.playbackRate, 1.9)
  }
  {
    const env = load()
    press(env.winListeners, 'd'); await tick()
    press(env.winListeners, 'd'); await tick()
    press(env.winListeners, 'd'); await tick(SAVE_WAIT)
    s.check('Schnelle Folge schreibt nur einmal', env.saved.length, 1)
    s.check('Gespeichert wird der letzte Wert 2,10', env.savedSpeed(), 2.1)
  }
  {
    const env = load()
    press(env.winListeners, 'd'); await tick()
    press(env.winListeners, 's'); await tick(SAVE_WAIT)
    s.check('Rückkehr zum Ausgangswert schreibt nichts', env.saved.length, 0)
    s.check('Standardtempo bleibt 1,80', env.savedSpeed(), 1.8)
  }
  {
    const env = load()
    press(env.winListeners, 'r')
    await tick(SAVE_WAIT)
    s.check('R auf 1,00× speichert nichts', env.saved.length, 0)
    press(env.winListeners, 'r')
    await tick(SAVE_WAIT)
    s.check('R zurück auf 1,80 speichert nichts', env.saved.length, 0)
  }
  {
    const env = load()
    press(env.winListeners, 'd'); await tick(SAVE_WAIT)
    // Chrome meldet die eigene Speicherung über onChanged zurück.
    env.changeStoredSpeed(1.9)
    s.check('Eigene Speicherung kassiert die Auswahl nicht', env.video.playbackRate, 1.9)
    env.navigate('/next-video')
    env.media('loadedmetadata')
    s.check('Nächstes Video startet mit dem neuen Standardtempo', env.video.playbackRate, 1.9)
  }
  {
    const env = load(YT)
    press(env.winListeners, 'd'); await tick(SAVE_WAIT)
    s.check('Kanalvideo: Standardtempo wird mitgespeichert', env.savedSpeed(), 1.1)
    env.changeStoredSpeed(1.1)
    s.check('Kanalvideo behält die manuelle Auswahl', env.video.playbackRate, 1.1)
    env.navigate('/watch?v=next')
    env.media('loadedmetadata')
    s.check('Kanalregel hat weiterhin Vorrang', env.video.playbackRate, 1)
  }
  {
    const env = load()
    env.changeStoredSpeed(2.5)
    s.check('Externe Änderung (Einstellungen) gilt sofort', env.video.playbackRate, 2.5)
  }
  {
    const env = load({ deferSettings: true, storedSpeed: 2.2 })
    press(env.winListeners, 'd')
    await tick(SAVE_WAIT)
    s.check('Ohne geladene Einstellungen wird nichts gespeichert', env.saved.length, 0)
  }
  return s.report()
}
module.exports = { run }
