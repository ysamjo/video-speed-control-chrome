const { load, makeVideo, makeEl, press, tick, suite } = require('./harness')
const YT = { hostname: 'www.youtube.com', pathname: '/watch?v=first', channel: '@sportstudio', cinema: false }
async function run() {
  const s = suite()
  for (const options of [YT, { hostname: 'www.youtubekids.com', pathname: '/watch?v=first' }, {}]) {
    const env = load(options)
    const preset = env.video.playbackRate
    press(env.winListeners, 'd'); await tick()
    s.check(`${options.hostname || 'global'}: Hotkey ab Vorgabe`, env.video.playbackRate, Math.round((preset + 0.1) * 100) / 100)
    for (const event of ['play', 'seeking', 'seeked', 'playing']) {
      env.media(event)
      env.video.playbackRate = 3 // automatischer Player-Reset während Resume/Seek
      await tick()
      s.check(`${options.hostname || 'global'}: Auswahl bleibt bei ${event}`, env.video.playbackRate, Math.round((preset + 0.1) * 100) / 100)
    }
    env.playerSelect(1.5); await tick()
    s.check(`${options.hostname || 'global'}: Native Auswahl innerhalb der Schutzfrist`, env.video.playbackRate, 1.5)
    env.mutate(); await tick(150)
    s.check(`${options.hostname || 'global'}: DOM-Änderung behält manuelle Auswahl`, env.video.playbackRate, 1.5)
    env.media('seeked')
    s.check(`${options.hostname || 'global'}: Native Auswahl bleibt beim Spulen`, env.video.playbackRate, 1.5)
    env.navigate('/watch?v=next')
    env.media('loadedmetadata')
    s.check(`${options.hostname || 'global'}: Wiederverwendeter Player mit neuer Video-ID`, env.video.playbackRate, preset)
    s.check(`${options.hostname || 'global'}: Keine gespeicherte Vorgabe geändert`, env.saved.length, 0)
  }
  {
    const env = load(YT)
    env.playerSelect(1.25); await tick()
    const next = makeVideo(3)
    env.media('play', next)
    s.check('Auswahl wird nicht auf neues Element übertragen', next.playbackRate, 1)
    env.media('play', env.video)
    s.check('Erstes Video behält eigene Auswahl', env.video.playbackRate, 1.25)
  }
  {
    const env = load({ ...YT, channel: null })
    press(env.winListeners, 'd'); await tick()
    env.setChannel('@sportstudio'); env.mutate(); await tick(150)
    s.check('Spät gerenderter Owner überschreibt manuelle Auswahl nicht', env.video.playbackRate, 1.9)
    env.navigate('/watch?v=second')
    s.check('Nächstes Video nutzt die inzwischen erkannte Kanalregel', env.video.playbackRate, 1)
  }
  {
    const env = load({ hostname: 'www.youtubekids.com' })
    env.video.currentSrc = 'blob:video-one'
    env.media('loadedmetadata')
    env.playerSelect(1.75); await tick()
    env.video.currentSrc = 'blob:video-two'
    env.media('loadedmetadata')
    s.check('Neue Medienquelle ohne Navigation setzt Kids-Tempo zurück', env.video.playbackRate, 1)
  }
  {
    const env = load(YT)
    press(env.winListeners, 'd'); await tick()
    env.navigate('/watch?v=first&t=30&list=abc')
    s.check('Zeitstempel und Playlist sind kein neues Video', env.video.playbackRate, 1.1)
    env.changeRules([{ type: 'channel', pattern: '@sportstudio', speed: 1 }, { type: 'channel', pattern: '@other', speed: 2 }])
    s.check('Änderung eines anderen Kanals behält manuelles Tempo', env.video.playbackRate, 1.1)
    env.changeStoredSpeed(2.5)
    s.check('Globale Änderung behält manuelles Kanaltempo', env.video.playbackRate, 1.1)
    env.changeRules([{ type: 'channel', pattern: '@sportstudio', speed: 1.25 }])
    s.check('Explizit bearbeitete Vorgabe gilt weiterhin live', env.video.playbackRate, 1.25)
  }
  for (const controlName of ['Seek slider', 'Volume', '1080p']) {
    const env = load(YT)
    press(env.winListeners, 'd'); await tick()
    env.advance(5000)
    const control = makeEl({ textContent: controlName, getAttribute: key => key === 'role' ? (controlName === '1080p' ? 'menuitemradio' : 'slider') : controlName,
      matches: selector => selector.includes('[role="slider"]') || selector.includes('[role="menuitemradio"]') })
    for (const listener of env.winListeners.pointerdown) listener({ type: 'pointerdown', isTrusted: true, target: control, composedPath: () => [control] })
    env.video.playbackRate = 1
    await tick() // Reset kommt vor seeking/playing: echte Browser-Eventreihenfolge abdecken.
    s.check(`${controlName}: Automatischer Reset ist keine Tempowahl`, env.video.playbackRate, 1.1)
    env.media('seeking')
    s.check(`${controlName}: Auswahl bleibt nach Medienevent`, env.video.playbackRate, 1.1)
  }
  for (const className of ['ytp-speedslider', 'ytp-variable-speed-panel-button']) {
    const env = load(YT)
    const control = makeEl({ matches: selector => selector.includes(`.${className}`) })
    for (const listener of env.winListeners.click) listener({ type: 'click', isTrusted: true, target: control, composedPath: () => [control] })
    env.video.playbackRate = 1.5
    await tick()
    s.check(`${className}: Aktueller YouTube-Speed-Dialog funktioniert sofort`, env.video.playbackRate, 1.5)
  }
  {
    const env = load(YT)
    env.playerSelect(1.5); await tick()
    env.navigate('/watch?v=next')
    env.advance(5000)
    env.video.playbackRate = 1.5 // YouTube stellt seine intern gespeicherte Rate spät wieder her.
    await tick()
    s.check('Später YouTube-Reset nach Videowechsel überschreibt Vorgabe nicht', env.video.playbackRate, 1)
    env.playerSelect(1.25); await tick()
    s.check('Explizite native Auswahl bleibt trotzdem möglich', env.video.playbackRate, 1.25)
  }
  {
    const env = load({ ...YT, channel: null, collab: true, ownerVideoId: 'first', metadata: async () => ({ author_url: 'https://www.youtube.com/@sportstudio', author_name: 'sportstudio' }) })
    await tick()
    s.check('Gemeinsamer Upload ohne Owner-Link erkennt Hauptkanal', env.video.playbackRate, 1)
    env.mutate(); await tick(150)
    s.check('Kanal-Fallback fragt pro Video nur einmal an', env.requests.length, 1)
  }
  {
    let finishFirst
    const env = load({ ...YT, channel: null, collab: true, ownerVideoId: 'first', metadata: id => id === 'first'
      ? new Promise(resolve => { finishFirst = resolve }) : { author_url: 'https://www.youtube.com/@other' } })
    env.setChannel(null, '', 'second'); env.navigate('/watch?v=second')
    await tick()
    finishFirst({ author_url: 'https://www.youtube.com/@sportstudio' })
    await tick()
    s.check('Verspätete Kanalantwort gilt nicht für anderes Video', env.video.playbackRate, 1.8)
    s.check('Anfragen werden nach Video-ID getrennt', env.requests.length, 2)
  }
  return s.report()
}
module.exports = { run }
