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
  forecastShell: document.querySelector("#forecast-shell"),
  forecastControls: document.querySelector("#forecast-controls"),
  heroPanel: document.querySelector("#hero-panel"),
  projectionMode: document.querySelector("#projection-mode"),
  content: document.querySelector("#mode-content"),
  regionalSpread: document.querySelector("#regional-spread"),
  tabs: [...document.querySelectorAll(".mode-tab[data-mode]")],
  loader: document.querySelector("#initial-loader"),
  loadProgressText: document.querySelector("#load-progress-text"),
  loadRemaining: document.querySelector("#load-remaining"),
  loadLoaded: document.querySelector("#load-loaded"),
};

function updateLoadProgress(progress) {
  if (!ui.loader) return;

  if (progress.stage === "manifest") {
    ui.loadProgressText.textContent = "Reading the world manifest…";
    ui.loadRemaining.textContent = "—";
    ui.loadLoaded.textContent = "Preparing snapshot list…";
    ui.status.textContent = "Loading";
    return;
  }

  if (progress.stage === "snapshots") {
    ui.loadProgressText.textContent = "Loading World Day snapshots…";
    ui.loadRemaining.textContent = String(progress.remaining);
    ui.loadLoaded.textContent = `${progress.loaded} of ${progress.total} snapshots loaded`;
    ui.status.textContent = `Loading ${progress.loaded}/${progress.total}`;
    return;
  }

  if (progress.stage === "complete") {
    ui.loadProgressText.textContent = "Finalizing the Observatory…";
    ui.loadRemaining.textContent = "0";
    ui.loadLoaded.textContent = `${progress.total} snapshots loaded`;
  }
}

function forecastButton(horizon, selectedDay) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.forecastDay = horizon.world_day;
  button.setAttribute("aria-pressed", String(selectedDay === horizon.world_day));
  button.classList.toggle("is-active", selectedDay === horizon.world_day);

  const label = document.createElement("strong");
  label.textContent = horizon.label;
  const day = document.createElement("span");
  day.textContent = `WD ${horizon.world_day}`;
  button.append(label, day);
  return button;
}

function paint() {
  const entry = currentEntry();
  const snapshot = currentSnapshot();
  const count = appState.manifest?.snapshots?.length ?? 0;

  ui.slider.max = Math.max(0, count - 1);
  ui.slider.value = appState.selectedIndex;
  ui.previous.disabled = appState.selectedIndex <= 0;
  ui.next.disabled = appState.selectedIndex >= count - 1;
  ui.markers.innerHTML = renderTimelineMarkers(appState.manifest?.snapshots);

  const forecast = appState.manifest?.forecast;
  const nowDay = forecast?.authoritative_now_world_day;
  const projectionOffset = entry && Number.isInteger(nowDay) && entry.world_day > nowDay
    ? entry.world_day - nowDay
    : null;
  ui.dayLabel.textContent = entry
    ? `WD ${entry.world_day}${projectionOffset != null ? ` · NOW +${projectionOffset}` : ""}`
    : "WD —";
  ui.dateLabel.textContent = snapshot?.display_date ?? "No calendar date";
  ui.phase.textContent = snapshot?.phase ?? "—";
  const isProjection = snapshot?.phase === "POST-SAVE PROJECTION";
  ui.projectionMode.hidden = !isProjection;
  ui.projectionMode.textContent = forecast?.mode ?? "NO PLAYER INTERVENTION";
  ui.heroPanel.classList.toggle("is-projection", isProjection);
  ui.headline.textContent = snapshot?.headline ?? "No snapshot";
  ui.summary.textContent = snapshot?.summary ?? "";
  ui.regionalSpread.innerHTML = renderRegionalSpread(
    snapshot,
    appState.presentation,
    appState.regionalMetric,
    appState.regionalGrouping,
  );
  const nowSnapshot = Number.isInteger(nowDay) ? appState.snapshots.get(nowDay) : null;
  ui.content.innerHTML = renderMode(snapshot, appState.mode, nowSnapshot);

  ui.forecastShell.hidden = !forecast?.horizons?.length;
  ui.forecastControls.replaceChildren(
    ...(forecast?.horizons ?? []).map(horizon =>
      forecastButton(horizon, entry?.world_day)
    ),
  );

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

  ui.forecastControls.addEventListener("click", event => {
    const button = event.target.closest("button[data-forecast-day]");
    if (!button) return;
    const targetDay = Number(button.dataset.forecastDay);
    const index = appState.manifest?.snapshots?.findIndex(
      entry => entry.world_day === targetDay,
    );
    if (index == null || index < 0) return;
    setSelectedIndex(index);
    setMode("frontier");
    paint();
  });
}

async function boot() {
  bindControls();
  try {
    const { manifest, snapshots, presentation } = await loadDataset(undefined, updateLoadProgress);
    appState.manifest = manifest;
    appState.snapshots = snapshots;
    appState.presentation = presentation;
    const hasKnowledgeSurface = [...snapshots.values()].some(
      snapshot => (snapshot.knowledge ?? []).length > 0,
    );
    for (const tab of ui.tabs) {
      if (tab.dataset.mode === "knowledge") tab.hidden = !hasKnowledgeSurface;
    }
    const regionalConfig = presentation?.regional_spread;
    setRegionalMetric(regionalConfig?.default_metric);
    setRegionalGrouping(regionalConfig?.default_grouping);
    ui.description.textContent = manifest.description ?? manifest.title ?? manifest.world_id;
    ui.status.textContent = `${manifest.snapshots.length} snapshot${manifest.snapshots.length === 1 ? "" : "s"} loaded`;
    paint();
    if (ui.loader) {
      ui.loader.setAttribute("aria-busy", "false");
      ui.loader.hidden = true;
    }
  } catch (error) {
    console.error(error);
    if (ui.loader) {
      ui.loader.setAttribute("aria-busy", "false");
      ui.loader.hidden = true;
    }
    ui.status.textContent = "Dataset error";
    ui.content.classList.add("error");
    ui.content.innerHTML = `<div class="empty"><p>${String(error.message ?? error)}</p></div>`;
    ui.headline.textContent = "Unable to load Observatory data";
    ui.summary.textContent = "Run the data validator and serve this repository over HTTP.";
  }
}

boot();
