# Pirate Wars ⛵💣

A top-down naval battle web game. Static frontend — deploy straight to **Firebase Hosting**, with **Cloud Firestore** for accounts (falls back to localStorage until you add your Firebase config).

## Run locally

```bash
cd public
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
# put your project id in .firebaserc, then:
firebase deploy --only hosting
```

## Enable Firebase (accounts sync online)

1. Create a project at https://console.firebase.google.com and enable **Cloud Firestore**.
2. Copy your web app config into `public/js/firebase-config.js`.
3. Redeploy. Until then the game uses localStorage.

## File map — change one thing by editing one file

| To change… | Edit… |
|---|---|
| A page's design | `public/css/pages/<page>.css` |
| A page's behavior | `public/js/pages/<page>.js` |
| A ship (stats, price, skills, look) | `public/js/ships/<ship>.js` (+ one line in `registry.js`) |
| A map | `public/js/maps/<map>.js` (+ one line in `registry.js`) |
| A level | `public/js/levels/<level>.js` (+ one line in `registry.js`) |
| Tasks | `public/js/data/tasks.js` |
| Firebase config | `public/js/firebase-config.js` |

## Pages

- **Main** — account button (name + level), gold/diamond counters, tasks button, select-ship & play buttons, rotating preview of the selected ship.
- **Account** — level, owned ships, totals; search any player by 6-char account code.
- **Tasks** — task list; claim gold/diamonds/petroleum rewards.
- **Select Ship** — all ships with owned/locked state, buy, upgrade, select; shows skills and speed.
- **Game** — joystick movement; permanent skills (bomb attack + shield, no petroleum cost) plus 2 ship skills (some targetable: tap skill, then tap the map). HP, petroleum %, timer, ships counter and radar are always visible. Sinking ships pays gold, diamonds and petroleum. AI plays non-stop and ramps up in difficulty over time. Online multiplayer is planned for a future update.
