# Architecture

## Authority boundary

The Observatory is a **read-only presentation system**.

```text
Authoritative Living World engine
        │
        │ sanitize + export
        ▼
Public Observatory snapshot contract
        │
        │ fetch JSON
        ▼
Static browser UI
```

The browser does not resolve events, advance World Day, infer knowledge, alter probabilities, or persist world truth.

## Why this is a separate repository

Keeping the Observatory outside the engine prevents presentation experiments from creating a second source of simulation truth. The UI can be redesigned freely while the engine remains authoritative and independently testable.

The repository is intentionally framework-free at the start. A static site is enough for the MVP and keeps deployment, inspection, and archival simple.

## Data flow

1. A disposable or authoritative Living World checkout is advanced by the engine.
2. An engine-side exporter reads internal state.
3. The exporter removes private/internal fields and emits the public contract.
4. Exported JSON is copied into an Observatory dataset directory.
5. `scripts/validate_data.py` performs repository-side safety and shape checks.
6. The browser loads only the dataset manifest and declared snapshot files.

## Initial modes

- **World** — public current-state facts and conditions.
- **Knowledge** — presentation-safe holder/fact projections.
- **Frontier** — the exported next-horizon possibilities. An empty frontier is displayed honestly.
- **Why** — causal explanations safe enough for a public demonstration.

The UI deliberately does not claim that an information frontier is the same thing as full world evolution. Later world-pressure/consequence surfaces can extend the contract without moving simulation authority into this repository.

## Security / privacy posture

The export boundary is deny-by-default conceptually. Internal implementation details should never be copied first and redacted in the browser. Sanitization belongs upstream in the engine-side exporter.

This repository additionally rejects a small set of obviously internal key names as a second-line publication guard. That validator is not a substitute for the authoritative sanitizer.
