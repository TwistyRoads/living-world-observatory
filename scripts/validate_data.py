#!/usr/bin/env python3
import json
import re
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
    "native_fact_id",
    "native_fact_ids",
    "save_sha256",
    "observation_id",
    "record_offset",
    "record_length",
    "entry_ordinals",
    "entry_values",
    "native_gt",
    "native_gt_values",
    "query_sum",
    "provenance",
    "evidence",
}
REGIONAL_METRICS = {"pressure", "knowledge"}
REGIONAL_GROUPINGS = {"origin", "channel"}
REGIONAL_CHANNEL_BUCKETS = {
    "witness", "trade", "diplomatic", "military", "rumor",
    "ally_private", "supernatural", "other",
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

    presentation_name = manifest.get("presentation_config")
    if presentation_name is not None:
        if not isinstance(presentation_name, str) or not presentation_name:
            raise ValueError(f"{path}: presentation_config must be a non-empty string")
        presentation_path = path.parent / presentation_name
        if presentation_path.parent.resolve() != path.parent.resolve():
            raise ValueError(f"{path}: presentation_config must be dataset-local")
        if not presentation_path.is_file():
            raise ValueError(f"{path}: missing presentation config {presentation_name}")
        validate_presentation(load_json(presentation_path), presentation_path)

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


def validate_presentation(presentation, path):
    require(presentation, ["regional_spread"], path)
    walk(presentation)
    config = presentation["regional_spread"]
    require(
        config,
        [
            "default_metric", "default_grouping", "region_order", "origin_palette",
            "channel_palette", "channel_buckets", "holder_regions", "seed_origins",
        ],
        f"{path} regional_spread",
    )
    if config["default_metric"] not in REGIONAL_METRICS:
        raise ValueError(f"{path}: invalid regional_spread.default_metric")
    if config["default_grouping"] not in REGIONAL_GROUPINGS:
        raise ValueError(f"{path}: invalid regional_spread.default_grouping")

    regions = config["region_order"]
    if not isinstance(regions, list) or not regions or any(not isinstance(item, str) for item in regions):
        raise ValueError(f"{path}: regional_spread.region_order must be a non-empty string array")
    if len(regions) != len(set(regions)) or "Other / Transregional" not in regions:
        raise ValueError(f"{path}: region_order must be unique and include Other / Transregional")

    for palette_name, required_keys in [
        ("origin_palette", {"local", "imported"}),
        ("channel_palette", REGIONAL_CHANNEL_BUCKETS),
    ]:
        palette = config[palette_name]
        if not isinstance(palette, dict) or set(palette) != required_keys:
            raise ValueError(f"{path}: {palette_name} must define {sorted(required_keys)}")
        if any(not isinstance(color, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", color) for color in palette.values()):
            raise ValueError(f"{path}: {palette_name} values must be six-digit hex colors")

    buckets = config["channel_buckets"]
    if not isinstance(buckets, dict) or set(buckets) != REGIONAL_CHANNEL_BUCKETS:
        raise ValueError(f"{path}: channel_buckets must define {sorted(REGIONAL_CHANNEL_BUCKETS)}")
    seen_channels = set()
    for bucket, channels in buckets.items():
        if not isinstance(channels, list) or any(not isinstance(channel, str) for channel in channels):
            raise ValueError(f"{path}: channel bucket {bucket} must be a string array")
        duplicates = seen_channels.intersection(channels)
        if duplicates:
            raise ValueError(f"{path}: channels mapped to multiple buckets: {sorted(duplicates)}")
        seen_channels.update(channels)

    valid_regions = set(regions)
    for mapping_name in ["holder_regions", "seed_origins"]:
        mapping = config[mapping_name]
        if not isinstance(mapping, dict) or any(not isinstance(key, str) for key in mapping):
            raise ValueError(f"{path}: {mapping_name} must be an object")
        invalid = sorted(set(mapping.values()) - valid_regions)
        if invalid:
            raise ValueError(f"{path}: {mapping_name} contains regions outside region_order: {invalid}")


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

            if surface == "frontier" and item.get("kind") == "probable-future":
                require(
                    item,
                    ["status", "trend", "days_eligible"],
                    f"{path}: probable-future {item['id']!r}",
                )
                if "probability" in item:
                    raise ValueError(
                        f"{path}: probable-future {item['id']!r} must expose pressure, not probability"
                    )
                pressure = item.get("pressure")
                if pressure is not None and (
                    not isinstance(pressure, (int, float)) or pressure < 0
                ):
                    raise ValueError(
                        f"{path}: probable-future pressure must be a non-negative model score"
                    )
                if not isinstance(item["days_eligible"], int) or item["days_eligible"] < 0:
                    raise ValueError(f"{path}: probable-future days_eligible must be >= 0")
                days_remaining = item.get("days_remaining")
                if days_remaining is not None and (
                    not isinstance(days_remaining, int) or days_remaining < 0
                ):
                    raise ValueError(f"{path}: probable-future days_remaining must be null or >= 0")


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
