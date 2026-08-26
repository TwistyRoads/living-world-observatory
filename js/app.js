import { loadDataset } from "./data.js";
import {
  appState,
  currentEntry,
  currentSnapshot,
  setMode,
  setRegionalGrouping,
  setRegionalMetric,
  setSelectedIndex,
} from "./state.js";
import { renderMode, renderRegionalSpread, renderTimelineMarkers } from "./render.js";

const ui = {
  description: document.querySelector("#world-description"),
  status: document.querySelector("#dataset-status"),
  dayLabel: document.querySelector("#day-label"),
  dateLabel: document.querySelector("#date-label"),
  phase: document.querySelector("#phase-label"),
  headline: document.querySelector("#headline"),
  summary: document.querySelector("#summary"),
  slider: document.querySelector("#day-slider"),
  previous: document.querySelector("#previous-day"),
  next: document.querySelector("#next-day"),
  markers: document.querySelector("#timeline-markers"),
  content: document.querySelector("#mode-content"),
  regionalSpread: document.querySelector("#regional-spread"),
  tabs: [...document.querySelectorAll(".mode-tab")],
};

function paint() {
  const entry = currentEntry();
  const snapshot = currentSnapshot();
  const count = appState.manifest?.snapshots?.length ?? 0;

  ui.slider.max = Math.max(0, count - 1);
  ui.slider.value = appState.selectedIndex;
  ui.previous.disabled = appState.selectedIndex <= 0;
  ui.next.disabled = appState.selectedIndex >= count - 1;
  ui.markers.innerHTML = renderTimelineMarkers(appState.manifest?.snapshots);

  ui.dayLabel.textContent = entry ? `WD ${entry.world_day}` : "WD —";
  ui.dateLabel.textContent = snapshot?.display_date ?? "No calendar date";
  ui.phase.textContent = snapshot?.phase ?? "—";
  ui.headline.textContent = snapshot?.headline ?? "No snapshot";
  ui.summary.textContent = snapshot?.summary ?? "";
  ui.regionalSpread.innerHTML = renderRegionalSpread(
    snapshot,
    appState.presentation,
    appState.regionalMetric,
    appState.regionalGrouping,
  );
  ui.content.innerHTML = renderMode(snapshot, appState.mode);

  for (const tab of ui.tabs) {
    tab.classList.toggle("is-active", tab.dataset.mode === appState.mode);
  }
}

function bindControls() {
  ui.slider.addEventListener("input", event => {
    setSelectedIndex(event.target.value);
    paint();
  });

  ui.previous.addEventListener("click", () => {
    setSelectedIndex(appState.selectedIndex - 1);
    paint();
  });

  ui.next.addEventListener("click", () => {
    setSelectedIndex(appState.selectedIndex + 1);
    paint();
  });

  for (const tab of ui.tabs) {
    tab.addEventListener("click", () => {
      setMode(tab.dataset.mode);
      paint();
    });
  }

  ui.regionalSpread.addEventListener("click", event => {
    const button = event.target.closest("button[data-regional-control]");
    if (!button) return;
    if (button.dataset.regionalControl === "metric") {
      setRegionalMetric(button.dataset.value);
    } else {
      setRegionalGrouping(button.dataset.value);
    }
    paint();
  });
}

async function boot() {
  bindControls();
  try {
    const { manifest, snapshots, presentation } = await loadDataset();
    appState.manifest = manifest;
    appState.snapshots = snapshots;
    appState.presentation = presentation;
    const regionalConfig = presentation?.regional_spread;
    setRegionalMetric(regionalConfig?.default_metric);
    setRegionalGrouping(regionalConfig?.default_grouping);
    ui.description.textContent = manifest.description ?? manifest.title ?? manifest.world_id;
    ui.status.textContent = `${manifest.snapshots.length} snapshot${manifest.snapshots.length === 1 ? "" : "s"} loaded`;
    paint();
  } catch (error) {
    console.error(error);
    ui.status.textContent = "Dataset error";
    ui.content.classList.add("error");
    ui.content.innerHTML = `<div class="empty"><p>${String(error.message ?? error)}</p></div>`;
    ui.headline.textContent = "Unable to load Observatory data";
    ui.summary.textContent = "Run the data validator and serve this repository over HTTP.";
  }
}

boot();
