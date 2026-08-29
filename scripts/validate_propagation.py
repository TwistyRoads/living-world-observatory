#!/usr/bin/env python3
"""Validate reconstructed semantic information propagation acceptance anchors."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "witcher3"
ANCHORS = (0, 44, 87, 117, 147, 177)


def load(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def transmission_count(snapshot):
    return sum(
        item.get("kind") == "information-transmission"
        for item in snapshot["frontier"]
    )


def probable_count(snapshot):
    return sum(
        item.get("kind") == "probable-future"
        for item in snapshot["frontier"]
    )


def main():
    manifest = load(DATA / "manifest.json")
    paths = {
        item["world_day"]: ROOT / item["path"] for item in manifest["snapshots"]
    }
    missing = sorted(set(ANCHORS) - set(paths))
    if missing:
        raise SystemExit(f"missing propagation acceptance anchors: {missing}")
    snapshots = {day: load(paths[day]) for day in ANCHORS}

    now = snapshots[87]
    if now["phase"] != "SAVE NOW":
        raise SystemExit("WD87 must remain SAVE NOW")
    if len(now["world_state"]) != 43:
        raise SystemExit("WD87 Current State count changed")
    if probable_count(now) != 27:
        raise SystemExit("WD87 ACTIVE probable-future count changed")
    if not now["knowledge"]:
        raise SystemExit("WD87 reconstructed knowledge is empty")

    knowledge_counts = [len(snapshots[day]["knowledge"]) for day in ANCHORS]
    if knowledge_counts != sorted(knowledge_counts):
        raise SystemExit("knowledge holder occurrences regress across acceptance anchors")

    historical_snapshots = [
        load(path) for day, path in paths.items() if day <= 87
    ]
    transmission_days = [
        snapshot["world_day"]
        for snapshot in historical_snapshots
        if transmission_count(snapshot)
    ]
    if not transmission_days:
        raise SystemExit("no reconstructed information-transmission frontier exists")

    for day in (117, 147, 177):
        snapshot = snapshots[day]
        if snapshot["phase"] != "POST-SAVE PROJECTION":
            raise SystemExit(f"WD{day} must remain POST-SAVE PROJECTION")
        if snapshot["actual_past"]:
            raise SystemExit(f"WD{day} creates post-save Historical Reality")

    presentation = load(DATA / "presentation.json")["regional_spread"]
    configured_holders = set(presentation["holder_regions"])
    if not any(item.get("holder_id") in configured_holders for item in now["knowledge"]):
        raise SystemExit("WD87 knowledge cannot drive configured Regional Spread regions")

    print("Reconstructed information propagation: OK")
    print(f"Transmission frontier days through SAVE NOW: {len(transmission_days)}")
    for day in ANCHORS:
        snapshot = snapshots[day]
        print(
            f"WD{day}: knowledge={len(snapshot['knowledge'])}, "
            f"information_transmission={transmission_count(snapshot)}, "
            f"probable_future={probable_count(snapshot)}"
        )
    print("Regional Spread capability: AVAILABLE at WD87")
    print("Post-save history boundary: OK")


if __name__ == "__main__":
    main()
