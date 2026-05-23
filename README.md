

# heath-concierge
# ⚡ Vitale — AI Health Coach

A highly integrated, intelligent dashboard for structured bodybuilding, precise nutrition tracking, and data-driven recovery.

Vitale is designed as a **single-file web app**. That means: no external dependencies, no database, no cloud. All calculations and data remain 100% local and private in your browser memory (`localStorage`).

## ✨ Features

### 🏋️ Training & Hypertrophy
- **Dynamic training planning:** Push/Pull/Legs plans based on daily recovery metrics (HRV, sleep, resting heart rate).
- **Interactive body map (injury bypass):** Visual pain-point selection. The system automatically disables problematic exercises and suggests suitable alternatives.
- **Progressive overload & logging:** Epley 1RM calculation, volume tracking, PR notifications, and weekly muscle-group workload analysis.

### 🥗 Nutrition & Macros
- **TDEE & goal tracking:** Basal metabolic rate based on Mifflin-St. Jeor, adjusted for lean bulk, maintenance, or cut goals.
- **Precise macro distribution:** Dynamic calculation of protein, fat, and carbohydrates, including warnings for inefficient fat ratios during a bulk.
- **Periodization check:** Detection of weight plateaus with concrete recommendations for calorie adjustments.

### ⌚ Health Data & Recovery
- **Apple Watch import:** Local CSV/JSON import (e.g. via “Health Auto Export”) for HRV, resting heart rate, sleep stages, and active calories.
- **Recovery score:** A custom algorithm for daily readiness (0–100) based on sleep quality, stress, and vital signs.

### 🩺 Body & Health
- **Body fat calculator (Navy method):** Calculation of lean mass and body fat percentage.
- **Vitamin D3 calculator:** Estimation of supplement needs based on skin type, sun exposure, and season.

## 🚀 Installation & Usage

Because this is a single-file app, there is no installation, no `npm install`, and no local server required.

1. Download the file `HealthConcierge v2.html`.
2. Open the file in any modern web browser (Chrome, Safari, Firefox).
3. **Done.** All entered data is automatically stored in your browser’s local storage (`localStorage`).

## 🛠 Tech Stack
- **HTML5** for structure.
- **CSS3** for the responsive, modern dark-mode UI, including CSS variables and Flexbox/Grid layouts.
- **Vanilla JavaScript (ES6)** for all logic, data storage, and dynamic UI updates.
- **Zero dependencies:** no React, no Vue, no external CSS framework.

***
*Note: If you clear your browser cache or site data, your saved training and nutrition data will be lost, since everything is stored locally only.*

