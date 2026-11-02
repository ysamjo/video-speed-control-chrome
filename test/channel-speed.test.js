const { load, press, tick, suite } = require('./harness')
const YT = { hostname: 'www.youtube.com', pathname: '/watch?v=one', channel: '@sportstudio', cinema: false }
async function run() {
  const s = suite()
  {
    const env = load(YT)
    s.check('sportstudio auf Watch-URL startet mit 1,0×', env.video.playbackRate, 1)
    env.advance(5000)
    env.video.playbackRate = 2
    await tick()
    s.check('Kanalregel bleibt nach Schutzfenster fest', env.video.playbackRate, 1)
    for (const key of ['d', 's', 'r']) {
      press(env.winListeners, key)
      await tick()
      s.check(`${key} überschreibt feste Kanalregel nicht`, env.video.playbackRate, 1)
    }
    s.check('Kanalregel verändert globales Tempo nicht', env.savedSpeed(), 1.8)
    s.check('Kanal-Hotkeys schreiben nichts zurück', env.saved.length, 0)
    env.changeStoredSpeed(2.2)
    s.check('Globale Änderung überschreibt Kanalregel nicht', env.video.playbackRate, 1)
  }
  {
    const env = load({ ...YT, channel: null })
    env.setChannel('@sportstudio')
    env.mutate()
    await tick(150)
    s.check('Verzögert gerenderter Kanal wird erkannt', env.video.playbackRate, 1)
    env.setChannel('@another')
    env.navigate('/watch?v=two')
    s.check('Wiederverwendeter Player wechselt zurück zum Standard', env.video.playbackRate, 1.8)
    env.setChannel('@sportstudio')
    env.navigate('/watch?v=three')
    s.check('Zurück zum festen Kanal ohne Neuladen', env.video.playbackRate, 1)
  }
  {
    const env = load(YT)
    env.navigate('/watch?v=two&list=sportstudio')
    env.setChannel('@other', '', 'two')
    env.mutate()
    await tick(150)
    s.check('sportstudio im URL-Parameter trifft nicht als Kanal', env.video.playbackRate, 1.8)
  }
  {
    const env = load({ ...YT, ownerVideoId: 'old' })
    s.check('Veralteter Owner des vorherigen Videos wird ignoriert', env.video.playbackRate, 1.8)
    env.setChannel('@sportstudio', '', 'one')
    env.mutate()
    await tick(150)
    s.check('Aktueller Owner übernimmt Regel', env.video.playbackRate, 1)
    env.changeRules([{ type: 'channel', pattern: '@sportstudio', speed: 1.25 }])
    s.check('Bearbeitetes Kanaltempo gilt sofort', env.video.playbackRate, 1.25)
    env.changeRules([])
    s.check('Entfernte Regel gibt Standardtempo frei', env.video.playbackRate, 1.8)
  }
  {
    const env = load({ ...YT, channel: '@other', channelName: 'sportstudio', channelRules: [{ type: 'channel', pattern: 'sportstudio', speed: 1 }] })
    s.check('Exakter Kanalname wird unterstützt', env.video.playbackRate, 1)
  }
  for (const path of ['/shorts/abc', '/embed/abc', '/live/abc']) {
    const env = load({ ...YT, pathname: path })
    s.check(`Kanalregel auf ${path}`, env.video.playbackRate, 1)
  }
  {
    const env = load({ ...YT, hostname: 'm.youtube.com' })
    s.check('Mobile YouTube-Seite unterstützt', env.video.playbackRate, 1)
  }
  {
    const env = load({ ...YT, pathname: '/embed/abc', channel: 'channel/UCE0RhriywrL8XhXbo87tMKQ' })
    s.check('sportstudio-Handle trifft Kanal-ID im Embed', env.video.playbackRate, 1)
  }
  {
    const env = load({ ...YT, channelRules: [{ type: 'channel', pattern: 'channel/UCE0RhriywrL8XhXbo87tMKQ', aliases: ['@sportstudio'], speed: 1 }] })
    s.check('Kanal-ID-Regel trifft Handle auf Watch-Seite', env.video.playbackRate, 1)
  }
  {
    const env = load({ hostname: 'www.youtube-nocookie.com', pathname: '/embed/abc', ancestorOrigins: ['https://www.youtubekids.com'], storedSpeed: 2.5 })
    s.check('YouTube-Frame innerhalb von Kids bleibt auf 1,0×', env.video.playbackRate, 1)
    env.changeKids(false)
    s.check('Kids-Abschalten gilt auch im eingebetteten Frame', env.video.playbackRate, 2.5)
  }
  for (const hostname of ['www.youtubekids.com', 'youtubekids.com']) {
    const env = load({ hostname, pathname: '/watch?v=one', storedSpeed: 2.5, channelRules: [{ pattern: 'youtubekids', speed: 3 }] })
    s.check(`${hostname}: Website-Regel hat Vorrang`, env.video.playbackRate, 1)
    env.advance(6000)
    env.video.playbackRate = 2.5
    await tick()
    s.check(`${hostname}: Player-Änderung bleibt wirkungslos`, env.video.playbackRate, 1)
    press(env.winListeners, 'd')
    s.check(`${hostname}: Hotkey lässt 1,0× stehen`, env.video.playbackRate, 1)
    s.check(`${hostname}: Standardtempo bleibt unverändert`, env.savedSpeed(), 2.5)
    env.changeRules([])
    env.changeKids(false)
    s.check(`${hostname}: Abschalten gibt Standardtempo frei`, env.video.playbackRate, 2.5)
  }
  {
    const env = load({ hostname: 'youtubekids.com.evil', storedSpeed: 2 })
    s.check('Kids-Regel gilt nur auf echter Domain', env.video.playbackRate, 2)
  }
  return s.report()
}
module.exports = { run }
