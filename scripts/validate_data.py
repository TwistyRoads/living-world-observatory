#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
FORBIDDEN_KEYS = {
    "world_seed",
    "resolver_seed",
    "resolver_entropy",
    "checkpoint_sha",
    "commit_sha",
    "receipt",
    "receipts",
    "private_gm",
    "raw_provenance",
    "source_path",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def walk(value, path="$"):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FORBIDDEN_KEYS:
                raise ValueError(f"forbidden internal key {key!r} at {path}")
            walk(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            walk(child, f"{path}[{index}]")


def require(obj, keys, label):
    missing = [key for key in keys if key not in obj]
    if missing:
        raise ValueError(f"{label}: missing required keys: {', '.join(missing)}")


def validate_manifest(path: Path):
    manifest = load_json(path)
    require(manifest, ["contract_version", "world_id", "title", "snapshots"], path)
    walk(manifest)
    if not isinstance(manifest["snapshots"], list):
        raise ValueError(f"{path}: snapshots must be an array")

    seen_days = set()
    last_day = None
    for entry in manifest["snapshots"]:
        require(entry, ["world_day", "path"], f"{path} snapshot entry")
        day = entry["world_day"]
        if not isinstance(day, int) or day < 0:
            raise ValueError(f"{path}: invalid world_day {day!r}")
        if day in seen_days:
            raise ValueError(f"{path}: duplicate world_day {day}")
        if last_day is not None and day < last_day:
            raise ValueError(f"{path}: snapshots must be ordered by world_day")
        seen_days.add(day)
        last_day = day

        snapshot_path = ROOT / entry["path"]
        if not snapshot_path.is_file():
            raise ValueError(f"{path}: missing snapshot {entry['path']}")
        snapshot = load_json(snapshot_path)
        validate_snapshot(snapshot, snapshot_path, manifest, day)

    return len(manifest["snapshots"])


def validate_snapshot(snapshot, path, manifest, expected_day):
    require(
        snapshot,
        [
            "contract_version", "world_id", "world_day", "phase", "headline", "summary",
            "actual_past", "world_state", "knowledge", "frontier", "causal_trace",
        ],
        path,
    )
    walk(snapshot)
    if snapshot["contract_version"] != manifest["contract_version"]:
        raise ValueError(f"{path}: contract_version differs from manifest")
    if snapshot["world_id"] != manifest["world_id"]:
        raise ValueError(f"{path}: world_id differs from manifest")
    if snapshot["world_day"] != expected_day:
        raise ValueError(f"{path}: world_day differs from manifest entry")

    ids = set()
    for surface in ["actual_past", "world_state", "knowledge", "frontier", "causal_trace"]:
        items = snapshot[surface]
        if not isinstance(items, list):
            raise ValueError(f"{path}: {surface} must be an array")
        for item in items:
            if not isinstance(item, dict) or not item.get("id"):
                raise ValueError(f"{path}: every {surface} item requires an id")
            if item["id"] in ids:
                raise ValueError(f"{path}: duplicate item id {item['id']!r}")
            ids.add(item["id"])
            probability = item.get("probability")
            confidence = item.get("confidence")
            for label, value in [("probability", probability), ("confidence", confidence)]:
                if value is not None and (not isinstance(value, (int, float)) or not 0 <= value <= 1):
                    raise ValueError(f"{path}: {label} must be between 0 and 1")


def main():
    manifests = sorted(DATA.glob("*/manifest.json"))
    if not manifests:
        raise SystemExit("No dataset manifests found")
    total = 0
    for manifest in manifests:
        count = validate_manifest(manifest)
        total += count
        print(f"OK  {manifest.relative_to(ROOT)} ({count} snapshots)")
    print(f"Validated {len(manifests)} dataset(s), {total} snapshot(s)")


if __name__ == "__main__":
    main()
