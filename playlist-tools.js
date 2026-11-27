// Zusätzliche YouTube-Werkzeuge: Laufzeit der geladenen Playlist-Videos und Zeitstempel-Link.
(() => {
  const PLAYLIST_KEY = 'playlistRuntime'
  const TIMESTAMP_KEY = 'timestampButton'
  const SUMMARY_ID = 'vpc-playlist-runtime'
  const STYLE_ID = 'vpc-playlist-tools-style'
  let settings = { [PLAYLIST_KEY]: true, [TIMESTAMP_KEY]: true }
  let timer

  const isYouTube = () => /(^|\.)youtube(-nocookie)?\.com$/i.test(location.hostname)
  const isPlaylist = () => location.pathname === '/playlist'
  const isWatch = () => location.pathname === '/watch'
  const find = selector => { try { return document.querySelector(selector) } catch { return null } }
  const all = selector => { try { return [...document.querySelectorAll(selector)] } catch { return [] } }
  const findIn = (parent, selector) => { try { return parent.querySelector(selector) } catch { return null } }
  const remove = selector => find(selector)?.remove()

  const injectStyle = () => {
    if (document.getElementById?.(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      #${SUMMARY_ID} { position: fixed; left: 12px; bottom: 12px; z-index: 9999; max-width: calc(100vw - 24px);
        padding: 7px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px;
        color: var(--yt-spec-text-primary, #fff); background: rgba(0,0,0,.82);
        font: 500 12px/1.4 Roboto, Arial, sans-serif; }
      .vpc-timestamp-button { min-height: 36px; margin-inline-end: 8px; padding: 0 12px;
        border: 1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,.16)); border-radius: 18px;
        color: var(--yt-spec-text-primary, #f1f1f1); background: transparent; font: 500 14px Roboto, Arial, sans-serif;
        cursor: pointer; white-space: nowrap; }
      .vpc-timestamp-button:hover { background: var(--yt-spec-10-percent-layer, rgba(255,255,255,.12)); }
    `
    ;(document.head || document.documentElement)?.append(style)
  }

  const parseDuration = text => {
    const parts = String(text || '').trim().split(':')
    if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+$/.test(part))) return null
    const numbers = parts.map(Number)
    if (numbers.slice(1).some(part => part >= 60)) return null
    return numbers.reduce((total, part) => total * 60 + part, 0)
  }

  const formatDuration = seconds => {
    const whole = Math.max(0, Math.round(seconds))
    const hours = Math.floor(whole / 3600)
    const minutes = Math.floor((whole % 3600) / 60)
    const remainder = whole % 60
    if (hours) return `${hours} Std. ${minutes} Min. ${remainder} Sek.`
    if (minutes) return `${minutes} Min. ${remainder} Sek.`
    return `${remainder} Sek.`
  }

  const progressFraction = node => {
    if (!node) return 1
    const rawAriaValue = node.getAttribute?.('aria-valuenow')
    const ariaValue = rawAriaValue == null ? NaN : Number(rawAriaValue)
    if (Number.isFinite(ariaValue) && ariaValue >= 0 && ariaValue <= 100) return ariaValue / 100
    const width = node.style?.width || node.getAttribute?.('style')?.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1] || ''
    const match = String(width).match(/^\s*(\d+(?:\.\d+)?)%\s*$/)
    return match ? Math.max(0, Math.min(100, Number(match[1]))) / 100 : 1
  }

  const updatePlaylistRuntime = () => {
    if (!settings[PLAYLIST_KEY] || !isPlaylist()) {
      remove(`#${SUMMARY_ID}`)
      return
    }
    const items = all('ytd-playlist-video-renderer')
    if (!items.length) return

    let total = 0
    let watched = 0
    let known = 0
    for (const item of items) {
      const durationNode = findIn(item, 'ytd-thumbnail-overlay-time-status-renderer #text')
        || findIn(item, 'ytd-thumbnail-overlay-time-status-renderer')
      const duration = parseDuration(durationNode?.getAttribute?.('aria-label') || durationNode?.innerText || durationNode?.textContent)
      if (duration === null) continue
      known++
      total += duration
      const progress = findIn(item, 'ytd-thumbnail-overlay-resume-playback-renderer #progress')
      const resume = progress || findIn(item, 'ytd-thumbnail-overlay-resume-playback-renderer')
      if (resume) watched += duration * progressFraction(progress || resume)
    }
    const elapsed = Math.round(watched)
    const remaining = Math.max(0, total - elapsed)
    const counts = known === items.length ? `${items.length} geladene Videos` : `${items.length} geladen · ${known} mit Laufzeit`
    let summary = document.getElementById?.(SUMMARY_ID)
    if (!summary) {
      summary = document.createElement('div')
      summary.id = SUMMARY_ID
      summary.setAttribute('role', 'status')
      summary.setAttribute('aria-live', 'polite')
      document.body?.append(summary)
    }
    if (summary) summary.textContent = `${counts} · Gesamt ${formatDuration(total)} · gesehen ${formatDuration(elapsed)} · übrig ${formatDuration(remaining)}`
  }

  const copyText = async text => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {}
    const input = document.createElement('textarea')
    input.value = text
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body?.append(input)
    input.select?.()
    let copied = false
    try { copied = document.execCommand('copy') } catch {}
    input.remove()
    return copied
  }

  const addTimestampButton = () => {
    const row = find('#top-level-buttons-computed')
    if (!settings[TIMESTAMP_KEY] || !isWatch() || !row) {
      remove('.vpc-timestamp-button')
      return
    }
    if (row.querySelector('.vpc-timestamp-button')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'vpc-timestamp-button'
    button.textContent = 'Zeitstempel'
    button.title = 'Link ab der aktuellen Stelle kopieren'
    button.setAttribute('aria-label', 'Link ab der aktuellen Stelle kopieren')
    button.addEventListener('click', async event => {
      event.preventDefault()
      const video = find('video.html5-main-video') || find('video')
      if (!video) return
      const url = new URL(location.href)
      url.searchParams.set('t', `${Math.floor(video.currentTime)}s`)
      const copied = await copyText(url.toString())
      button.textContent = copied ? 'Kopiert' : 'Kopieren fehlgeschlagen'
      setTimeout(() => { if (button.isConnected) button.textContent = 'Zeitstempel' }, 1500)
    })
    row.prepend(button)
  }

  const run = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (!isYouTube()) return
      injectStyle()
      updatePlaylistRuntime()
      addTimestampButton()
    }, 120)
  }

  const init = () => {
    if (!isYouTube()) return
    try {
      chrome.storage.sync.get({ [PLAYLIST_KEY]: true, [TIMESTAMP_KEY]: true }, result => {
        settings = { ...settings, ...result }
        run()
      })
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return
        for (const key of [PLAYLIST_KEY, TIMESTAMP_KEY]) {
          if (changes[key]) settings[key] = changes[key].newValue !== false
        }
        run()
      })
    } catch {}
    document.addEventListener('yt-navigate-finish', run, true)
    window.addEventListener('scroll', run, { passive: true })
    if (typeof MutationObserver === 'function' && document.documentElement) {
      new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true })
    }
    run()
  }

  init()
})()
