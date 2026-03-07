# Quiz PWA

Eine Progressive Web App für interaktive Quizzes – direkt im Browser spielbar, auch offline.

## Features

- **Verschiedene Quizarten**: Multiple Choice, Freie Eingabe und Melodie-Erkennung
- **Kinderlieder erraten** 🎵: Melodien werden als Notensystem dargestellt und können abgespielt werden (Web Audio API)
- **Mathe-Quiz**: Einmaleins, Division und gemischte Aufgaben mit optionaler freier Eingabe
- **Eigene Quizzes laden**: JSON-Dateien per Drag & Drop hochladen
- **Offline-fähig**: PWA mit Service Worker – funktioniert auch ohne Internet
- **Responsive Design**: Optimiert für Desktop, Tablet und Smartphone
- **Barrierefreiheit**: ARIA-Labels und Tastaturnavigation

## Verfügbare Quizzes

| Quiz | Typ | Fragen |
|------|-----|--------|
| 🌍 Allgemeinwissen | Multiple Choice | 10 |
| 🔬 Naturwissenschaften | Multiple Choice | 10 |
| 🏛️ Geschichte | Multiple Choice | 10 |
| 🐾 Paw Patrol | Multiple Choice | 12 |
| 💻 C# | Multiple Choice | 7 |
| ✖️ Kleines Einmaleins | MC / Freie Eingabe | 100 |
| ➗ Geteiltaufgaben | MC / Freie Eingabe | 100 |
| 🔢 Gemischte Matheaufgaben | MC / Freie Eingabe | 200 |
| 🎵 Kinderlieder erraten | Melodie + MC | 22 |

## Eigene Quiz-Dateien erstellen

Quiz-Dateien werden im JSON-Format erstellt. Es gibt drei Formate:

### Multiple Choice

```json
{
  "title": "Mein Quiz",
  "description": "Beschreibung",
  "questions": [
    {
      "question": "Wie heißt die Hauptstadt von Deutschland?",
      "options": ["Berlin", "München", "Hamburg", "Köln"],
      "correct": 0
    }
  ]
}
```

### Freie Eingabe (mit MC-Fallback)

```json
{
  "title": "Mathe-Quiz",
  "description": "Rechenaufgaben",
  "allowFreeInput": true,
  "questions": [
    {
      "question": "5 × 3 = ?",
      "answer": 15,
      "options": ["10", "12", "15", "20"],
      "correct": 2
    }
  ]
}
```

### Melodie-Quiz (Kinderlieder)

```json
{
  "title": "Lieder erraten",
  "description": "Erkenne die Melodie!",
  "type": "melody",
  "questions": [
    {
      "question": "Welches Lied ist das?",
      "melody": "C4/4 D4/4 E4/4 F4/4 | G4/2 G4/2",
      "timeSignature": "4/4",
      "tempo": 120,
      "options": ["Lied A", "Lied B", "Lied C", "Lied D"],
      "correct": 0
    }
  ]
}
```

**Melodie-Notation:**
- Noten: `C`, `D`, `E`, `F`, `G`, `A`, `B` (internationale Schreibweise; `B` = dt. H, `Bb` = dt. B)
- Vorzeichen: `#` für Kreuz, `b` für Be (z.B. `F#4/4`, `Bb4/4`)
- Oktave: Zahl nach dem Notennamen (`4` = mittlere Oktave, `5` = eine Oktave höher)
- Dauer: nach `/` – `1` = Ganze, `2` = Halbe, `4` = Viertel, `8` = Achtel (`.` für punktiert)
- Pausen: `R/4` = Viertelpause
- Taktstriche: `|` trennt Takte
- Beispiel: `C4/4 D4/4 E4/4 F4/4 | G4/2 G4/2` = Vier Viertelnoten (C-D-E-F), dann zwei Halbe (G-G)

## Technologie

- Vanilla HTML, CSS & JavaScript (keine Frameworks)
- Progressive Web App (manifest.json + Service Worker)
- Web Audio API für Melodie-Wiedergabe
- SVG für Notendarstellung
- Dark Theme mit CSS Custom Properties
