# heath-concierge
# ⚡ Vitale — KI Health Coach

Ein hochintegriertes, intelligentes Dashboard für strukturiertes Bodybuilding, präzises Ernährungs-Tracking und datengetriebene Recovery. 

Vitale ist als **Single-File Web App** konzipiert. Das bedeutet: Keine externen Abhängigkeiten, keine Datenbank, keine Cloud. Alle Berechnungen und Daten bleiben zu 100 % lokal und privat im Speicher deines Browsers (`localStorage`).

## ✨ Features

### 🏋️ Training & Hypertrophie
* **Dynamische Trainingsplanung:** Push/Pull/Legs-Pläne basierend auf täglichen Erholungswerten (HRV, Schlaf, Ruhepuls).
* **Interaktive Body-Map (Verletzungs-Bypass):** Visuelle Auswahl von Schmerzpunkten. Das System sperrt problematische Übungen automatisch und schlägt sinnvolle Alternativen vor.
* **Progressive Overload & Logging:** Epley-1RM-Berechnung, Volumen-Tracking, PR-Benachrichtigungen und wöchentliche Muskelgruppen-Auslastung.

### 🥗 Ernährung & Makros
* **TDEE & Ziel-Tracking:** Grundumsatz nach Mifflin-St. Jeor, angepasst an Lean-Bulk-, Erhalt- oder Cut-Ziele.
* **Präzise Makro-Verteilung:** Dynamische Berechnung von Protein, Fett und Kohlenhydraten (inklusive Warnungen bei ineffizienten Fett-Ratios im Bulk).
* **Periodisierungs-Check:** Erkennung von Gewichts-Stagnation mit konkreten Handlungsempfehlungen zur Kalorienanpassung.

### ⌚ Health-Daten & Recovery
* **Apple Watch Import:** Lokaler CSV/JSON-Import (z.B. via "Health Auto Export") für HRV, Ruhepuls, Schlafphasen und Aktivitätskalorien.
* **Recovery-Score:** Eigener Algorithmus zur Berechnung der Tagesform (0-100) basierend auf Schlafqualität, Stress und Vitalwerten.

### 🩺 Körper & Gesundheit
* **KFA-Rechner (Navy-Methode):** Berechnung von Magermasse und Körperfettanteil.
* **Vitamin D₃ Rechner:** Ermittlung des Supplement-Bedarfs basierend auf Hauttyp, Sonnenexposition und Jahreszeit.

## 🚀 Installation & Nutzung

Da es sich um eine Single-File App handelt, ist keine Installation, kein `npm install` und kein lokaler Server notwendig.

1. Lade die Datei `HealthConcierge v2.html` herunter.
2. Öffne die Datei in einem beliebigen modernen Webbrowser (Chrome, Safari, Firefox).
3. **Fertig.** Alle eingetragenen Daten werden automatisch im lokalen Speicher deines Browsers (`localStorage`) abgelegt.

## 🛠 Tech Stack
* **HTML5** für die Struktur.
* **CSS3** für das responsive, moderne Dark-Mode UI (inkl. CSS Variables und Flexbox/Grid-Layouts).
* **Vanilla JavaScript (ES6)** für die gesamte Logik, Datenspeicherung und dynamische UI-Aktualisierung.
* **Zero Dependencies:** Kein React, kein Vue, keine externen CSS-Frameworks.

---
*Hinweis: Wenn du deinen Browser-Cache oder die Website-Daten löschst, gehen deine gespeicherten Trainings- und Ernährungsdaten verloren, da diese ausschließlich lokal gesichert werden.*
