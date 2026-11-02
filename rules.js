// Gemeinsame Regeln für Content Script und Einstellungsseite.
;(() => {
  const DEFAULT_CHANNEL_RULES = [{ type: 'channel', pattern: '@sportstudio', aliases: ['channel/UCE0RhriywrL8XhXbo87tMKQ'], speed: 1 }]
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
      return `${url.origin}${url.pathname}${url.pathname === '/watch' ? `?v=${url.searchParams.get('v') || ''}` : ''}`
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
    if (kids && (isKids(location.hostname) || kidsContext)) return { key: 'kids', rate: 1, locked: true }
    const href = (location.href || '').toLowerCase()
    // Kanalregeln sind spezifischer als die bisherigen URL-Muster.
    const rule = rules.find(r => r.type === 'channel' && isYouTube(location.hostname) && [r.pattern, ...(r.aliases || [])].some(key => channels.includes(key)))
      ?? rules.find(r => r.type === 'url' && href.includes(r.pattern))
    return rule ? { key: `${rule.type}:${rule.pattern}`, rate: rule.speed, locked: true }
      : { key: 'global', rate: speed, locked: false }
  }
  globalThis.VSC_RULES = { DEFAULT_CHANNEL_RULES, isYouTube, isKids, validSpeed, channelKey, normalizeRules, mediaKey, readChannel, resolve }
  if (typeof module !== 'undefined') module.exports = globalThis.VSC_RULES
})()
