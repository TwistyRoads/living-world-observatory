const DEFAULT_MANIFEST = "data/witcher3/manifest.json";
const SNAPSHOT_CONCURRENCY = 8;

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return response.json();
}

export async function loadDataset(manifestPath = DEFAULT_MANIFEST, onProgress = null) {
  onProgress?.({ stage: "manifest", loaded: 0, total: 0, remaining: null });
  const manifest = await fetchJson(manifestPath);
  const snapshots = new Map();
  const entries = manifest.snapshots ?? [];
  const manifestDirectory = manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1);
  const presentationPromise = manifest.presentation_config
    ? fetchJson(`${manifestDirectory}${manifest.presentation_config}`)
    : Promise.resolve(null);

  let cursor = 0;
  let loaded = 0;
  onProgress?.({
    stage: "snapshots",
    loaded,
    total: entries.length,
    remaining: entries.length,
  });

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) return;

      const entry = entries[index];
      const snapshot = await fetchJson(entry.path);
      snapshots.set(snapshot.world_day, snapshot);
      loaded += 1;
      onProgress?.({
        stage: "snapshots",
        loaded,
        total: entries.length,
        remaining: entries.length - loaded,
      });
    }
  }

  const workerCount = Math.min(SNAPSHOT_CONCURRENCY, entries.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const presentation = await presentationPromise;

  onProgress?.({
    stage: "complete",
    loaded: entries.length,
    total: entries.length,
    remaining: 0,
  });
  return { manifest, snapshots, presentation };
}
