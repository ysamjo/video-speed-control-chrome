# Chrome Web Store – Video Speed Control with Keyboard

Stand: 2026-11-02. Version 2026.11.2 ist für lokale Installation vorbereitet; keine Store-Einreichung vorgenommen.

## Store-Eintrag

Name: Video Speed Control with Keyboard

Kurzbeschreibung: Videotempo per Hotkey steuern, feste Geschwindigkeiten pro YouTube-Kanal verwalten und YouTube Kids auf 1,0× halten.

Beschreibung: Steuere die Geschwindigkeit von HTML-Videos mit frei wählbaren Tasten. Verwalte feste Ausnahmen für einzelne YouTube-Kanäle. sportstudio spielt standardmäßig mit 1,0-facher Geschwindigkeit; YouTube Kids bleibt auf Wunsch auf der gesamten Website bei 1,0×. Die Regeln gelten auch nach einem Videowechsel und haben Vorrang vor Tempoänderungen im Player. Ohne Ausnahme gilt dein gespeichertes Standardtempo. Optional bleibt auf YouTube der Kino-Modus aktiv. Bekannte Redirect-Zwischenseiten externer Links werden übersprungen.

Bedienung: Erweiterungssymbol anklicken, Kanal hinzufügen, Tempo eintragen und Einstellungen speichern.

Kategorie: Productivity. Sprache: Deutsch.

Zweck: Die Wiedergabegeschwindigkeit von Webvideos mit einem Standardtempo und festen Ausnahmen steuern.

## Grafiken

Die vorhandenen PNG-Icons unter `icons/` haben 16, 32, 48 und 128 Pixel. Store-Screenshots der neuen Kanalverwaltung sowie eine öffentliche Datenschutzerklärung müssen vor einer Store-Veröffentlichung ergänzt werden.

## Berechtigungen

| Berechtigung | Begründung |
| --- | --- |
| `storage` | Hotkeys, Standardtempo, Kanalregeln und Einstellungen speichern und über das angemeldete Chrome-Profil synchronisieren. |
| `<all_urls>` (Host-Zugriff und Content Scripts) | HTML-Videos auf beliebigen Websites und in eingebetteten Playern per Tastatur steuern; bekannte Weiterleitungslinks lokal zum Ziel auflösen. Kanalregeln werten nur den Video-Owner auf YouTube aus. |

Es kommen keine neuen Berechtigungen hinzu.

## Datenschutz

Kein eigener Server, keine Analyse, keine Werbung und keine Übermittlung an den Entwickler. Die Erweiterung liest die aktuelle Seitenadresse und die Kanalangabe des abgespielten Videos lokal zur Regelauswahl. Beim Speichern eines neuen Kanal-Handles oder Kanal-Links wird einmalig dessen öffentliche YouTube-Kanalseite ohne Anmelde-Cookies abgerufen, um Handle und Kanal-ID abzugleichen. YouTube erhält dabei die normale Webanfrage inklusive IP-Adresse. Bereits aufgelöste Regeln benötigen keinen weiteren Abruf. Es wird kein Wiedergabe- oder Browserverlauf gespeichert. Gespeicherte Einstellungen einschließlich selbst eingetragener Kanalregeln werden über Chrome Sync verarbeitet, wenn der Nutzer diese Funktion aktiviert hat.

Daten werden weder verkauft noch für andere Zwecke, Bonitätsprüfungen oder Kreditentscheidungen verwendet. Eine öffentliche Datenschutz-URL und die verbindlichen Store-Offenlegungen sind vor einer Einreichung einzutragen.

## Vertrieb und Anbieter

Aktuell: entpackte lokale Erweiterung und ZIP. Store-Sichtbarkeit und Regionen noch nicht festgelegt. Autor laut Manifest: Vitus Schuhwerk. Herausgeber und öffentliche Kontaktadresse vor einer Store-Einreichung bestätigen. Support: https://github.com/ysamjo/video-speed-control-chrome/issues

## Versionsverlauf

| Version | Datum | Änderung | Status |
| --- | --- | --- | --- |
| 2026.11.2 | 2026-11-02 | Feste Kanalregeln, sportstudio 1,0×, YouTube Kids 1,0×, Kanalverwaltung, SPA-Wechsel und Live-Übernahme | Lokal vorbereitet |

## Review-Hinweise

Ein @Handle oder eine Kanal-ID ist eindeutiger als ein Anzeigename; identische Anzeigenamen unterschiedlicher Kanäle sind möglich. Die Kanalerkennung verwendet sichtbare Owner-Links auf Watch-, Live-, Shorts-, mobilen und eingebetteten YouTube-Seiten; Veränderungen am YouTube-Layout können Anpassungen erfordern. Die Funktion zum Überspringen externer Redirect-Seiten gehört zum bestehenden Stand und ist bei einer Store-Einreichung im Zweck und in der Berechtigungsbegründung mit zu prüfen.
