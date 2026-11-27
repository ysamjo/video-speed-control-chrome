# Video Speed Control with Keyboard (Chrome Extension)

Portierung des Userscripts „Video Speed Control with Keyboard" als Chrome-Erweiterung (Manifest V3).

## Kanalvorgaben und manuelles Tempo (2026.11.5)

Klick auf das Erweiterungssymbol öffnet die Verwaltung. Unter **Standardgeschwindigkeit pro Kanal** lassen sich Kanäle hinzufügen, bearbeiten und entfernen. Trage vorzugsweise den **@Handle** (z. B. `@sportstudio`) oder den vollständigen YouTube-Kanal-Link ein, wähle das Tempo und klicke auf **Einstellungen speichern**. Auch Kanal-IDs und exakte Anzeigenamen sind möglich; Handles und IDs vermeiden Verwechslungen bei gleichen Namen. Beim Speichern eines neuen Kanal-Links werden Handle und Kanal-ID einmalig über die öffentliche YouTube-Kanalseite abgeglichen; ein Server oder API-Schlüssel ist nicht nötig.

- **1,0× voreingestellt** für 54 Sportkanäle (jeweils mit Kanal-ID als Alias, damit auch Umbenennungen des Handles greifen):
  - **Deutsche Sender:** `@sportstudio`, `@sportschau`, `@skysport`, `@skysportde`, `@skysportaustria`, `@skysportpremierleague`, `@dazn`, `@daznde`, `@daznfussball`, `@daznuefachampionsleague`, `@rtlsport`, `@primevideosportde`, `@eurosportdeutschland`, `@sport1`, `@ransport`, `@kicker`, `@magentasport`, `@servustv`, `@sportbuzzer`, `@transfermarkt`
  - **Deutsche Ligen und Verbände:** `@bundesliga`, `@dfb`, `@hbl`, `@basketballbundesliga`, `@pennydel`, `@officialpdc`, `@teamdeutschland`
  - **Internationale Ligen und Wettbewerbe:** `@uefa`, `@premierleague`, `@laliga`, `@seriea`, `@ligue1`, `@fifa`, `@olympics`, `@skysports`, `@tntsports`, `@espn`
  - **US-Sport:** `@nfl`, `@nba`, `@mlb`, `@nhl`, `@ufc`, `@nascar`, `@indycar`
  - **Motorsport und Radsport:** `@formula1`, `@motogp`, `@wrc`, `@letourdefrance`, `@giroditalia`
  - **Tennis:** `@atptour`, `@wimbledon`, `@usopen`, `@rolandgarros`, `@australianopen`
- **YouTube Kids: 1,0×** ist das Starttempo für alle Videos auf `youtubekids.com`. Die Website-Regel ist separat abschaltbar und hat den höchsten Vorrang.
- Kanalregeln erkennen den Kanal des tatsächlich abgespielten Videos auf Watch-, Live-, Shorts-, mobilen und eingebetteten YouTube-Seiten. Bei gemeinsamen Uploads ohne Owner-Link werden die öffentlichen YouTube-Videodaten einmalig abgerufen, um den veröffentlichenden Hauptkanal zu ermitteln. Videotitel, Empfehlungen und Suchparameter lösen keine Kanalregel aus.
- Kanal- und Kids-Regeln bestimmen das Starttempo. **S / D ändern das Tempo und merken es nach einer halben Sekunde als neues Standardtempo** (auch über Kanäle hinweg, in allen Tabs). **R und Auswahlen im Player-Menü gelten nur für das aktuelle Video.** Pausieren, Fortsetzen und Spulen behalten die Auswahl. **Beim nächsten Video gilt die passende Kanal-/Kids-Regel, sonst das zuletzt per S / D gewählte Standardtempo**, auch wenn YouTube das Videoelement wiederverwendet. Kanal- und Kids-Vorgaben bleiben unverändert; dauerhafte Kanaländerungen erfolgen in den Einstellungen.
- Ohne Treffer gilt das Standardtempo; Kanalregeln haben Vorrang vor bisherigen URL-Regeln. Innerhalb einer Regelart gewinnt die erste passende Regel. Individuelle alte URL-Regeln bleiben erhalten; der alte Beispielwert `sport = 1.1` wird durch `@sportstudio = 1.0` ersetzt. Änderungen greifen nach dem Speichern auch in offenen Tabs.
- **Diagnose:** Die Optionsseite zeigt unter **Erkannter Kanal** für alle offenen YouTube-Tabs den erkannten Kanal, die greifende Regel und das aktuelle Tempo. So lässt sich prüfen, ob Handle, Alias oder Sonderfall korrekt erkannt werden.

Das alte Userscript in Tampermonkey/Violentmonkey für diese Websites deaktivieren, damit nicht zwei Geschwindigkeitssteuerungen gegeneinander arbeiten.

## Funktionen

- **Hotkeys** steuern die Abspielgeschwindigkeit (Standard):
  - **S** – langsamer (Schrittweite 0,1 ab der Auswahl für dieses Video; wird als neues Standardtempo gemerkt)
  - **D** – schneller (Schrittweite 0,1 ab der Auswahl für dieses Video; wird als neues Standardtempo gemerkt)
  - **R** – schaltet immer auf **1.00×**; steht das Video bereits auf 1.00×, geht es zurück auf die letzte Auswahl dieses Videos beziehungsweise dessen Startvorgabe. Das gemerkte Standardtempo bleibt unverändert. Liegen Auswahl und Vorgabe bei 1,00×, gibt es nichts umzuschalten.
- **Einstellungsmenü** (Optionsseite): Alle drei Hotkeys sind frei definierbar (je genau ein Zeichen), zusätzlich können die gespeicherte Geschwindigkeit, die native KI-Zusammenfassung und der Kino-Modus eingestellt werden. Klick auf das Toolbar-Symbol öffnet die Einstellungen. Änderungen greifen sofort in allen offenen Tabs (`chrome.storage.sync`); per S / D geänderte Tempi erscheinen auch in einer bereits geöffneten Einstellungsseite. Ein ausstehender S/D-Schritt wird beim Neuladen oder Schließen des Tabs sofort geschrieben, statt verloren zu gehen.
- Das gespeicherte Standardtempo (aus den Einstellungen oder zuletzt per S / D gewählt) wird bei neuen Videos angewendet, sofern keine Kanal-/Kids-Regel passt. R und die Auswahl im Player-Menü gelten nur für das laufende Video. Automatische Player-Resets nach Hotkeys, Spulen und Fortsetzen werden abgefangen. Auf YouTube gilt das auch für späte interne Tempo-Resets nach einem Videowechsel; eine bewusste Auswahl im Speed-Menü oder über dessen Regler bleibt möglich.
- **Native Dunkelansicht immer aktiv (YouTube)**: YouTube wird beim Laden in seiner eigenen Dunkelansicht geöffnet. Die Erweiterung setzt YouTubes native Vorgabe und `html[dark]`, erhält vorhandene `PREF`-Werte bei und greift nach SPA-Navigation oder Theme-Rücksetzungen erneut ein. Andere Websites und YouTube Kids bleiben unverändert; es gibt keinen zusätzlichen Schalter.
- **YouTube-KI-Zusammenfassung**: Auf Watch-Seiten kann die Erweiterung die vorhandene native KI-Zusammenfassung von YouTube automatisch öffnen. Sie klappt zuerst die Beschreibung aus, wartert auf YouTubes Rendering und betätigt dann den nativen Zusammenfassungs-Auslöser. Fehlt die Zusammenfassung, wird die Beschreibung nach kurzer Prüfung wieder eingeklappt. In den Einstellungen abschaltbar, Standard: **aus**.
- **Kino-Modus immer aktiv (YouTube)**: Auf Watch- und Live-Seiten (`youtube.com/watch`, `/live/…`) wird der **Theatermodus** automatisch eingeschalten – der Player wird breit, aber nicht vollbild. Erkennung über `ytd-watch-flexy[theater]`, Umschalten über den `.ytp-size-button` (Fallback: Button-Text in lokaler Sprache). Wird der Modus von YouTube zurückgesetzt oder manuell ausgeschaltet, wird er nachgesetzt (MutationObserver + `yt-navigate-finish` decken YouTubes SPA-Navigation ab, 250 ms Debounce und 0,9 s Schutzfrist verhindern Hin-und-Her-Klicken). In den Einstellungen abschaltbar, Standard: **an**.
- **Playlist-Laufzeit**: Auf YouTube-Playlisten zeigt die Erweiterung unten links die Laufzeit der geladenen Videos sowie bereits gesehene und verbleibende Zeit an. Videos ohne erkennbare Laufzeit werden in der Gesamtzeit nicht berücksichtigt und separat gezählt. Abschaltbar, Standard: **an**.
- **Zeitstempel-Knopf**: Auf YouTube-Videoseiten kopiert ein zusätzlicher Knopf einen Link ab der aktuellen Wiedergabestelle. Abschaltbar, Standard: **an**.
- **Später ansehen aufräumen** (`youtube.com/playlist?list=WL`): Die linke Playlist-Karte mit Cover und Titel verschwindet, die Liste nutzt die volle Breite, und **„Alle abspielen“/„Zufallsmix“ stehen über der Liste**. Hinweise wie „Kommt es zu Unterbrechungen?“ werden ausgeblendet. Jeder Eintrag bekommt links neben dem Drei-Punkte-Menü einen **Papierkorb**, der das Video ohne Umweg über das Menü aus „Später ansehen“ entfernt (nutzt YouTubes eigenen Menüpunkt, löscht also nur den Listeneintrag, nicht das Video). In den Einstellungen abschaltbar, Standard: **an**.
- Kurzer Toast oben rechts zeigt die aktuelle Geschwindigkeit (funktioniert auch im Vollbild).
- YouTubes Hinweis „Kommt es zu Unterbrechungen?“ („Experiencing interruptions?“) wird auf YouTube-Seiten ausgeblendet – in der alten Toast- und der neuen Snackbar-Darstellung.
- **Redirect-Seiten überspringen**: Externe Links, die über bekannte Weiterleitungs-Interstitials laufen, werden direkt zum Ziel geführt – beim Klick (href wird entwirrt, gilt auch für „in neuem Tab öffnen") und als Fallback beim Laden der Redirect-Seite selbst. Abgedeckt: Google `/url?q=`, Bing `/ck/a`, Facebook `l.php`, Instagram `l.instagram.com`, Steam `linkfilter`, DuckDuckGo `uddg`, Reddit `out.reddit.com`, X/Twitter `/i/redirect`, `href.li`.

## Installation (Chrome / Edge / Brave)

1. `chrome://extensions` öffnen
2. Rechts oben **Entwicklermodus** aktivieren
3. **Entpackte Erweiterung laden** → diesen Ordner auswählen

## Dateien

| Datei | Zweck |
| --- | --- |
| `manifest.json` | Manifest V3 (Content Scripts, Optionsseite, Storage) |
| `content.js` | Geschwindigkeitssteuerung + konfigurierbare Hotkeys + native YouTube-Dunkelansicht + optionale KI-Zusammenfassung + Kino-Modus |
| `rules.js` | Gemeinsame Kanalnormalisierung, Owner-Erkennung und Regelpriorität |
| `channels.json` | Kanonischer Kanal-Katalog; `test/channel-catalog.test.js` gleicht `rules.js` dagegen ab |
| `content-redirect.js` | Entwirrt Redirect-Links und überspringt Redirect-Seiten |
| `watch-later.js` | Räumt `youtube.com/playlist?list=WL` auf: breite Liste, Papierkorb pro Eintrag |
| `playlist-tools.js` | Playlist-Laufzeit und Zeitstempel-Knopf auf YouTube |
| `background.js` | Öffnet die Einstellungen beim Toolbar-Klick |
| `options/` | Einstellungsseite für Kanäle, YouTube Kids, Standardtempo und Hotkeys |
| `icons/` | Toolbar- und Store-Icons |
| `test/` | Regressionstests (laufen ohne Browser, siehe unten) |

## Tests

Die Tests brauchen keinen Browser: Sie laden `content.js` in eine `node:vm`-Sandbox mit
Minimal-DOM und simulieren Tastendrücke, `ratechange`-Events (asynchron, wie der Browser),
das 1,5-s-Enforce-Fenster über eine steuerbare Uhr sowie YouTubes Watch-Container
(`ytd-watch-flexy`), Theater-Button, Beschreibungs-Ausklappung, natives Summary-Rendering und Mutationen für den Kino-Modus.

```sh
npm test          # oder direkt: node test/run.js
npm run build     # ZIP: dist/video-speed-control-2026.11.10.zip
```

GitHub Actions führt bei Push auf `main` und bei Pull Requests `npm test` und `npm run build` aus (`.github/workflows/ci.yml`).

| Datei | Prüft |
| --- | --- |
| `test/harness.js` | Sandbox, Fake-Video mit echtem `ratechange`-Verhalten, Toast- und Storage-Mitschnitt |
| `test/rules.test.js` | Kanal-Link-/ID-Normalisierung, gültige Geschwindigkeiten, Migration und Regelpriorität |
| `test/channel-catalog.test.js` | `channels.json` gegen `rules.js` und (falls vorhanden) gegen die Morphe-TV-Vorgaben |
| `test/channel-speed.test.js` | Kanalvorgaben und YouTube Kids: Hotkeys, Player-Änderungen, verzögerte Owner, SPA-Wechsel und Live-Einstellungen |
| `test/hotkey-guard.test.js` | Hotkeys greifen nicht in Eingabefelder ein (inkl. `contenteditable`, Shadow DOM, Seiten ohne Video) |
| `test/toggle.test.js` | Umschalten 1,00× ↔ gespeichert; Toast und tatsächliche Rate stimmen überein; Player-Overrides werden mit der *gewünschten* Rate bekämpft |
| `test/toggle-state.test.js` | Richtung des Umschalters: `R` führt aus jeder Ausgangsrate nach 1,00×, auch wenn die laufende Rate weder 1,00× noch die gespeicherte ist |
| `test/step-base.test.js` | Schrittweite ab der eigenen Auswahl, Player-Resets und Übernahme des Schritttempos beim nächsten Video |
| `test/save-speed.test.js` | S / D schreiben das Tempo träge als Standardtempo (eine Schreibung pro Folge, kein Schreiben bei Rückkehr zum Ausgangswert), R speichert nichts |
| `test/manual-override.test.js` | Temporäre Hotkey-/Player-Auswahl, Seek/Resume, neue Video-ID/Quelle/Element und spät gerenderte Owner |
| `test/seek.test.js` | Skip/Resume (`play`/`playing`/`seeking`/`seeked`/`loadedmetadata`) behält die eigene Auswahl (v. a. R-Temporär 1,00×), erneuert den Schutz, schreibt nichts zurück |
| `test/watchlater.test.js` | Später ansehen: breite Liste, Papierkorb pro Eintrag, Entfernen über YouTubes Menü, nur auf `list=WL`, Abschalten per Einstellung |
| `test/playlist-tools.test.js` | Playlist-Laufzeit und Zeitstempel-Link: nur auf YouTube, Abschalten per Einstellung |
| `test/options-playlist-tools.test.js` | Optionsseite: Standardwerte, gespeicherte Auswahl und Zurücksetzen der beiden Werkzeuge |
| `test/cinema.test.js` | Kino-Modus: setzt den YouTube-Theatermodus beim Laden, nach Navigation und nach manuellem Ausschalten immer wieder – respektiert die Einstellung und greift nur auf Watch-/Live-Seiten zu |
| `test/youtube-dark.test.js` | Native Dunkelansicht: setzt und erhält YouTubes Vorgabe, aktiviert `html[dark]`, bleibt nach SPA-Navigation dunkel und greift nicht außerhalb von YouTube |
| `test/youtube-ai-summary.test.js` | Optionale native KI-Zusammenfassung: Standard aus, Watch-Seiten, spätes Rendering, SPA-Wechsel und Live-Schalten |
| `test/options-ai-summary.test.js` | Einstellungsseite: Standardwert, gespeicherten Zustand, Speichern und Zurücksetzen der KI-Zusammenfassung |

## Hinweise

- Benötigte Berechtigungen: `storage` (Einstellungen) + Zugriff auf alle Seiten (nur für Content Scripts).
- Buchstaben-Hotkeys lösen nicht bei Shift/Strg/Alt/Cmd aus, um versehentliche Treffer zu vermeiden; in Eingabefeldern (inkl. `contenteditable` und Feldern im Shadow DOM) sowie auf Seiten ohne Video sind die Hotkeys grundsätzlich inaktiv.
- Der Geschwindigkeits-Merkspeicher nutzt `chrome.storage.sync` und synchronisiert damit über angemeldete Chrome-Profile hinweg.

Autor: Vitus Schuhwerk · Lizenz: MIT
