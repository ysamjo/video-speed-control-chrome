// Gemeinsame Regeln für Content Script und Einstellungsseite.
;(() => {
  // Sport- und Streaming-Kanäle: englischer Originalton / Sport läuft mit 1,0×.
  const DEFAULT_CHANNEL_RULES = [
    { type: 'channel', pattern: '@sportstudio', aliases: ['channel/UCE0RhriywrL8XhXbo87tMKQ'], speed: 1 },
    { type: 'channel', pattern: '@sportschau', aliases: ['channel/UCRFsyeKu07-LnHDG44O6uCA'], speed: 1 },
    { type: 'channel', pattern: '@skysport', aliases: ['channel/UCAvNr5DMVncoJnJAotXOjOQ'], speed: 1 },
    { type: 'channel', pattern: '@skysportde', aliases: ['channel/UCuOwl-VgqBHOzR8hWnonBcA'], speed: 1 },
    { type: 'channel', pattern: '@skysportaustria', aliases: ['channel/UC5dCegXiWjE57wKrhWnCo0g'], speed: 1 },
    { type: 'channel', pattern: '@dazn', aliases: ['channel/UCdi3n18zcIZeTk_x9qvSgZw'], speed: 1 },
    { type: 'channel', pattern: '@daznde', aliases: ['channel/UC-XArLCeEw91r9gmaDi-Ajw'], speed: 1 },
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
