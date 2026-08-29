# Living World Observatory

A public, inspectable visualization layer for the **Living World** simulation engine.

The Observatory does **not** run the simulation and does not own world truth. It consumes sanitized, presentation-safe snapshots exported by the authoritative Living World engine and makes causal change understandable to a human reviewer.

## Purpose

The demo should answer four questions clearly:

1. **What is true now?**
2. **Who knows what?**
3. **What changed at this World Day boundary, and why?**
4. **What is currently possible next?**

The core product distinction is deliberate:

> The engine owns causality. The Observatory explains it.

## Repository boundary

This repository may contain:

- static HTML, CSS, and JavaScript;
- presentation-safe exported snapshot data;
- public JSON schemas;
- validation and local-preview tooling;
- visual assets used by the Observatory.

It must **not** contain:

- Living World engine implementation code;
- private GM state;
- private world seeds or resolver entropy;
- internal receipts or checkpoint identities;
- provider credentials;
- unredacted imported-save evidence;
- data whose publication would reveal protected provenance or private character knowledge.

The authoritative engine currently lives separately in `TwistyRoads/story-v2`.

## Initial structure

```text
living-world-observatory/
├── index.html
├── css/
│   └── observatory.css
├── js/
│   ├── app.js
│   ├── data.js
│   ├── render.js
│   └── state.js
├── data/
│   ├── README.md
│   └── demo/
│       ├── manifest.json
│       └── wd-000.json
├── schema/
│   ├── manifest.schema.json
│   └── snapshot.schema.json
├── scripts/
│   └── validate_data.py
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATA_CONTRACT.md
└── .github/
    └── workflows/
        └── validate.yml
```

## Local preview

The site uses `fetch()`, so serve it over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Data validation

```bash
python3 scripts/validate_data.py
```

The validator intentionally uses only the Python standard library.

## Witcher reconstruction dataset

The Witcher dataset is a sanitized WD0–WD87 presentation export from the save-reconstruction
pipeline in `TwistyRoads/story-v2`. It separates reconstructed Actual Past, authoritative Current
State, and active Probable Future opportunities. Future pressure is displayed as a model score,
never as historical truth or an invented percentage probability.

The reference snapshot at WD87 is `SAVE NOW`: the authoritative present derived from the source
save. Earlier snapshots are reconstructed semantic history. A future export may add
`POST-SAVE PROJECTION`, but projected potentials must never be promoted into Actual Past.
