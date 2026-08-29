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

## No-intervention forecast

The Witcher manifest defines sparse analytical horizons at WD117, WD147, and WD177: +30, +60,
and +90 days from authoritative SAVE NOW. These snapshots age the WD87 causal Frontier with no
new player intervention. They are projections, not host observations.

Historical Reality is frozen at WD87. The forecast may change pressure, trend, eligibility,
lifecycle, and ACTIVE Frontier membership, but it cannot create player actions, complete quests,
or promote probable futures into history. The projection view compares every horizon with the
WD87 ACTIVE Frontier as newly active, escalated, fading, stable, or no longer active.

The dataset uses sparse projection snapshots because manifest navigation is entry-based:
WD0–WD87 remains contiguous historical presentation data, followed by WD117, WD147, and WD177.
No redundant intermediate projection files are required.

## Reconstructed information propagation

The Witcher snapshots also expose presentation-safe semantic knowledge holders and next-day
`information-transmission` candidates derived from reconstructed Historical Reality. They use
the existing authored holder, route, channel, delay, reliability, and distortion model from
`story-v2`; native FactsDB identity and the legacy imported-history overlay are not authority.

Information propagation and probable-future pressure are separate surfaces. Learning does not
create history, and a transmission candidate does not mean that the underlying event newly
occurred. Regional Spread renders holder/transmission data when either capability is present and
retains its neutral unavailable state for datasets without them.

Propagation acceptance can be checked with:

```bash
python3 scripts/validate_propagation.py
```
