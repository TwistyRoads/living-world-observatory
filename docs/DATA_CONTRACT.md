# Public Data Contract

Contract version `0.1` is intentionally small and provisional.

## Manifest

Every dataset begins with `manifest.json`:

```json
{
  "contract_version": "0.1",
  "world_id": "example-world",
  "title": "Example World",
  "description": "Presentation-safe export",
  "snapshots": [
    { "world_day": 54, "path": "data/example/wd-054.json", "label": "Base ending" }
  ]
}
```

Snapshot entries are ordered by World Day. The UI treats manifest order as the presentation timeline.

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
- Probabilities are normalized to `0..1`.
- An empty array means "nothing is exposed on this surface," not "the engine has no internal state."
- The public contract must never require the browser to reconstruct private causality.
- New optional item fields may be added without breaking existing renderers.
- Breaking top-level changes require a new `contract_version`.

## Publication rule

If there is doubt whether a field is safe to publish, it does not belong in the exported snapshot.
