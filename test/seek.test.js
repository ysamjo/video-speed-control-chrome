// Skip-Regression: nicht nur die Taste, sondern auch den Medien-Lebenszyklus ausführen.
const { load, makeVideo, press, tick, suite } = require('./harness')

async function run() {
  const s = suite()

  for (const type of ['play', 'playing', 'seeking', 'seeked', 'loadedmetadata']) {
    const env = load()
    press(env.winListeners, 'r')
    await tick()
    env.advance(5000)
    env.video.playbackRate = 1.8
    await tick()
    env.media(type)
    await tick()
    s.check(`R bleibt bei 1.00 nach ${type}`, env.video.playbackRate, 1)
    s.check(`${type} überschreibt den Speicher nicht`, env.savedSpeed(), 1.8)
  }

  // Ein Player kann erst NACH unserem Event-Handler asynchron auf 1x zurücksetzen.
  for (const type of ['seeking', 'seeked', 'playing']) {
    const env = load()
    press(env.winListeners, 'd')
    await tick()
    env.advance(5000)
    env.media(type)
    env.advance(200)
    env.video.defaultPlaybackRate = env.video.playbackRate = 1
    await tick()
    s.check(`${type}: verzögerter Player-Reset wird abgefangen`, env.video.playbackRate, 1.9)
    s.check(`${type}: Default-Rate bleibt ebenfalls 1.90`, env.video.defaultPlaybackRate, 1.9)
  }

  {
    const env = load()
    press(env.winListeners, 'r')
    await tick()
    for (let i = 0; i < 3; i++) {
      env.advance(5000)
      env.media('seeking')
      env.video.playbackRate = 1.8
      env.advance(2500) // langer Seek: Schutz am Seek-Ende erneut aktivieren
      env.media('seeked')
      env.media('playing')
      env.video.playbackRate = 1.8
      await tick()
      s.check(`Wiederholter Skip ${i + 1} bleibt bei 1.00`, env.video.playbackRate, 1)
    }
    press(env.winListeners, 'r')
    await tick()
    s.check('R schaltet nach Skips wieder auf 1.80', env.video.playbackRate, 1.8)
  }

  {
    const env = load()
    press(env.winListeners, 'd')
    await tick()
    env.advance(5000)
    env.media('seeking', env.video, { shadow: true })
    env.video.playbackRate = 1
    env.media('seeked', env.video, { shadow: true })
    await tick()
    s.check('Nicht-composed Seek am beobachteten Shadow-Video', env.video.playbackRate, 1.9)
  }

  {
    const env = load()
    press(env.winListeners, 'r')
    await tick()
    const other = makeVideo(1)
    env.media('play', other)
    await tick()
    env.video.playbackRate = 1.8
    await tick()
    s.check('Zweites Video startet mit gespeicherter Rate', other.playbackRate, 1.8)
    s.check('Zweites Video überschreibt nicht das Ziel des ersten', env.video.playbackRate, 1)
    env.media('playing', env.video)
    press(env.winListeners, 'r')
    await tick()
    s.check('Hotkey steuert nach Resume wieder das aktive Video', env.video.playbackRate, 1.8)
  }

  {
    const env = load()
    s.check('Initialisieren schreibt nicht in Sync-Storage', env.saved.length, 0)
    env.media('play')
    env.media('seeking')
    env.media('seeked')
    env.media('playing')
    s.check('Skip/Resume schreibt nicht in Sync-Storage', env.saved.length, 0)
    press(env.winListeners, 's')
    await tick()
    s.check('S speichert weiterhin die gewählte Rate', env.savedSpeed(), 1.7)
  }

  {
    const env = load({ deferSettings: true, storedSpeed: 2.2, initial: 1 })
    env.media('play')
    s.check('Vor Laden der Einstellungen keine Default-Rate aufprägen', env.video.playbackRate, 1)
    s.check('Vor Laden der Einstellungen nichts speichern', env.saved.length, 0)
    env.finishSettings()
    await tick()
    s.check('Gespeicherte Rate nach verzögertem Laden anwenden', env.video.playbackRate, 2.2)
  }

  {
    const env = load()
    press(env.winListeners, 'd')
    await tick()
    env.advance(5000)
    env.media('seeked')
    for (let i = 0; i < 10; i++) {
      env.video.playbackRate = 1
      await tick()
    }
    env.video.playbackRate = 1
    await tick()
    s.check('Sicherheitsgrenze: kein unbegrenzter Kampf mit dem Player', env.video.playbackRate, 1)
    env.media('seeked')
    await tick()
    s.check('Ein neuer Skip aktiviert den begrenzten Schutz erneut', env.video.playbackRate, 1.9)
    env.advance(2000)
    env.video.playbackRate = 2.5
    await tick()
    s.check('Nach Schutzfenster bleiben externe Änderungen möglich', env.video.playbackRate, 2.5)
  }

  return s.report()
}

if (require.main === module) run().then(f => process.exit(f ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { run }
