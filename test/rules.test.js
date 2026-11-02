const { suite } = require('./harness')
const { channelKey, normalizeRules, validSpeed, resolve, readChannel } = require('../rules')
async function run() {
  const s = suite()
  s.check('Kanal-Link normalisieren', channelKey('https://www.youtube.com/@Sportstudio/videos'), '@sportstudio')
  s.check('Kanal-ID normalisieren', channelKey('https://www.youtube.com/channel/UC1234567890123456789012'), 'channel/UC1234567890123456789012')
  s.check('Reine Kanal-ID normalisieren', channelKey('UC1234567890123456789012'), 'channel/UC1234567890123456789012')
  s.check('Schreibweise von Kanal-ID erhalten', channelKey('https://www.youtube.com/channel/UCE0RhriywrL8XhXbo87tMKQ'), 'channel/UCE0RhriywrL8XhXbo87tMKQ')
  s.check('Exakter Name möglich', channelKey('Sportstudio'), 'sportstudio')
  s.check('Watch-URL ist kein Kanal', channelKey('https://www.youtube.com/watch?v=123'), '')
  s.check('Fremde Domain ist kein Kanal', channelKey('https://youtube.com.evil/@sportstudio'), '')
  s.check('Dezimal-Komma', validSpeed('1,25'), 1.25)
  for (const value of ['', ' ', NaN, Infinity, 0, 0.1, 10.1, 'falsch']) s.check(`Ungültiges Tempo ${value}`, validSpeed(value), null)
  s.check('Altes Beispiel wird durch sportstudio ersetzt', normalizeRules([{ pattern: 'sport', speed: 1.1 }])[0].pattern, '@sportstudio')
  s.check('Leere gespeicherte Regelliste bleibt leer', normalizeRules([]).length, 0)
  s.check('Bestehende individuelle URL-Regel bleibt erhalten', normalizeRules([{ pattern: 'example.org', speed: 2 }])[0].type, 'url')
  s.check('Ungültige Regeln werden nicht angewendet', normalizeRules([{ type: 'channel', pattern: '@foo', speed: 'kaputt' }]).length, 0)
  const rules = normalizeRules([{ type: 'url', pattern: 'youtube', speed: 2 }, { type: 'channel', pattern: '@sportstudio', speed: 1 }])
  const location = { hostname: 'www.youtube.com', pathname: '/watch', href: 'https://www.youtube.com/watch?v=one' }
  s.check('Kanalregel hat Vorrang vor URL-Regel', resolve({ location, rules, channels: ['@sportstudio'] }).rate, 1)
  s.check('Ähnlicher Kanal trifft nicht', resolve({ location, rules: rules.slice(1), channels: ['@sportstudioextra'] }).key, 'global')
  const doc = { querySelector: () => null, querySelectorAll: () => [] }
  s.check('Empfehlungen und Videotitel werden nicht als Owner ausgewertet', readChannel(doc, location).length, 0)
  return s.report()
}
module.exports = { run }
