const DEFAULT_MANIFEST = "data/witcher3/manifest.json";

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return response.json();
}

export async function loadDataset(manifestPath = DEFAULT_MANIFEST) {
  const manifest = await fetchJson(manifestPath);
  const snapshots = new Map();
  const manifestDirectory = manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1);
  const presentation = manifest.presentation_config
    ? await fetchJson(`${manifestDirectory}${manifest.presentation_config}`)
    : null;

  for (const entry of manifest.snapshots ?? []) {
    const snapshot = await fetchJson(entry.path);
    snapshots.set(snapshot.world_day, snapshot);
  }

  return { manifest, snapshots, presentation };
}
