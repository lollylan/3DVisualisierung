# Praxis-Kennzahlen im Raum

Sechs 3D-Diagramme für die Meta Quest 3, die per Mixed Reality im Kreis um dich im echten Raum schweben: Umsatz, HZV-Einschreibungen, Einnahmen und Ausgaben, Personal, Patientenstruktur und ein Benchmark einer Hausarztpraxis. Man geht von Station zu Station, greift die Diagramme mit den Händen, dreht sie und schaltet Ansichten um. Gebaut als Demo für Vorträge über KI in Arztpraxen.

**Live:** https://lollylan.github.io/3DVisualisierung/

Alle Zahlen sind **fiktive Demodaten** (siehe [Eigene Daten](#eigene-daten)).

---

## Bedienung

| Aktion | Hände | Controller | Desktop |
|---|---|---|---|
| Starten | Button „In den Raum holen“ | Button „In den Raum holen“ | – |
| Wert anzeigen | auf Balken zeigen, Daumen+Zeigefinger zusammen (Pinch) | Trigger | Klick |
| Ansicht wechseln | Pinch auf einen der Buttons links | Trigger | Klick oder Tasten `1`–`5` |
| Station wechseln | umdrehen, hingehen | dto. | Leiste oben, `←` `→`, Klick auf eine andere Station; `0` = Übersicht |
| Verschieben | Griff (Leiste vor dem Diagramm) pinchen und ziehen, oder direkt mit der Hand am Griff zugreifen | Trigger am Griff oder Grip-Taste irgendwo am Diagramm | – |
| Drehen | beim Halten des Griffs das Handgelenk drehen, **oder** den leuchtenden Ring pinchen und seitlich ziehen (dreht mit Schwung nach) | wie Hände, zusätzlich Thumbstick links/rechts | Maus ziehen (Kamera) |
| Auswahl aufheben | ins Leere pinchen oder denselben Balken erneut | Trigger ins Leere | Klick ins Leere, `Esc` |
| Wachstums-Animation erneut | Button „Neu aufbauen“ | dto. | `R` |
| Station nach vorne holen | Button „Vor mich holen“ an der Station: der ganze Kreis dreht sich um dich, diese Station steht vorne | dto. | – |
| Automatische Tour (für Video) | – | – | `T` (alle Ansichten aller Stationen, Kamera fährt mit) |

### Die Stationen

Die Stationen stehen im Kreis um den Startpunkt (1,42 m Radius bei sechs Stationen), jede mit eigenem Griff, Drehring und eigenen Buttons. Beim Start erscheinen sie nacheinander, vorne beginnend.

| Station | Ansichten |
|---|---|
| **Umsatz** | Umsatz gesamt · Scheinzahlen · HZV vs. KV · Umsatz je Schein · Kontakte je Stunde (Heatmap Wochentag × Uhrzeit) |
| **HZV** | Eingeschriebene nach Kasse (AOK, Ersatzkassen, BKK, Sonstige) · Neueinschreibungen (mit Abgängen) · HZV-Quote unter den GKV-Patienten · Fallwert je Kasse im Vergleich zum KV-Schein |
| **Finanzen** | Einnahmen & Ausgaben je Monat (Balken = Einnahmen, geteilt in Ausgaben und Überschuss) · Jahresrechnung als Wasserfall: Einnahmen → Kostenarten → Überschuss |
| **Personal** | Team in Vollzeitäquivalenten (Ärzt:innen, MFA, Azubis, Verwaltung) · Personalkostenquote · Fälle je MFA-Vollzeitstelle |
| **Patienten** | Versichertenstatus (GKV mit/ohne HZV, Privat) · Anteil Privatpatienten (Tooltip: Anteil am Umsatz) · Altersstruktur nach Frauen/Männern |
| **Benchmark** | Reifegrad in acht Feldern: Praxis vs. Ø Deutschland vs. beste 15 % · Online gebuchte Termine · Nicht wahrgenommene Termine |

Beim Umschalten morphen die Balken in die neue Form; wechselt das Raster (Heatmap, Jahresrechnung, Altersgruppen), ordnen sie sich neu an. Der Tooltip nennt den exakten Wert, die Aufteilung gestapelter Balken und den Vergleich zum Vorjahr (bei Anteilen in Prozentpunkten).

Die Demodaten erzählen eine kleine Geschichte: HZV wächst, der Ersatzkassen-Vertrag kommt 2024 dazu; eine MFA-Stelle ist im Sommer 2024 drei Monate unbesetzt; eine Weiterbildungsassistentin startet; Tarifsteigerungen treiben die Personalkostenquote; Online-Buchung wächst auf gut die Hälfte; eine SMS-Erinnerung senkt ab Juli 2024 die Terminausfälle deutlich.

---

## Test auf der Quest – Checkliste

**Vorbereitung (einmalig)**

- [ ] Handtracking an: *Einstellungen → Bewegungstracking → Hand- und Körpertracking* (bzw. „Hand-Tracking“) aktivieren. Die Hände übernehmen automatisch, sobald die Controller abgelegt werden.
- [ ] Raum/Boden eingerichtet (Grenze bzw. Raumeinrichtung). Die App braucht die Bodenhöhe, um das Diagramm auf Tischhöhe zu stellen.

**Ablauf**

1. [ ] Im **Meta-Quest-Browser** die URL öffnen: `https://lollylan.github.io/3DVisualisierung/`. Tipp: Als Lesezeichen speichern, oder den Link am Handy in der Meta-Horizon-App bzw. per Browser-Sync ans Headset schicken.
2. [ ] Auf **„In den Raum holen“** tippen. Die Nachfrage nach Zugriff auf Raum/Passthrough bzw. Handtracking **erlauben**.
3. [ ] Die Stationen erscheinen **im Kreis um dich auf Tischhöhe** (0,8 m, im Sitzen tiefer), die erste 1,4 m vor dir, die anderen nacheinander links und rechts. Einmal umdrehen: stehen alle sechs frei im Raum?
4. [ ] **Lesbarkeit:** Titel, Monate, Jahreszahlen und Achsenwerte aus 1–1,5 m gut lesbar?
5. [ ] **Pinch auf einen Balken:** Tooltip mit Wert und Vorjahresvergleich erscheint, der Balken leuchtet kupferfarben.
6. [ ] **Buttons links:** an jeder Station die Ansichten durchschalten. Die Balken sollen weich morphen, nicht springen.
7. [ ] **Griff:** Leiste vor dem Diagramm greifen und das Diagramm verschieben. Beim Halten das Handgelenk drehen, dann dreht sich das Diagramm mit.
8. [ ] **Ring:** den leuchtenden Ring am Rand pinchen und seitlich ziehen, loslassen, das Diagramm dreht mit Schwung nach.
9. [ ] **„Vor mich holen“** nach dem Herumlaufen: der Kreis gleitet um dich herum, die gewählte Station steht vorne. Lesbarkeit aus 1,4 m prüfen; falls zu klein: näher herangehen oder in `src/main.js` den Wert `RING_R` verkleinern.
10. [ ] **Flüssigkeit:** kein Ruckeln beim Morphen und Greifen. Genaue Messung optional mit dem *OVR Metrics Tool* oder dem Performance-Overlay im *Meta Quest Developer Hub* (Ziel: stabile 72 fps).
11. [ ] Mit dem **Controller** kurz gegentesten (Trigger, Grip-Taste, Stick).
12. [ ] Beenden über die Meta-Taste bzw. die Browser-Geste; zurück auf der Seite läuft die Desktop-Ansicht weiter.

Wenn etwas hakt, bitte notieren, **was** passiert ist und **wo** (z. B. „Tooltip bei HZV-Ansicht zu klein“).

---

## Im Vortrag

### Quest-Bild auf Laptop/Beamer bringen

- **Casting über WLAN (Standard):** Laptop und Quest im **selben WLAN**. Am Laptop in Chrome/Edge `https://www.oculus.com/casting` öffnen und anmelden. In der Quest: *Schnelleinstellungen → Teilen/Streamen („Cast“) → Computer* wählen. Alternativ in der Meta-Horizon-App am Handy starten. Der Laptop-Browser dann im Vollbild auf den Beamer.
- **Casting per USB-Kabel (ohne WLAN):** Mit dem **Meta Quest Developer Hub** (kostenlos, Entwicklermodus nötig) lässt sich das Bild über USB-C auf den Laptop streamen. Das ist die robusteste Variante, wenn man vorher einmal den Entwicklermodus eingerichtet hat. Alternativ: `scrcpy` über USB.
- Ob Passthrough im Cast mit angezeigt wird, hängt von der Quest-Software ab. **Vorher einmal testen.** Falls nur das Diagramm vor Schwarz erscheint, wirkt das auf dem Beamer übrigens auch gut.

### Was vor Ort schiefgehen kann

| Problem | Gegenmittel |
|---|---|
| Hotel-/Kongress-WLAN blockiert Geräte untereinander (Client-Isolation) → Casting findet den Laptop nicht | **Eigenen Hotspot** mitbringen (Handy oder Reiserouter, am besten 5 GHz) und Laptop + Quest dort einbuchen. Oder USB-Casting. |
| Kein/instabiles Internet | Die Seite wird nach dem ersten Laden **offline gecacht** (Service Worker). Also vorher im Hotel **einmal öffnen und „In den Raum holen“ antippen**, dann läuft sie auch ohne Netz. Die Quest-Browser-Registerkarte offen lassen. |
| Handtracking unzuverlässig (Bühnenlicht, sehr dunkler Raum, Gegenlicht) | Controller griffbereit halten, das funktioniert parallel. |
| Stationen stehen ungünstig (Wand, Tisch, Publikum) | Button **„Vor mich holen“** an der gewünschten Station, oder einzelne Stationen am Griff wegziehen. |
| Casting-Verzögerung (ca. 0,3–1 s) | Bewegungen etwas langsamer als gewohnt, dem Publikum ansagen, was gleich passiert. |
| Akku | Quest voll geladen, Laptop am Netz. Casting kostet Akku. |
| Nichts geht mehr | **Backup-Video** abspielen (siehe unten). |

### Backup-Video (dringend empfohlen)

Vorher aufnehmen, damit der Vortrag nicht an der Technik hängt:

1. **In der Quest:** *Meta-Taste → Kamera → Video aufnehmen*. Das nimmt die Mixed-Reality-Ansicht auf. Danach über die Meta-Horizon-App oder per USB auf den Laptop holen.
2. **Am Desktop:** Seite im Browser öffnen, Taste **`T`** startet eine automatische Tour (Kamera pendelt leicht, Ansichten wechseln alle 6,5 s, zwischen den Stationen fährt die Kamera weiter; ein Durchlauf dauert gut zwei Minuten). Mit OBS oder der Windows-Spieleleiste (`Win` + `Alt` + `R`) aufnehmen.

---

## Eigene Daten

Alle Zahlen stehen in **`data.json`**. Die App liest nur diese Datei, der Code muss nicht angefasst werden.

```jsonc
{
  "meta": { "title": "Hausarztpraxis – Demodaten", "note": "Fiktive Zahlen", "currency": "EUR" },
  "settings": {
    "indexMode": false          // true = Werte als Index, Ø des ersten Jahres = 100 %
  },
  "years": [2023, 2024, 2025],  // optional, sonst aus "monthly" abgeleitet (1–4 Jahre sinnvoll)
  "monthly": [
    { "year": 2023, "month": 1, "umsatz_hzv": 28598, "umsatz_kv": 39052, "umsatz_privat": 7771, "scheine": 1265 }
    // … ein Eintrag je Monat
  ],
  "heatmap": {                   // optional; ohne Heatmap entfällt der fünfte Button
    "title": "Patientenkontakte je Stunde",
    "unit": "Kontakte (Ø pro Woche)",
    "days": ["Mo", "Di", "Mi", "Do", "Fr"],
    "hours": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    "values": [[16.8, 40.6, …], …]   // je Tag eine Zeile, je Stunde ein Wert
  }
}
```

| Feld | Bedeutung | Verwendet in |
|---|---|---|
| `umsatz_hzv` | Umsatz aus Hausarztzentrierter Versorgung, € | Umsatz gesamt, HZV vs. KV, Umsatz je Schein |
| `umsatz_kv` | Umsatz aus KV-Abrechnung, € | wie oben |
| `umsatz_privat` | Privat/IGeL/Sonstiges, € (optional, sonst 0) | Umsatz gesamt, Umsatz je Schein |
| `scheine` | Behandlungsfälle im Monat | Scheinzahlen, Umsatz je Schein |
| `hzv_aok`, `hzv_ek`, `hzv_bkk`, `hzv_sonstige` | HZV-Eingeschriebene je Kasse am Monatsende | HZV |
| `hzv_neu`, `hzv_abgaenge` | Neueinschreibungen und Abgänge im Monat | HZV |
| `pat_hzv`, `pat_gkv`, `pat_privat` | Behandelte Patienten im Monat: GKV mit HZV, GKV ohne HZV, Privat | HZV-Quote, Patienten |
| `kosten_personal`, `kosten_raum`, `kosten_material`, `kosten_it`, `kosten_beitraege`, `kosten_sonstige` | Ausgaben je Kostenart, € | Finanzen, Personalkostenquote |
| `vza_aerzte`, `vza_mfa`, `vza_azubi`, `vza_verwaltung` | Vollzeitäquivalente (Dezimalzahl) | Personal |
| `termine_gesamt`, `termine_online`, `termine_ausfall` | Termine im Monat, davon online gebucht bzw. nicht wahrgenommen | Benchmark |

Außerdem, alle optional: `altersstruktur` (Patienten je Altersgruppe und Jahr, Frauen/Männer), `fallwerte` (HZV-Fallwert je Kasse und Jahr, letzte Spalte = KV zum Vergleich) und `benchmark` (Reifegrad 0–100 je Feld für Praxis, Durchschnitt, beste 15 %). Die Struktur zeigt die mitgelieferte `data.json`.

- **Fehlt ein Feld, verschwindet nur die zugehörige Ansicht**; eine Station ohne Ansichten verschwindet ganz. Eine alte `data.json` mit nur den vier Umsatzfeldern zeigt also genau eine Station wie früher.
- **Umsatz gesamt** = HZV + KV + privat = Einnahmen. **Umsatz je Schein** = Umsatz gesamt ÷ Scheine. **Überschuss** = Einnahmen − Summe der Kostenarten.
- Fehlende Monate sind erlaubt: Sie erscheinen als leerer Platz, der Tooltip sagt „keine Daten“.
- **Index-Schalter:** `"indexMode": true` in `data.json`. Zum schnellen Ausprobieren geht auch `?index=1` an der URL (`?index=0` schaltet ab).

### Aus Excel/CSV übernehmen

```bash
node tools/csv-to-json.mjs meine-monatswerte.csv
```

```bash
node tools/csv-to-json.mjs meine-monatswerte.csv --heatmap meine-heatmap.csv
```

Vorlagen liegen in [`beispiele/`](beispiele/) (`monatswerte.csv` enthält alle Spalten der Demodaten). Trennzeichen `;` oder `,`, Kopfzeile mindestens `jahr;monat;umsatz_hzv;umsatz_kv;umsatz_privat;scheine`, weitere Spalten wie in der Tabelle oben. Deutsche Zahlenformate („28.650“ oder „28650,50“) werden verstanden. Das Skript überschreibt `data.json` und behält Einstellungen und Titel bei. Danach committen und pushen, GitHub Pages aktualisiert sich nach ca. 1 Minute.

Die Demodaten selbst erzeugt `node tools/generate-demo-data.mjs` (Saisonalität: Infektwelle im Winter, Sommerloch Juli/August, Quartalseffekte durch Chroniker-Pauschalen am Quartalsanfang, wachsender HZV-Anteil, Jahressonderzahlung im November, Personalwechsel). Welche Kennzahlen es gibt, ist an ein echtes Praxis-Controlling angelehnt; **alle Werte sind erfunden**.

> **Datenschutz:** Die Seite ist öffentlich. Echte Praxiszahlen gehören nur in ein privates Repo bzw. nur lokal auf den Rechner, nicht auf das öffentliche GitHub Pages.

---

## Entwicklung

Keine Build-Schritte. Node wird nur für den lokalen Server und die Tests gebraucht.

```bash
npm install
```

```bash
npm run serve
```

Dann `http://localhost:8080/` öffnen. (Die Seite nicht per Doppelklick als Datei öffnen: `data.json` lässt sich dann nicht laden.)

### Tests

```bash
npm test
```

Playwright/Chromium: Desktop- und Handy-Ansicht, alle Stationen per Pfeiltaste abfahren, an jeder ein echter Mausklick auf einen Balken, alle Ansichten durchschalten, Stationen-Leiste und Übersicht, keine Konsolenfehler. Screenshots landen in `test-results/`.

```bash
npm run test:xr
```

Simuliert eine **Meta Quest 3** mit Metas WebXR-Emulations-Runtime ([iwer](https://github.com/meta-quest/immersive-web-emulation-runtime), die Basis des Immersive Web Emulators): AR-Session starten, Kreis der Stationen um den Kopf auf Tischhöhe prüfen, per Controller-Trigger Button und Balken wählen (auch an der Nachbarstation), „Vor mich holen“, per Hand-Pinch den Griff ziehen und am Ring drehen.

### Mit dem Immersive Web Emulator testen (manuell)

1. In Chrome oder Edge die Erweiterung **„Immersive Web Emulator“** (Meta) aus dem Chrome Web Store installieren.
2. `npm run serve`, `http://localhost:8080/` öffnen, DevTools (`F12`) öffnen, Reiter **WebXR**.
3. Gerät **Meta Quest 3** wählen und die Seite neu laden. Der Button „In den Raum holen“ wird aktiv.
4. Im Emulator-Panel Controller bzw. **Hände** (Input-Modus umschalten) bewegen und Trigger/Pinch auslösen. Für den AR-Hintergrund kann eine synthetische Raumumgebung gewählt werden.

`localhost` gilt als sichere Umgebung, deshalb funktioniert WebXR lokal auch ohne HTTPS. Auf der echten Quest bitte immer die GitHub-Pages-Adresse nutzen.

### Deployment

GitHub Pages veröffentlicht direkt aus dem Branch `main` (Wurzelverzeichnis, Einstellung *Settings → Pages → Deploy from a branch*). Jeder Push ist nach ca. 1 Minute unter **https://lollylan.github.io/3DVisualisierung/** live. Die leere Datei `.nojekyll` sorgt dafür, dass GitHub die Dateien unverändert ausliefert.

Warum keine GitHub Action? Für das Konto sind GitHub Actions derzeit deaktiviert („Actions has been disabled for this user“), deshalb die Branch-Variante. Sie braucht keine Action und reicht für eine statische Seite völlig.

---

## Technische Entscheidungen

- **Three.js pur, eine `index.html` + ES-Module per Importmap (jsDelivr, Version fest auf 0.186.1).** Kein Build, kein Bundler. Änderungen an Daten oder Code sind sofort live, und die Seite bleibt klein. React Three Fiber + @react-three/xr würde einen Build-Schritt und mehr Abhängigkeiten bringen, ohne bei einer einzelnen Szene dieser Größe etwas zu gewinnen.
- **Je Station ein `InstancedMesh` für alle Balken** (1 Draw-Call) mit eigenem Shader: Verlauf nach oben, leuchtende Kanten, Kupfer-Hervorhebung bei Auswahl. Kein Bloom/Post-Processing. Rund 40 Draw-Calls je Station; was außerhalb des Blickfelds liegt, fällt weg.
- **Stationen:** `src/stations.js` beschreibt jede Ansicht nur als „welche Werte liefert ein Monat, wie heißen sie“. `data.js` baut daraus das Modell (bis zu vier gestapelte Segmente, schwebende Blöcke für den Wasserfall, Kategorien × Jahre). Neue Kennzahl = neuer Eintrag dort, am Diagramm-Code ändert sich nichts.
- **Farben der Datenreihen:** Petrol, Kupfer, Ocker, Violett in fester Reihenfolge; die mittlere Stufe ist auf Farbsehschwäche, Unterscheidbarkeit und Kontrast zum dunklen Sockel geprüft. Innerhalb einer Reihe: älteres Jahr dunkler.
- **Morphing:** Jede Instanz hat Position, Größe und Farbe. Beim Umschalten wird von der aktuellen zur neuen Form interpoliert, gestaffelt als Welle von links nach rechts. Gestapelte Segmente (HZV/KV) und die Heatmap-Kacheln nutzen denselben Instanzen-Pool, dadurch „fließen“ die Balken auch ins andere Raster.
- **Text:** auf Canvas gezeichnet (Schrift *Barlow*, lokal eingebunden), als Textur mit Mipmaps. Keine zusätzliche Text-Bibliothek, keine Abhängigkeit von Schrift-CDNs. Achsenbeschriftungen drehen sich zum Betrachter.
- **Eingabe:** Hände und Controller laufen beide über die WebXR-`select`-Events (Pinch = Trigger). Treffer auf Balken werden mit leicht vergrößerten Boxen berechnet, damit das Zielen mit der Hand verzeiht. Direktes Anfassen des Griffs erkennt die Fingerspitzen.
- **Platzierung:** Referenzraum `local-floor`. Die Stationen stehen im Kreis um den Kopf (1,3 m Radius bis fünf, 1,42 m bei sechs Stationen), jede zur Mitte gedreht, auf 0,8 m Höhe, aber immer mindestens 0,5 m unter Augenhöhe (Sitzen). Bei nur einer Station wie früher 1,05 m vor dem Kopf.
- **Farben:** Petrol (#025669) und Kupfer (#BB4E26) aus dem Praxis-CI, für den dunklen, durchscheinenden Raum in hellere, leuchtende Abstufungen desselben Farbtons übersetzt. Jahre: dunkel → hell (aktuelles Jahr am hellsten, hinten).
- **Offline:** Ein Service Worker cacht App, Schriften, Daten und three.js nach dem ersten Besuch.
- **Framebuffer-Skalierung 1,2** für schärferen Text, bei der kleinen Szene ohne Risiko für 72 fps.

## Projektstruktur

```
index.html              Seite, Importmap, Desktop-Overlay
data.json               Daten (austauschbar)
sw.js                   Offline-Cache
src/main.js             Renderer, Stationen im Kreis, Desktop/XR, Kamerafahrten, Tastatur, Tour
src/stations.js         Die sechs Stationen und ihre Ansichten (was wird gezeigt, wie beschriftet)
src/chart.js            Diagramm: Sockel, Balken, Achsen, Titel, Tooltip, Griff, Ring
src/barMaterial.js      Shader der Balken
src/data.js             Daten laden, Modelle aus Ansichten bauen, Index-Modus, Tooltip-Bausteine
src/panel.js            Schwebende Buttons
src/input.js            Hände, Controller, Maus; Greifen und Drehen
src/text.js             Canvas-Text im Raum
src/theme.js            Farben, Schrift, Zahlenformate
tools/                  Demodaten-Generator, CSV-Import, lokaler Server
tests/                  Playwright-Tests (Desktop und emulierte Quest 3)
beispiele/              CSV-Vorlagen
```

## Offen / Ideen

- Real auf der Quest 3 getestet werden muss noch: Lesbarkeit, Handtracking-Präzision beim Pinchen kleiner Balken, fps.
- Zweihändiges Skalieren (auseinanderziehen = größer) wäre ein weiterer Wow-Moment.
- Zeitachse animieren (Monat für Monat „abspielen“).
