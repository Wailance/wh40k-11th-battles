# 40k 11th Battles

Unofficial Warhammer 40,000 11th Edition companion web app — scorekeeping, missions, and rules reference based on the [Veizla.gg](https://veizla.gg) cheat sheet.

Inspired by [Tabletop Battles](https://ttba.tabletopbattles.com/).

## Features

- **New Game wizard** — armies, detachments (238 lists), Force Dispositions, primary/secondary missions
- **Live scorer** — VP, CP, battle rounds
- **Detachments browser** — search & filter by faction and Force Disposition
- **Rules reference** — core rules, missions, terrain from the cheat sheet
- **Game history** — local stats (wins/losses/draws)

## Run locally

```bash
npm install
npm run dev
```

## Refresh data from xlsx

```bash
python3 scripts/extract-data.py
```

Place the Veizla.gg cheat sheet at `~/Downloads/Cheat Sheet - Warhammer 40k 11th Edition - Veizla.gg.xlsx` or edit the path in the script.

## Stack

React · TypeScript · Vite · Tailwind CSS · localStorage

Not endorsed by Games Workshop.
