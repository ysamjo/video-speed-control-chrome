# Video-Speed-Control

## Projekt-Kontext
- Chrome-Erweiterung (Manifest V3) zur Steuerung der Abspielgeschwindigkeit von HTML-Videos per Hotkey.
- Kanalvorgaben für YouTube (Standard 1,0× für 21 Sportkanäle), YouTube Kids 1,0×, Kino-Modus und „Später ansehen“-Aufräumer.
- Kein Build-Schritt für die Erweiterung: `manifest.json` lädt die Dateien direkt; `npm run build` erzeugt nur das Store-ZIP.
- Schwestersystem: `../morphe-patches` (YouTube-TV-Patch) nutzt denselben Kanal-Katalog.

## Konventionen
- Deutsch für UI-Texte, Doku und Commit-Messages; Englisch für Code-Identifier.
- Keine Kommentare ergänzen, außer sie erklären nicht offensichtliche Browser-/YouTube-Eigenheiten.
- Kanäle zentral in `channels.json` pflegen und `rules.js` daran ausrichten; `test/channel-catalog.test.js` prüft die Konsistenz (auch gegen `../morphe-patches`).
- Neue Regressionsfälle in `test/*.test.js` ergänzen und in `test/run.js` registrieren.
- Version in `manifest.json` und `package.json` synchron halten; README/CHROMEWEBSTORE bei Releases aktualisieren.

## Commands
- `npm test` – alle Regressionstests (Node, ohne Browser)
- `npm run build` – ZIP unter `dist/video-speed-control-<version>.zip`
- `node test/run.js` – Test-Runner direkt
