const fs = require('fs')
const path = require('path')
const { suite } = require('./harness')
const { DEFAULT_CHANNEL_RULES } = require('../rules')

const catalogPath = path.join(__dirname, '..', 'channels.json')
const morphePath = path.join(__dirname, '..', '..', 'morphe-patches',
  'extensions', 'extension', 'src', 'main', 'js', 'channel-speed.js')

async function run() {
  const s = suite()
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
  const ruleById = new Map(DEFAULT_CHANNEL_RULES.map(rule => [
    String(rule.aliases?.[0] ?? '').replace(/^channel\//, ''), rule,
  ]))

  s.check('Katalog enthält alle Standardregeln', catalog.length, DEFAULT_CHANNEL_RULES.length)
  s.check('Standardregeln haben eindeutige IDs', ruleById.size, DEFAULT_CHANNEL_RULES.length)

  for (const entry of catalog) {
    const rule = ruleById.get(entry.id)
    s.check(`Katalog-ID ${entry.id} ist vorhanden`, !!rule, true)
    if (!rule) continue
    s.check(`${entry.handle} nutzt den Handle`, rule.pattern, entry.handle.toLowerCase())
    s.check(`${entry.handle} nutzt das Katalogtempo`, rule.speed, entry.speed)
  }

  for (const entry of catalog) {
    s.check(`ID ${entry.id} ist gültig`, /^UC[\w-]{22}$/.test(entry.id), true)
    s.check(`Handle ${entry.handle} ist gültig`, /^@[\w.-]+$/.test(entry.handle), true)
    s.check(`Name ${entry.name} ist gesetzt`, entry.name.length > 0, true)
    s.check(`Tempo für ${entry.handle} ist gültig`, entry.speed >= 0.05 && entry.speed <= 10, true)
  }

  if (fs.existsSync(morphePath)) {
    const morphe = require(morphePath)
    const list = morphe.defaultChannels ?? []
    s.check('Morphe kennt alle Katalogkanäle', list.length, catalog.length)
    for (const entry of catalog) {
      const rule = list.find(item => item.id === entry.id)
      s.check(`Morphe kennt ${entry.handle}`, !!rule, true)

      if (!rule) continue
      s.check(`Morphe-Tempo für ${entry.handle}`, rule.speed, entry.speed)
      s.check(`Morphe-Handle für ${entry.handle}`, String(rule.handle).toLowerCase(), entry.handle.toLowerCase())
    }
  }

  return s.report()
}

module.exports = { run }
