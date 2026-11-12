const { load, press, tick, suite } = require('./harness')

const YT = {
  hostname: 'www.youtube.com', pathname: '/watch?v=one', channel: '@sportstudio',
  channelName: 'sportstudio', cinema: false,
  channelRules: [{ type: 'channel', pattern: '@sportstudio', speed: 1 }],
}

async function run() {
  const s = suite()

  {
    const env = load(YT)
    const response = env.diagnose()
    s.check('Diagnose antwortet', response?.ok, true)
    s.check('Diagnose erkennt YouTube', response.data.youtube, true)
    s.check('Diagnose erkennt keinen Kids-Kontext', response.data.kids, false)
    s.check('Diagnose nennt den Kanalnamen', response.data.channelName, 'sportstudio')
    s.check('Diagnose nennt den Kanal-Handle', response.data.channels.includes('@sportstudio'), true)
    s.check('Diagnose nennt die Kanalregel', response.data.rule.key, 'channel:@sportstudio')
    s.check('Diagnose nennt das Regel-Tempo', response.data.rule.rate, 1)
    s.check('Diagnose nennt das aktuelle Tempo', response.data.currentRate, 1)
    s.check('Diagnose nennt das Standardtempo', response.data.storedSpeed, 1.8)
    s.check('Diagnose meldet keine manuelle Auswahl', response.data.manual, false)
  }

  {
    const env = load({ hostname: 'example.com', pathname: '/video', cinema: false })
    const response = env.diagnose()
    s.check('Diagnose erkennt Nicht-YouTube', response.data.youtube, false)
    s.check('Diagnose nutzt das Standardtempo', response.data.rule.key, 'global')
    s.check('Diagnose nennt das globale Tempo', response.data.rule.rate, 1.8)
    s.check('Diagnose nennt das laufende Tempo', response.data.currentRate, 1.8)
  }

  {
    const env = load({ hostname: 'www.youtubekids.com', pathname: '/watch?v=one', cinema: false, initial: 1 })
    const response = env.diagnose()
    s.check('Diagnose erkennt YouTube Kids', response.data.kids, true)
    s.check('Diagnose nennt die Kids-Regel', response.data.rule.key, 'kids')
    s.check('Diagnose nennt das Kids-Tempo', response.data.rule.rate, 1)
  }

  {
    const env = load(YT)
    press(env.winListeners, 'd')
    await tick()
    const response = env.diagnose()
    s.check('Diagnose erkennt eine manuelle Auswahl', response.data.manual, true)
    s.check('Diagnose nennt das manuelle Tempo', response.data.currentRate, 1.1)
    s.check('Diagnose behält die Kanalregel', response.data.rule.key, 'channel:@sportstudio')
  }

  return s.report()
}

module.exports = { run }
