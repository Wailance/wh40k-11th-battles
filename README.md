# 40k 11th Battles

Unofficial Warhammer 40,000 11th Edition companion web app — scorekeeping, missions, rules reference, and **army list builder** powered by [WarOrgan](https://github.com/warorgan/warorgan) data.

Inspired by [Tabletop Battles](https://ttba.tabletopbattles.com/).

## Features

- **Army Builder** — 34 factions, detachments, enhancements, unit compositions, WarOrgan JSON import/export
- **New Game wizard** — armies, detachments, Force Dispositions, primary/secondary missions
- **Live scorer** — VP, CP, battle rounds
- **Detachments browser** — search & filter by faction and Force Disposition
- **Rules reference** — core rules, missions, terrain from the cheat sheet
- **Game history** — local stats (wins/losses/draws)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — army builder at `#/lists/new`.

## Army builder data (WarOrgan)

The builder uses bundled WarOrgan JSON in `public/data/warorgan/` (dataset v1.2.1.0).

To refresh from the WarOrgan desktop app (macOS default path):

```bash
npm run import:warorgan
```

This copies faction files from `~/Library/Application Support/WarOrgan/Data/` and regenerates `public/data/warorgan/builder-meta.json` via the verify pipeline.

### Verify & release check

```bash
npm run verify          # data audits, integration tests, builder UI smoke tests
npm run release:check   # verify + production build
npm run build
```

## Legacy catalogue data (optional)

Older BSData/MFM curated JSON in `public/data/army/` supports the detachments browser and fallback paths:

```bash
npm run build:army-data   # BSData wh40k-10e datasheets
npm run merge:mfm         # MFM points overlay
```

## Refresh mission data from xlsx

```bash
python3 scripts/extract-data.py
```

Place the Veizla.gg cheat sheet at `~/Downloads/Cheat Sheet - Warhammer 40k 11th Edition - Veizla.gg.xlsx` or edit the path in the script.

## Deploy (GitHub Pages)

```bash
npm run deploy
```

## Stack

React · TypeScript · Vite · Tailwind CSS · localStorage · PWA

Not endorsed by Games Workshop.
