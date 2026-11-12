# Video Speed Control with Keyboard (Chrome Extension)

Portierung des Userscripts „Video Speed Control with Keyboard" als Chrome-Erweiterung (Manifest V3).

## Kanalvorgaben und manuelles Tempo (2026.11.3)

Klick auf das Erweiterungssymbol öffnet die Verwaltung. Unter **Standardgeschwindigkeit pro Kanal** lassen sich Kanäle hinzufügen, bearbeiten und entfernen. Trage vorzugsweise den **@Handle** (z. B. `@sportstudio`) oder den vollständigen YouTube-Kanal-Link ein, wähle das Tempo und klicke auf **Einstellungen speichern**. Auch Kanal-IDs und exakte Anzeigenamen sind möglich; Handles und IDs vermeiden Verwechslungen bei gleichen Namen. Beim Speichern eines neuen Kanal-Links werden Handle und Kanal-ID einmalig über die öffentliche YouTube-Kanalseite abgeglichen; ein Server oder API-Schlüssel ist nicht nötig.

- **1,0× voreingestellt** für Sportkanäle: `@sportstudio`, `@sportschau`, `@skysport`, `@skysportde`, `@skysportaustria`, `@dazn`, `@daznde`, `@rtlsport`, `@primevideosportde`, `@eurosportdeutschland`, `@sport1`, `@ransport`, `@kicker`, `@magentasport`, `@nfl`, `@nba`, `@motogp`, `@formula1`, `@bundesliga`, `@dfb` und `@uefa` (jeweils mit Kanal-ID als Alias, damit auch Umbenennungen des Handles greifen).
- **YouTube Kids: 1,0×** ist das Starttempo für alle Videos auf `youtubekids.com`. Die Website-Regel ist separat abschaltbar und hat den höchsten Vorrang.
- Kanalregeln erkennen den Kanal des tatsächlich abgespielten Videos auf Watch-, Live-, Shorts-, mobilen und eingebetteten YouTube-Seiten. Bei gemeinsamen Uploads ohne Owner-Link werden die öffentlichen YouTube-Videodaten einmalig abgerufen, um den veröffentlichenden Hauptkanal zu ermitteln. Videotitel, Empfehlungen und Suchparameter lösen keine Kanalregel aus.
- Kanal- und Kids-Regeln bestimmen das Starttempo. **Manuelle Änderungen per S / D / R oder über das Player-Menü gelten nur für das aktuelle Video.** Pausieren, Fortsetzen und Spulen behalten diese Auswahl. **Beim nächsten Video gilt wieder die passende Kanal-/Kids-Regel oder das globale Standardtempo**, auch wenn YouTube das Videoelement wiederverwendet. Gespeicherte Vorgaben bleiben unverändert; dauerhafte Änderungen erfolgen ausschließlich in den Einstellungen.
- Ohne Treffer gilt das Standardtempo; Kanalregeln haben Vorrang vor bisherigen URL-Regeln. Innerhalb einer Regelart gewinnt die erste passende Regel. Individuelle alte URL-Regeln bleiben erhalten; der alte Beispielwert `sport = 1.1` wird durch `@sportstudio = 1.0` ersetzt. Änderungen greifen nach dem Speichern auch in offenen Tabs.

Das alte Userscript in Tampermonkey/Violentmonkey für diese Websites deaktivieren, damit nicht zwei Geschwindigkeitssteuerungen gegeneinander arbeiten.

## Funktionen

- **Hotkeys** steuern die Abspielgeschwindigkeit (Standard):
  - **S** – langsamer (Schrittweite 0,1 ab der Auswahl für dieses Video)
  - **D** – schneller (Schrittweite 0,1 ab der Auswahl für dieses Video)
  - **R** – schaltet immer auf **1.00×**; steht das Video bereits auf 1.00×, geht es zurück auf die letzte Auswahl dieses Videos beziehungsweise dessen Startvorgabe. Die gespeicherten Vorgaben bleiben unverändert. Liegen Auswahl und Vorgabe bei 1,00×, gibt es nichts umzuschalten.
- **Einstellungsmenü** (Optionsseite): Alle drei Hotkeys sind frei definierbar (je genau ein Zeichen), zusätzlich kann die gespeicherte Geschwindigkeit direkt gesetzt und der Kino-Modus an/abgeschaltet werden. Klick auf das Toolbar-Symbol öffnet die Einstellungen. Änderungen greifen sofort in allen offenen Tabs (`chrome.storage.sync`).
- Das in den Einstellungen gespeicherte Standardtempo wird bei neuen Videos angewendet, sofern keine Kanal-/Kids-Regel passt. Manuelle Änderungen bleiben nur für das laufende Video erhalten. Automatische Player-Resets nach Hotkeys, Spulen und Fortsetzen werden abgefangen. Auf YouTube gilt das auch für späte interne Tempo-Resets nach einem Videowechsel; eine bewusste Auswahl im Speed-Menü oder über dessen Regler bleibt möglich.
- **Kino-Modus immer aktiv (YouTube)**: Auf Watch- und Live-Seiten (`youtube.com/watch`, `/live/…`) wird der **Theatermodus** automatisch eingeschalten – der Player wird breit, aber nicht vollbild. Erkennung über `ytd-watch-flexy[theater]`, Umschalten über den `.ytp-size-button` (Fallback: Button-Text in lokaler Sprache). Wird der Modus von YouTube zurückgesetzt oder manuell ausgeschaltet, wird er nachgesetzt (MutationObserver + `yt-navigate-finish` decken YouTubes SPA-Navigation ab, 250 ms Debounce und 0,9 s Schutzfrist verhindern Hin-und-Her-Klicken). In den Einstellungen abschaltbar, Standard: **an**.
- **Später ansehen aufräumen** (`youtube.com/playlist?list=WL`): Die linke Wiedergabelisten-Spalte verschwindet, die Liste nutzt die volle Breite, und die Hinweise wie „Kommt es zu Unterbrechungen?“ werden ausgeblendet. Jeder Eintrag bekommt links neben dem Drei-Punkte-Menü einen **Papierkorb**, der das Video ohne Umweg über das Menü aus „Später ansehen“ entfernt (nutzt YouTubes eigenen Menüpunkt, löscht also nur den Listeneintrag, nicht das Video). In den Einstellungen abschaltbar, Standard: **an**.
- Kurzer Toast oben rechts zeigt die aktuelle Geschwindigkeit (funktioniert auch im Vollbild).
- **Redirect-Seiten überspringen**: Externe Links, die über bekannte Weiterleitungs-Interstitials laufen, werden direkt zum Ziel geführt – beim Klick (href wird entwirrt, gilt auch für „in neuem Tab öffnen") und als Fallback beim Laden der Redirect-Seite selbst. Abgedeckt: Google `/url?q=`, Bing `/ck/a`, Facebook `l.php`, Instagram `l.instagram.com`, Steam `linkfilter`, DuckDuckGo `uddg`, Reddit `out.reddit.com`, X/Twitter `/i/redirect`, `href.li`.

## Installation (Chrome / Edge / Brave)

1. `chrome://extensions` öffnen
2. Rechts oben **Entwicklermodus** aktivieren
3. **Entpackte Erweiterung laden** → diesen Ordner auswählen

## Dateien

| Datei | Zweck |
| --- | --- |
| `manifest.json` | Manifest V3 (Content Scripts, Optionsseite, Storage) |
| `content.js` | Geschwindigkeitssteuerung + konfigurierbare Hotkeys + Kino-Modus (YouTube-Theatermodus) |
| `rules.js` | Gemeinsame Kanalnormalisierung, Owner-Erkennung und Regelpriorität |
| `content-redirect.js` | Entwirrt Redirect-Links und überspringt Redirect-Seiten |
| `watch-later.js` | Räumt `youtube.com/playlist?list=WL` auf: breite Liste, Papierkorb pro Eintrag |
| `background.js` | Öffnet die Einstellungen beim Toolbar-Klick |
| `options/` | Einstellungsseite für Kanäle, YouTube Kids, Standardtempo und Hotkeys |
| `icons/` | Toolbar- und Store-Icons |
| `test/` | Regressionstests (laufen ohne Browser, siehe unten) |

## Tests

Die Tests brauchen keinen Browser: Sie laden `content.js` in eine `node:vm`-Sandbox mit
Minimal-DOM und simulieren Tastendrücke, `ratechange`-Events (asynchron, wie der Browser),
das 1,5-s-Enforce-Fenster über eine steuerbare Uhr sowie YouTubes Watch-Container
(`ytd-watch-flexy`), Theater-Button und Mutationen für den Kino-Modus.

```sh
npm test          # oder direkt: node test/run.js
npm run build     # ZIP: dist/video-speed-control-2026.11.4.zip
```

| Datei | Prüft |
| --- | --- |
| `test/harness.js` | Sandbox, Fake-Video mit echtem `ratechange`-Verhalten, Toast- und Storage-Mitschnitt |
| `test/rules.test.js` | Kanal-Link-/ID-Normalisierung, gültige Geschwindigkeiten, Migration und Regelpriorität |
| `test/channel-speed.test.js` | Kanalvorgaben und YouTube Kids: Hotkeys, Player-Änderungen, verzögerte Owner, SPA-Wechsel und Live-Einstellungen |
| `test/hotkey-guard.test.js` | Hotkeys greifen nicht in Eingabefelder ein (inkl. `contenteditable`, Shadow DOM, Seiten ohne Video) |
| `test/toggle.test.js` | Umschalten 1,00× ↔ gespeichert; Toast und tatsächliche Rate stimmen überein; Player-Overrides werden mit der *gewünschten* Rate bekämpft |
| `test/toggle-state.test.js` | Richtung des Umschalters: `R` führt aus jeder Ausgangsrate nach 1,00×, auch wenn die laufende Rate weder 1,00× noch die gespeicherte ist |
| `test/step-base.test.js` | Schrittweite ab der eigenen Auswahl, Player-Resets, unveränderte Vorgaben und Reset beim nächsten Video |
| `test/manual-override.test.js` | Temporäre Hotkey-/Player-Auswahl, Seek/Resume, neue Video-ID/Quelle/Element und spät gerenderte Owner |
| `test/seek.test.js` | Skip/Resume (`play`/`playing`/`seeking`/`seeked`/`loadedmetadata`) behält die eigene Auswahl (v. a. R-Temporär 1,00×), erneuert den Schutz, schreibt nichts zurück |
| `test/watchlater.test.js` | Später ansehen: breite Liste, Papierkorb pro Eintrag, Entfernen über YouTubes Menü, nur auf `list=WL`, Abschalten per Einstellung |
| `test/cinema.test.js` | Kino-Modus: setzt den YouTube-Theatermodus beim Laden, nach Navigation und nach manuellem Ausschalten immer wieder – respektiert die Einstellung und greift nur auf Watch-/Live-Seiten zu |

## Hinweise

- Benötigte Berechtigungen: `storage` (Einstellungen) + Zugriff auf alle Seiten (nur für Content Scripts).
- Buchstaben-Hotkeys lösen nicht bei Shift/Strg/Alt/Cmd aus, um versehentliche Treffer zu vermeiden; in Eingabefeldern (inkl. `contenteditable` und Feldern im Shadow DOM) sowie auf Seiten ohne Video sind die Hotkeys grundsätzlich inaktiv.
- Der Geschwindigkeits-Merkspeicher nutzt `chrome.storage.sync` und synchronisiert damit über angemeldete Chrome-Profile hinweg.

Autor: Vitus Schuhwerk · Lizenz: MIT
