#!/usr/bin/env python3
"""Validate and report a manifest-defined no-intervention projection."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "witcher3" / "manifest.json"
PRESSURE_DELTA_EPSILON = 0.001


def load(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def active(snapshot):
    return {
        item["id"]: item
        for item in snapshot["frontier"]
        if item.get("kind") == "probable-future" and item.get("status") == "ACTIVE"
    }


def classify(now_snapshot, projected_snapshot):
    now = active(now_snapshot)
    projected = active(projected_snapshot)
    counts = {
        "newly_active": 0,
        "escalated": 0,
        "fading": 0,
        "stable": 0,
        "no_longer_active": 0,
    }

    for potential_id, item in projected.items():
        baseline = now.get(potential_id)
        if baseline is None:
            counts["newly_active"] += 1
            continue
        now_pressure = baseline.get("pressure")
        projected_pressure = item.get("pressure")
        if not isinstance(now_pressure, (int, float)) or not isinstance(
            projected_pressure, (int, float)
        ):
            counts["stable"] += 1
            continue
        delta = projected_pressure - now_pressure
        if delta > PRESSURE_DELTA_EPSILON:
            counts["escalated"] += 1
        elif delta < -PRESSURE_DELTA_EPSILON:
            counts["fading"] += 1
        else:
            counts["stable"] += 1

    counts["no_longer_active"] = len(set(now) - set(projected))
    return counts


def main():
    manifest = load(MANIFEST_PATH)
    forecast = manifest["forecast"]
    now_day = forecast["authoritative_now_world_day"]
    entries = {item["world_day"]: ROOT / item["path"] for item in manifest["snapshots"]}
    snapshots = {day: load(path) for day, path in entries.items()}
    now_snapshot = snapshots[now_day]

    if now_snapshot["phase"] != "SAVE NOW":
        raise SystemExit(f"WD{now_day} is not SAVE NOW")

    history_days = [
        item["world_day"]
        for snapshot in snapshots.values()
        for item in snapshot["actual_past"]
        if isinstance(item.get("world_day"), int)
    ]
    max_history_day = max(history_days, default=None)
    if max_history_day is not None and max_history_day > now_day:
        raise SystemExit(
            f"Historical Reality crosses SAVE NOW: WD{max_history_day} > WD{now_day}"
        )

    for snapshot in snapshots.values():
        if any(item["id"].startswith("potential.") for item in snapshot["actual_past"]):
            raise SystemExit("A probable future was promoted into Actual Past")

    print(f"Authoritative NOW: WD{now_day}")
    print(f"Maximum Historical Reality day: WD{max_history_day}")
    print(f"WD{now_day} Current State: {len(now_snapshot['world_state'])}")
    print(f"WD{now_day} ACTIVE Frontier: {len(active(now_snapshot))}")
    for horizon in forecast["horizons"]:
        day = horizon["world_day"]
        if day == now_day:
            continue
        snapshot = snapshots[day]
        if snapshot["phase"] != "POST-SAVE PROJECTION":
            raise SystemExit(f"WD{day} is not POST-SAVE PROJECTION")
        if snapshot["actual_past"]:
            raise SystemExit(f"WD{day} introduces Actual Past")
        if snapshot["world_state"] != now_snapshot["world_state"]:
            raise SystemExit(
                f"WD{day} Current State differs from authoritative SAVE NOW"
            )
        counts = classify(now_snapshot, snapshot)
        print(f"WD{day} Current State: {len(snapshot['world_state'])}")
        print(f"WD{day} ACTIVE Frontier: {len(active(snapshot))}")
        print("  " + ", ".join(f"{key}={value}" for key, value in counts.items()))
    print("History boundary: OK")
    print("Probable future promotion: NONE")


if __name__ == "__main__":
    main()
