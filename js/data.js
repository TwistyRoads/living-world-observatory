const DEFAULT_MANIFEST = "data/demo/manifest.json";

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return response.json();
}

export async function loadDataset(manifestPath = DEFAULT_MANIFEST) {
  const manifest = await fetchJson(manifestPath);
  const snapshots = new Map();

  for (const entry of manifest.snapshots ?? []) {
    const snapshot = await fetchJson(entry.path);
    snapshots.set(snapshot.world_day, snapshot);
  }

  return { manifest, snapshots };
}
