# Public Data Contract

Contract version `0.2` adds presentation-safe reconstructed history, Current State, and
probable-future pressure while retaining the original top-level surfaces.

## Manifest

Every dataset begins with `manifest.json`:

```json
{
  "contract_version": "0.1",
  "world_id": "example-world",
  "title": "Example World",
  "description": "Presentation-safe export",
  "presentation_config": "presentation.json",
  "snapshots": [
    { "world_day": 54, "path": "data/example/wd-054.json", "label": "Base ending" }
  ]
}
```

Snapshot entries are ordered by World Day. The UI treats manifest order as the presentation timeline.

`presentation_config` is optional and names a dataset-local JSON file loaded alongside the
manifest. Presentation configuration may describe dataset-specific labels, ordering, palettes,
and mappings without embedding world-specific knowledge in application JavaScript.

The Witcher dataset's `regional_spread` configuration defines its default metric and grouping,
region order, origin and channel palettes, normalized channel buckets, holder-to-region mappings,
and seed-to-origin mappings. Unmapped holders and seeds resolve to `Other / Transregional`, and
unmapped channels resolve to `other`.

## Snapshot

A snapshot exposes only public presentation surfaces:

```json
{
  "contract_version": "0.1",
  "world_id": "example-world",
  "world_day": 54,
  "display_date": null,
  "phase": "ACTUAL HISTORY",
  "headline": "A major outcome resolves.",
  "summary": "Human-readable public context.",
  "actual_past": [],
  "world_state": [],
  "knowledge": [],
  "frontier": [],
  "causal_trace": []
}
```

`display_date` is optional presentation metadata. World Day remains the simulation-time identifier.

## Stability rules

- IDs should be stable within a dataset.
- A probable-future `pressure` is an engine model score, not historical truth and not a
  statistical probability. The UI must not convert it into a percentage.
- A probable-future item may expose `status`, `trend`, `days_eligible`, and nullable
  `days_remaining` lifecycle fields.
- An empty array means "nothing is exposed on this surface," not "the engine has no internal state."
- The public contract must never require the browser to reconstruct private causality.
- New optional item fields may be added without breaking existing renderers.
- Breaking top-level changes require a new `contract_version`.

## Publication rule

If there is doubt whether a field is safe to publish, it does not belong in the exported snapshot.

Reconstructed Witcher exports must not contain raw saves, native FactsDB identifiers, save or
observation identities, native game time, record offsets, entry values, query sums, or private
evidence/provenance.

## Regional-spread capability

Regional spread is available only when a snapshot exposes compatible public knowledge records or
`information-transmission` Frontier records. A configured region list alone is not evidence of
activity. Renderers must show an unavailable state instead of zero-filled regions when neither
surface is present.

## Forecast metadata

A manifest may declare an optional `forecast` object:

```json
{
  "forecast": {
    "authoritative_now_world_day": 87,
    "mode": "NO PLAYER INTERVENTION",
    "snapshot_strategy": "sparse_horizons",
    "horizons": [
      { "label": "NOW", "offset_days": 0, "world_day": 87 },
      { "label": "+30 DAYS", "offset_days": 30, "world_day": 117 }
    ]
  }
}
```

Every horizon must reference a snapshot already listed in the manifest. The authoritative NOW
snapshot uses `SAVE NOW`; later horizons use `POST-SAVE PROJECTION`. A projection may age
probable-future pressure and lifecycle state, but it must not introduce post-NOW Actual Past.

The Observatory compares each projected ACTIVE Frontier with authoritative NOW using a pressure
delta tolerance of `0.001`:

- newly active: absent from NOW and ACTIVE at the horizon;
- escalated: ACTIVE at both with pressure increased by more than the tolerance;
- fading: ACTIVE at both with pressure decreased by more than the tolerance;
- stable: ACTIVE at both without a material scored change;
- no longer active: ACTIVE at NOW but absent from the horizon's public ACTIVE Frontier.

`No longer active` does not mean resolved. The public export cannot infer resolution from an
item leaving the ACTIVE surface.
