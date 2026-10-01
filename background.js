// Öffnet die Einstellungsseite, wenn das Toolbar-Symbol angeklickt wird.
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())

// Beim ersten Installieren die Einstellungen einmalig öffnen.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') chrome.runtime.openOptionsPage()
})