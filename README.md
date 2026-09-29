# Praxis-Kennzahlen im Raum

Ein 3D-Diagramm für die Meta Quest 3, das per Mixed Reality im echten Raum schwebt: Umsatz, Scheinzahlen, HZV-Anteil und Sprechstunden-Auslastung einer Hausarztpraxis. Die Balken greift man mit den Händen, dreht sie und schaltet Ansichten um. Gebaut als kurzes Demo für Vorträge über KI in Arztpraxen.

**Live:** https://lollylan.github.io/3DVisualisierung/

Alle Zahlen sind **fiktive Demodaten** (siehe [Eigene Daten](#eigene-daten)).

---

## Bedienung

| Aktion | Hände | Controller | Desktop |
|---|---|---|---|
| Starten | Button „In den Raum holen“ | Button „In den Raum holen“ | – |
| Wert anzeigen | auf Balken zeigen, Daumen+Zeigefinger zusammen (Pinch) | Trigger | Klick |
| Ansicht wechseln | Pinch auf einen der Buttons links | Trigger | Klick oder Tasten `1`–`5` |
| Verschieben | Griff (Leiste vor dem Diagramm) pinchen und ziehen, oder direkt mit der Hand am Griff zugreifen | Trigger am Griff oder Grip-Taste irgendwo am Diagramm | – |
| Drehen | beim Halten des Griffs das Handgelenk drehen, **oder** den leuchtenden Ring pinchen und seitlich ziehen (dreht mit Schwung nach) | wie Hände, zusätzlich Thumbstick links/rechts | Maus ziehen (Kamera) |
| Auswahl aufheben | ins Leere pinchen oder denselben Balken erneut | Trigger ins Leere | Klick ins Leere, `Esc` |
| Wachstums-Animation erneut | Button „Neu aufbauen“ | dto. | `R` |
| Diagramm wieder vor sich holen | Button „Vor mich holen“ | dto. | – |
| Automatische Tour (für Video) | – | – | `T` |

Ansichten: **Umsatz gesamt** · **Scheinzahlen** · **HZV vs. KV** (gestapelt, Tooltip zeigt Anteile) · **Umsatz je Schein** · **Kontakte je Stunde** (Heatmap Wochentag × Uhrzeit; Stoßzeiten in Kupfer). Beim Umschalten morphen die Balken in die neue Form; beim Wechsel zur Heatmap ordnen sie sich zu einem neuen Raster um.

Der Tooltip nennt den exakten Wert und den Vergleich zum Vorjahresmonat (bei HZV vs. KV die Veränderung des HZV-Anteils in Prozentpunkten).

---

## Test auf der Quest – Checkliste

**Vorbereitung (einmalig)**

- [ ] Handtracking an: *Einstellungen → Bewegungstracking → Hand- und Körpertracking* (bzw. „Hand-Tracking“) aktivieren. Die Hände übernehmen automatisch, sobald die Controller abgelegt werden.
- [ ] Raum/Boden eingerichtet (Grenze bzw. Raumeinrichtung). Die App braucht die Bodenhöhe, um das Diagramm auf Tischhöhe zu stellen.

**Ablauf**

1. [ ] Im **Meta-Quest-Browser** die URL öffnen: `https://lollylan.github.io/3DVisualisierung/`. Tipp: Als Lesezeichen speichern, oder den Link am Handy in der Meta-Horizon-App bzw. per Browser-Sync ans Headset schicken.
2. [ ] Auf **„In den Raum holen“** tippen. Die Nachfrage nach Zugriff auf Raum/Passthrough bzw. Handtracking **erlauben**.
3. [ ] Das Diagramm erscheint ca. **1 m vor dir auf Tischhöhe** (0,8 m, im Sitzen tiefer). Zuerst öffnet sich der Ring, dann wachsen die Balken gestaffelt aus dem Sockel (ca. 1,5 s).
4. [ ] **Lesbarkeit:** Titel, Monate, Jahreszahlen und Achsenwerte aus 1–1,5 m gut lesbar?
5. [ ] **Pinch auf einen Balken:** Tooltip mit Wert und Vorjahresvergleich erscheint, der Balken leuchtet kupferfarben.
6. [ ] **Buttons links:** alle fünf Ansichten durchschalten. Die Balken sollen weich morphen, nicht springen.
7. [ ] **Griff:** Leiste vor dem Diagramm greifen und das Diagramm verschieben. Beim Halten das Handgelenk drehen, dann dreht sich das Diagramm mit.
8. [ ] **Ring:** den leuchtenden Ring am Rand pinchen und seitlich ziehen, loslassen, das Diagramm dreht mit Schwung nach.
9. [ ] **„Vor mich holen“** nach dem Herumlaufen: das Diagramm springt wieder vor dich.
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
| Diagramm steht ungünstig nach dem Umhergehen | Button **„Vor mich holen“**. |
| Casting-Verzögerung (ca. 0,3–1 s) | Bewegungen etwas langsamer als gewohnt, dem Publikum ansagen, was gleich passiert. |
| Akku | Quest voll geladen, Laptop am Netz. Casting kostet Akku. |
| Nichts geht mehr | **Backup-Video** abspielen (siehe unten). |

### Backup-Video (dringend empfohlen)

Vorher aufnehmen, damit der Vortrag nicht an der Technik hängt:

1. **In der Quest:** *Meta-Taste → Kamera → Video aufnehmen*. Das nimmt die Mixed-Reality-Ansicht auf. Danach über die Meta-Horizon-App oder per USB auf den Laptop holen.
2. **Am Desktop:** Seite im Browser öffnen, Taste **`T`** startet eine automatische Tour (Kamera kreist langsam, Ansichten wechseln alle 7 s). Mit OBS oder der Windows-Spieleleiste (`Win` + `Alt` + `R`) aufnehmen.

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

- **Umsatz gesamt** = HZV + KV + privat. **Umsatz je Schein** = Umsatz gesamt ÷ Scheine.
- Fehlende Monate sind erlaubt: Sie erscheinen als leerer Platz, der Tooltip sagt „keine Daten“.
- **Index-Schalter:** `"indexMode": true` in `data.json`. Zum schnellen Ausprobieren geht auch `?index=1` an der URL (`?index=0` schaltet ab).

### Aus Excel/CSV übernehmen

```bash
node tools/csv-to-json.mjs meine-monatswerte.csv
```

```bash
node tools/csv-to-json.mjs meine-monatswerte.csv --heatmap meine-heatmap.csv
```

Vorlagen liegen in [`beispiele/`](beispiele/). Trennzeichen `;` oder `,`, Kopfzeile `jahr;monat;umsatz_hzv;umsatz_kv;umsatz_privat;scheine`. Deutsche Zahlenformate („28.650“ oder „28650,50“) werden verstanden. Das Skript überschreibt `data.json` und behält Einstellungen und Titel bei. Danach committen und pushen, GitHub Pages aktualisiert sich nach ca. 1 Minute.

Die Demodaten selbst erzeugt `node tools/generate-demo-data.mjs` (Saisonalität: Infektwelle im Winter, Sommerloch Juli/August, Quartalseffekte durch Chroniker-Pauschalen am Quartalsanfang, wachsender HZV-Anteil).

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

Playwright/Chromium: Desktop- und Handy-Ansicht, echter Mausklick auf einen Balken, alle Ansichten durchschalten, keine Konsolenfehler. Screenshots landen in `test-results/`.

```bash
npm run test:xr
```

Simuliert eine **Meta Quest 3** mit Metas WebXR-Emulations-Runtime ([iwer](https://github.com/meta-quest/immersive-web-emulation-runtime), die Basis des Immersive Web Emulators): AR-Session starten, Platzierung (1 m vor dem Kopf, Tischhöhe) prüfen, per Controller-Trigger Button und Balken wählen, per Hand-Pinch den Griff ziehen und am Ring drehen.

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
- **Ein `InstancedMesh` für alle Balken** (1 Draw-Call) mit eigenem Shader: Verlauf nach oben, leuchtende Kanten, Kupfer-Hervorhebung bei Auswahl. Kein Bloom/Post-Processing. Insgesamt rund 40 Draw-Calls.
- **Morphing:** Jede Instanz hat Position, Größe und Farbe. Beim Umschalten wird von der aktuellen zur neuen Form interpoliert, gestaffelt als Welle von links nach rechts. Gestapelte Segmente (HZV/KV) und die Heatmap-Kacheln nutzen denselben Instanzen-Pool, dadurch „fließen“ die Balken auch ins andere Raster.
- **Text:** auf Canvas gezeichnet (Schrift *Barlow*, lokal eingebunden), als Textur mit Mipmaps. Keine zusätzliche Text-Bibliothek, keine Abhängigkeit von Schrift-CDNs. Achsenbeschriftungen drehen sich zum Betrachter.
- **Eingabe:** Hände und Controller laufen beide über die WebXR-`select`-Events (Pinch = Trigger). Treffer auf Balken werden mit leicht vergrößerten Boxen berechnet, damit das Zielen mit der Hand verzeiht. Direktes Anfassen des Griffs erkennt die Fingerspitzen.
- **Platzierung:** Referenzraum `local-floor`. Das Diagramm steht 1,05 m in Blickrichtung auf 0,8 m Höhe, aber immer mindestens 0,5 m unter Augenhöhe (Sitzen).
- **Farben:** Petrol (#025669) und Kupfer (#BB4E26) aus dem Praxis-CI, für den dunklen, durchscheinenden Raum in hellere, leuchtende Abstufungen desselben Farbtons übersetzt. Jahre: dunkel → hell (aktuelles Jahr am hellsten, hinten).
- **Offline:** Ein Service Worker cacht App, Schriften, Daten und three.js nach dem ersten Besuch.
- **Framebuffer-Skalierung 1,2** für schärferen Text, bei der kleinen Szene ohne Risiko für 72 fps.

## Projektstruktur

```
index.html              Seite, Importmap, Desktop-Overlay
data.json               Daten (austauschbar)
sw.js                   Offline-Cache
src/main.js             Renderer, Desktop/XR, Platzierung, Tastatur, Tour
src/chart.js            Diagramm: Sockel, Balken, Achsen, Titel, Tooltip, Griff, Ring
src/barMaterial.js      Shader der Balken
src/data.js             Daten laden, Ansichten (Views), Index-Modus, Tooltip-Texte
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
