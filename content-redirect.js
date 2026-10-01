// content-redirect.js
// Bekannte Redirect-/Interstitialseiten externer Links überspringen:
// 1. Beim Klick auf einen solchen Link wird das href direkt auf das Ziel umgeschrieben.
// 2. Landet man trotzdem auf so einer Seite, wird sofort zum eigentlichen Ziel weitergeleitet.
//
// Komplett in einer IIFE gekapselt: Content Scripts teilen sich die globalen
// lexical Bindungen (const/let) des Isolated World – top-level const würde
// Kollisionen mit dem anderen Content Script verursachen.
(() => {
const log = (...args) => console.info('%cVPC', 'color:grey', ...args)

const REDIRECT_RULES = [
  // Google-Suchergebnisse: https://www.google.com/url?q=<Ziel>&...
  { host: /(^|\.)google\.[a-z.]{2,}$/, path: /^\/url$/, param: 'q' },
  // Bing: https://www.bing.com/ck/a?...&u=a1<base64url>
  { host: /(^|\.)bing\.com$/, path: /^\/ck\/a$/, param: 'u', stripPrefix: 'a1', base64: true },
  // Facebook: https://l.facebook.com/l.php?u=<Ziel>
  { host: /(^|\.)facebook\.com$/, path: /^\/l\.php$/, param: 'u' },
  // Instagram: https://l.instagram.com/?u=<Ziel>
  { host: /(^|\.)instagram\.com$/, path: /^\/$/, param: 'u' },
  // Steam: https://steamcommunity.com/linkfilter/?u=<Ziel>
  { host: /(^|\.)steamcommunity\.com$/, path: /^\/linkfilter\/?$/, param: 'u' },
  // DuckDuckGo (HTML-Version): https://duckduckgo.com/?uddg=<Ziel>
  { host: /(^|\.)duckduckgo\.com$/, path: /^\/$/, param: 'uddg' },
  // Reddit: https://out.reddit.com/r?u=<Ziel> bzw. /t?u=<Ziel>
  { host: /(^|\.)out\.reddit\.com$/, path: /^\/(r|t)\/?$/, param: 'u' },
  // X/Twitter: https://t.co? n/a – aber https://x.com/i/redirect?url=<Ziel>
  { host: /(^|\.)(twitter\.com|x\.com)$/, path: /^\/i\/redirect$/, param: 'url' },
  // href.li hängt das Ziel direkt an: https://href.li/?<Ziel>
  { host: /^href\.li$/, raw: true },
]

/** Reines URL-Unwrapping (ohne DOM-Zugriff, damit es testbar bleibt). */
const unwrapUrl = (href) => {
  let url
  try { url = new URL(href) } catch { return null }

  const rule = REDIRECT_RULES.find(r =>
    r.host.test(url.hostname) && (r.raw || r.path.test(url.pathname)))
  if (!rule) return null

  let target
  try {
    if (rule.raw) {
      // href.li/?https://example.com – Ziel hängt direkt an der Query.
      target = url.search.slice(1)
      try { target = decodeURIComponent(target) } catch { /* bereits dekodiert */ }
    } else {
      target = url.searchParams.get(rule.param)
      if (!target) return null
      if (rule.stripPrefix && target.startsWith(rule.stripPrefix)) {
        target = target.slice(rule.stripPrefix.length)
      }
      if (rule.base64) {
        const b64 = target.replaceAll('-', '+').replaceAll('_', '/')
        const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)), c => c.charCodeAt(0))
        target = new TextDecoder('utf-8').decode(bytes)
      }
    }
    if (!target) return null
    const t = new URL(target)
    // Nur echte http(s)-Ziele, kein Selbst-Redirect (Schutz vor Endlosschleifen).
    if (!/^https?:$/.test(t.protocol)) return null
    if (t.href === url.href || t.hostname === url.hostname) return null
    return t.href
  } catch { return null }
}

if (typeof document !== 'undefined') {
  const redirectNow = () => {
    const target = unwrapUrl(location.href)
    if (target) location.replace(target) // replace: Redirect-Seite landet nicht im Verlauf
  }

  const findAnchor = (e) => {
    for (const node of e.composedPath()) {
      if (node?.localName === 'a' && node.href) return node
    }
    return null
  }

  // 1. Klick abfangen und das href vor dem Navigieren entwirren
  //    (hilft auch beim Kontextmenü „Link in neuem Tab öffnen").
  const rewriteAnchor = (e) => {
    const a = findAnchor(e)
    if (!a) return
    const target = unwrapUrl(a.href)
    if (target && target !== a.href) {
      a.href = target
      log('Link entwirrt →', target)
    }
  }

  // 2. Falls die Redirect-Seite trotzdem geladen wird: sofort weiterleiten.
  redirectNow()
  document.addEventListener('click', rewriteAnchor, true)
  document.addEventListener('auxclick', rewriteAnchor, true)
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { unwrapUrl, REDIRECT_RULES }
}
})()