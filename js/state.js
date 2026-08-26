export const appState = {
  manifest: null,
  snapshots: new Map(),
  selectedIndex: 0,
  mode: "world",
};

export function currentEntry() {
  return appState.manifest?.snapshots?.[appState.selectedIndex] ?? null;
}

export function currentSnapshot() {
  const entry = currentEntry();
  return entry ? appState.snapshots.get(entry.world_day) ?? null : null;
}

export function setSelectedIndex(index) {
  const last = Math.max(0, (appState.manifest?.snapshots?.length ?? 1) - 1);
  appState.selectedIndex = Math.min(Math.max(Number(index) || 0, 0), last);
}

export function setMode(mode) {
  if (["world", "knowledge", "frontier", "trace"].includes(mode)) {
    appState.mode = mode;
  }
}
