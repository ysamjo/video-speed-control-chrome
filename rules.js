// Gemeinsame Regeln für Content Script und Einstellungsseite.
;(() => {
  // Sport- und Streaming-Kanäle: englischer Originalton / Sport läuft mit 1,0×.
  const DEFAULT_CHANNEL_RULES = [
    { type: 'channel', pattern: '@sportstudio', aliases: ['channel/UCE0RhriywrL8XhXbo87tMKQ'], speed: 1 },
    { type: 'channel', pattern: '@sportschau', aliases: ['channel/UCRFsyeKu07-LnHDG44O6uCA'], speed: 1 },
    { type: 'channel', pattern: '@skysport', aliases: ['channel/UCAvNr5DMVncoJnJAotXOjOQ'], speed: 1 },
    { type: 'channel', pattern: '@skysportde', aliases: ['channel/UCuOwl-VgqBHOzR8hWnonBcA'], speed: 1 },
    { type: 'channel', pattern: '@skysportaustria', aliases: ['channel/UC5dCegXiWjE57wKrhWnCo0g'], speed: 1 },
    { type: 'channel', pattern: '@skysportpremierleague', aliases: ['channel/UC_VsQmcsFWUhGn3DTwiO8bg'], speed: 1 },
    { type: 'channel', pattern: '@dazn', aliases: ['channel/UCdi3n18zcIZeTk_x9qvSgZw'], speed: 1 },
    { type: 'channel', pattern: '@daznde', aliases: ['channel/UC-XArLCeEw91r9gmaDi-Ajw'], speed: 1 },
    { type: 'channel', pattern: '@daznfussball', aliases: ['channel/UClBFnQJMlinWDCvfSXj60CA'], speed: 1 },
    { type: 'channel', pattern: '@daznuefachampionsleague', aliases: ['channel/UCB-GdMjyokO9lZkKU_oIK6g'], speed: 1 },
    { type: 'channel', pattern: '@rtlsport', aliases: ['channel/UC8WYi3XQXsf-6FNvqoEvxag'], speed: 1 },
    { type: 'channel', pattern: '@primevideosportde', aliases: ['channel/UCK2izXoHvraUFaPMU5B7vMQ'], speed: 1 },
    { type: 'channel', pattern: '@eurosportdeutschland', aliases: ['channel/UCk452F_ypT9Q8b1S38-Ok8A'], speed: 1 },
    { type: 'channel', pattern: '@sport1', aliases: ['channel/UCPj_Vtw0hKnhJapQuATBUrA'], speed: 1 },
    { type: 'channel', pattern: '@ransport', aliases: ['channel/UCiMAc_TN1kSO3ErMtxUXfMA'], speed: 1 },
    { type: 'channel', pattern: '@kicker', aliases: ['channel/UCQEHrmmI8kKJ6kAiQdQUjgg'], speed: 1 },
    { type: 'channel', pattern: '@magentasport', aliases: ['channel/UChr7ZXDFiPOEl543HM4Aj8g'], speed: 1 },
    { type: 'channel', pattern: '@nfl', aliases: ['channel/UCDVYQ4Zhbm3S2dlz7P1GBDg'], speed: 1 },
    { type: 'channel', pattern: '@nba', aliases: ['channel/UCWJ2lWNubArHWmf3FIHbfcQ'], speed: 1 },
    { type: 'channel', pattern: '@motogp', aliases: ['channel/UC8pYaQzbBBXg9GIOHRvTmDQ'], speed: 1 },
    { type: 'channel', pattern: '@formula1', aliases: ['channel/UCB_qr75-ydFVKSF9Dmo6izg'], speed: 1 },
    { type: 'channel', pattern: '@bundesliga', aliases: ['channel/UC6UL29enLNe4mqwTfAyeNuw'], speed: 1 },
    { type: 'channel', pattern: '@dfb', aliases: ['channel/UCfMo0xj-sbdzHuzxvKdu1hw'], speed: 1 },
    { type: 'channel', pattern: '@uefa', aliases: ['channel/UCyGa1YEx9ST66rYrJTGIKOw'], speed: 1 },
    { type: 'channel', pattern: '@hbl', aliases: ['channel/UC88p9kEf5mpvTeqmKU1_ENQ'], speed: 1 },
    { type: 'channel', pattern: '@basketballbundesliga', aliases: ['channel/UCg4YgrMEO4Y5hg9FJce6Jag'], speed: 1 },
    { type: 'channel', pattern: '@pennydel', aliases: ['channel/UCvXPupYUxWt5KeFgK1z0e3A'], speed: 1 },
    { type: 'channel', pattern: '@servustv', aliases: ['channel/UC-7qscJH_SncZvCm9Ty014Q'], speed: 1 },
    { type: 'channel', pattern: '@officialpdc', aliases: ['channel/UCRvCwDp_1DwOlOpnlJf9iYw'], speed: 1 },
    { type: 'channel', pattern: '@premierleague', aliases: ['channel/UCG5qGWdu8nIRZqJ_GgDwQ-w'], speed: 1 },
    { type: 'channel', pattern: '@laliga', aliases: ['channel/UCTv-XvfzLX3i4IGWAm4sbmA'], speed: 1 },
    { type: 'channel', pattern: '@seriea', aliases: ['channel/UCBJeMCIeLQos7wacox4hmLQ'], speed: 1 },
    { type: 'channel', pattern: '@ligue1', aliases: ['channel/UCQsH5XtIc9hONE1BQjucM0g'], speed: 1 },
    { type: 'channel', pattern: '@skysports', aliases: ['channel/UCTU_wC79Dgi9rh4e9-baTqA'], speed: 1 },
    { type: 'channel', pattern: '@tntsports', aliases: ['channel/UClhp9g6TPiqCTOlcw0ROfNg'], speed: 1 },
    { type: 'channel', pattern: '@espn', aliases: ['channel/UCiWLfSweyRNmLpgEHekhoAg'], speed: 1 },
    { type: 'channel', pattern: '@fifa', aliases: ['channel/UCpcTrCXblq78GZrTUTLWeBw'], speed: 1 },
    { type: 'channel', pattern: '@olympics', aliases: ['channel/UCTl3QQTvqHFjurroKxexy2Q'], speed: 1 },
    { type: 'channel', pattern: '@teamdeutschland', aliases: ['channel/UCvFDH2FJfTn1Fqaz2gUYWVg'], speed: 1 },
    { type: 'channel', pattern: '@atptour', aliases: ['channel/UCY_5h5zaSwN7Or4kIJDYNXA'], speed: 1 },
    { type: 'channel', pattern: '@wimbledon', aliases: ['channel/UCNa8NxMgSm7m4Ii9d4QGk1Q'], speed: 1 },
    { type: 'channel', pattern: '@usopen', aliases: ['channel/UCXbboag48Qlr78zzz6SkzkQ'], speed: 1 },
    { type: 'channel', pattern: '@rolandgarros', aliases: ['channel/UCF3K1Jf8hjFW8qliei8fQ3A'], speed: 1 },
    { type: 'channel', pattern: '@australianopen', aliases: ['channel/UCeTKJSW1NTAkf27nNmjWt5A'], speed: 1 },
    { type: 'channel', pattern: '@mlb', aliases: ['channel/UCoLrcjPV5PbUrUyXq5mjc_A'], speed: 1 },
    { type: 'channel', pattern: '@nhl', aliases: ['channel/UCqFMzb-4AUf6WAIbl132QKA'], speed: 1 },
    { type: 'channel', pattern: '@ufc', aliases: ['channel/UCvgfXK4nTYKudb0rFR6noLA'], speed: 1 },
    { type: 'channel', pattern: '@nascar', aliases: ['channel/UCuN9hYw2RpoAW8rZ3VK3isA'], speed: 1 },
    { type: 'channel', pattern: '@indycar', aliases: ['channel/UCy1F61QvUUQXAXi2Voa_fUw'], speed: 1 },
    { type: 'channel', pattern: '@wrc', aliases: ['channel/UC5G6kTnHXDz0WIBC2VGBOqg'], speed: 1 },
    { type: 'channel', pattern: '@letourdefrance', aliases: ['channel/UCSpycUnuU0IVF7gGIhGojhg'], speed: 1 },
    { type: 'channel', pattern: '@giroditalia', aliases: ['channel/UCe10BxbsFg9Kbmkg-ean_Dg'], speed: 1 },
    { type: 'channel', pattern: '@sportbuzzer', aliases: ['channel/UCgl60be0ucr6WdpHqG6EA7A'], speed: 1 },
    { type: 'channel', pattern: '@transfermarkt', aliases: ['channel/UCRfs7Y0wWMjl4pmdvEQgjVA'], speed: 1 },
  ]
  const isYouTube = hostname => /(^|\.)youtube(?:-nocookie)?\.com$/i.test(hostname)
  const isKids = hostname => /(^|\.)youtubekids\.com$/i.test(hostname)
  const validSpeed = value => {
    if (String(value ?? '').trim() === '') return null
    const n = Number(String(value).replace(',', '.'))
    return Number.isFinite(n) && n >= 0.25 && n <= 10 ? Math.round(n * 100) / 100 : null
  }
  const channelKey = value => {
    let text = String(value ?? '').trim()
    if (/^(?:https?:\/\/|(?:www\.|m\.)?youtube\.com\/)/i.test(text)) {
      try {
        const url = new URL(/^https?:/i.test(text) ? text : `https://${text}`)
        if (!isYouTube(url.hostname)) return ''
        text = url.pathname
      } catch { return '' }
    }
    try { text = decodeURIComponent(text) } catch { return '' }
    const match = text.match(/^\/?(@[^/?#\s]+|channel\/[^/?#\s]+|c\/[^/?#\s]+|user\/[^/?#\s]+)(?:[/?#].*)?$/i)
    if (match) return /^channel\//i.test(match[1]) ? `channel/${match[1].slice(8)}` : match[1].toLowerCase()
    // Ein exakter Anzeigename bleibt möglich; Video-URLs und freie URL-Muster nicht.
    if (!text || /[/?:#=]/.test(text)) return ''
    if (/^UC[\w-]{22}$/.test(text)) return `channel/${text}`
    return text.toLowerCase()
  }
  const normalizeRules = raw => {
    if (!Array.isArray(raw)) return []
    // Der alte ausgelieferte Beispielwert war eine ungewollt breite URL-Regel.
    if (raw.length === 1 && !raw[0]?.type && raw[0]?.pattern === 'sport' && raw[0]?.speed === 1.1) {
      return DEFAULT_CHANNEL_RULES.map(r => ({ ...r }))
    }
    return raw.flatMap(rule => {
      const type = rule?.type === 'channel' ? 'channel' : 'url'
      const pattern = type === 'channel' ? channelKey(rule.pattern) : String(rule?.pattern ?? '').trim().toLowerCase()
      const speed = validSpeed(rule?.speed)
      const aliases = type === 'channel' && Array.isArray(rule.aliases) ? rule.aliases.map(channelKey).filter(Boolean) : []
      return pattern && speed !== null ? [{ type, pattern, speed, ...(aliases.length ? { aliases } : {}) }] : []
    })
  }

  const mediaKey = location => {
    try {
      const url = new URL(location.href)
      const id = url.searchParams.get('v')
      return `${url.origin}${url.pathname}${id ? `?v=${id}` : ''}`
    } catch { return location.href || '' }
  }

  const readChannel = (document, location) => {
    if (!isYouTube(location.hostname)) return []
    const keys = new Set()
    const watch = document.querySelector('ytd-watch-flexy')
    const currentId = new URL(location.href).searchParams.get('v')
    // Während SPA-Wechseln gehört der sichtbare Owner häufig noch zum vorigen Video.
    if (location.pathname === '/watch' && watch?.getAttribute?.('video-id') && watch.getAttribute('video-id') !== currentId) return []
    const selectors = location.pathname.startsWith('/shorts/')
      ? ['ytd-reel-video-renderer[is-active] #channel-name a[href]', 'ytd-reel-video-renderer[is-active] a.yt-simple-endpoint[href^="/@"]']
      : location.pathname.startsWith('/embed/')
        ? ['.ytp-title-channel-logo[href]', '.ytp-title-channel-name[href]']
        : ['ytd-watch-flexy #owner ytd-channel-name a[href]', 'ytd-watch-flexy #upload-info a[href]', 'ytm-video-owner-renderer a[href]', 'ytm-slim-owner-renderer a[href]']
    for (const selector of selectors) {
      for (const link of document.querySelectorAll(selector)) {
        const key = channelKey(link.getAttribute('href'))
        if (!key) continue
        keys.add(key)
        const name = String(link.textContent || link.getAttribute('aria-label') || '').trim().toLowerCase()
        if (name) keys.add(name)
      }
    }
    return [...keys]
  }

  const resolve = ({ location, channels = [], rules = [], speed = 1.8, kids = true, kidsContext = false }) => {
    if (kids && (isKids(location.hostname) || kidsContext)) return { key: 'kids', rate: 1 }
    const href = (location.href || '').toLowerCase()
    // Kanalregeln sind spezifischer als die bisherigen URL-Muster.
    const rule = rules.find(r => r.type === 'channel' && isYouTube(location.hostname) && [r.pattern, ...(r.aliases || [])].some(key => channels.includes(key)))
      ?? rules.find(r => r.type === 'url' && href.includes(r.pattern))
    return rule ? { key: `${rule.type}:${rule.pattern}`, rate: rule.speed }
      : { key: 'global', rate: speed }
  }
  globalThis.VSC_RULES = { DEFAULT_CHANNEL_RULES, isYouTube, isKids, validSpeed, channelKey, normalizeRules, mediaKey, readChannel, resolve }
  if (typeof module !== 'undefined') module.exports = globalThis.VSC_RULES
})()
