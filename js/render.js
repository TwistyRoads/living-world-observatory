function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pill(value) {
  return `<span class="pill">${escapeHtml(value)}</span>`;
}

function card(item, meta = []) {
  const title = item.title ?? item.statement ?? item.id ?? "Untitled";
  const text = item.summary ?? item.detail ?? item.description ?? "";
  const pills = meta.filter(Boolean).map(pill).join("");
  return `
    <article class="card">
      <h3>${escapeHtml(title)}</h3>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      ${pills ? `<div class="card-meta">${pills}</div>` : ""}
    </article>`;
}

function empty(message) {
  return `<div class="empty"><p>${escapeHtml(message)}</p></div>`;
}

const FALLBACK_REGION = "Other / Transregional";
const ORIGIN_GROUPS = ["local", "imported"];
const CHANNEL_GROUPS = [
  "witness",
  "trade",
  "diplomatic",
  "military",
  "rumor",
  "ally_private",
  "supernatural",
  "other",
];

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#6b7280";
}

function displayLabel(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function regionalRows(snapshot, config, metric, grouping) {
  const regionOrder = config.region_order;
  const regionSet = new Set(regionOrder);
  const groups = grouping === "channel" ? CHANNEL_GROUPS : ORIGIN_GROUPS;
  const channelLookup = new Map();

  for (const [bucket, channels] of Object.entries(config.channel_buckets ?? {})) {
    for (const channel of channels) channelLookup.set(channel, bucket);
  }

  const rows = new Map(regionOrder.map(region => [region, {
    region,
    total: 0,
    groups: Object.fromEntries(groups.map(group => [group, 0])),
    seeds: new Map(),
  }]));
  const items = metric === "knowledge"
    ? snapshot?.knowledge ?? []
    : (snapshot?.frontier ?? []).filter(item => item.kind === "information-transmission");

  for (const item of items) {
    const holderId = metric === "knowledge"
      ? item.holder_id ?? item.holder
      : item.target_holder_id ?? item.target_holder;
    const configuredRegion = config.holder_regions?.[holderId];
    const region = regionSet.has(configuredRegion) ? configuredRegion : FALLBACK_REGION;
    const row = rows.get(region) ?? rows.get(FALLBACK_REGION);
    if (!row) continue;

    const origin = config.seed_origins?.[item.seed_id] ?? FALLBACK_REGION;
    const channelBucket = channelLookup.get(item.channel) ?? "other";
    const group = grouping === "channel"
      ? (groups.includes(channelBucket) ? channelBucket : "other")
      : (origin === region ? "local" : "imported");
    row.total += 1;
    row.groups[group] += 1;
    const seed = item.seed_id ?? "unknown_seed";
    row.seeds.set(seed, (row.seeds.get(seed) ?? 0) + 1);
  }

  return [...rows.values()];
}

function toggleGroup(label, control, options, selected) {
  return `
    <div class="regional-toggle" role="group" aria-label="${escapeHtml(label)}">
      ${options.map(option => `
        <button
          type="button"
          data-regional-control="${escapeHtml(control)}"
          data-value="${escapeHtml(option)}"
          aria-pressed="${option === selected}"
          class="${option === selected ? "is-active" : ""}"
        >${escapeHtml(displayLabel(option))}</button>`).join("")}
    </div>`;
}

export function renderRegionalSpread(snapshot, presentation, metric, grouping) {
  const config = presentation?.regional_spread;
  if (!config?.region_order?.length) {
    return `<p class="regional-unavailable">Regional spread unavailable</p>`;
  }

  const safeMetric = ["pressure", "knowledge"].includes(metric) ? metric : "pressure";
  const safeGrouping = ["origin", "channel"].includes(grouping) ? grouping : "origin";
  const groups = safeGrouping === "channel" ? CHANNEL_GROUPS : ORIGIN_GROUPS;
  const palette = safeGrouping === "channel" ? config.channel_palette : config.origin_palette;
  const rows = regionalRows(snapshot, config, safeMetric, safeGrouping);
  const maximum = Math.max(1, ...rows.map(row => row.total));
  const rowMarkup = rows.map(row => {
    const breakdown = groups.filter(group => row.groups[group] > 0);
    const breakdownText = breakdown.length
      ? breakdown.map(group => `${displayLabel(group)} ${row.groups[group]}`).join(", ")
      : "No activity";
    const topSeeds = [...row.seeds.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([seed, count]) => `${displayLabel(seed)} (${count})`);
    const details = `${row.region} — total ${row.total}. ${breakdownText}.${topSeeds.length ? ` Top seeds: ${topSeeds.join(", ")}.` : ""}`;
    const segments = groups.map(group => {
      const width = (row.groups[group] / maximum) * 100;
      return width > 0
        ? `<span class="regional-segment" style="width:${width}%;--segment-color:${safeColor(palette?.[group])}"></span>`
        : "";
    }).join("");

    return `
      <div class="regional-row" tabindex="0" aria-label="${escapeHtml(details)}" title="${escapeHtml(details)}">
        <span class="regional-name">${escapeHtml(row.region)}</span>
        <span class="regional-track" aria-hidden="true">${segments}</span>
        <span class="regional-total">${row.total}</span>
        <span class="regional-tooltip" role="tooltip">${escapeHtml(details)}</span>
      </div>`;
  }).join("");
  const legend = groups.map(group => `
    <span class="regional-legend-item">
      <span class="regional-swatch" style="--segment-color:${safeColor(palette?.[group])}"></span>
      ${escapeHtml(displayLabel(group))}
    </span>`).join("");

  return `
    <div class="regional-heading">
      <div>
        <p class="eyebrow">INFORMATION FLOW</p>
        <h3>Regional spread</h3>
      </div>
      <div class="regional-controls">
        ${toggleGroup("Regional spread metric", "metric", ["pressure", "knowledge"], safeMetric)}
        ${toggleGroup("Regional spread grouping", "grouping", ["origin", "channel"], safeGrouping)}
      </div>
    </div>
    <div class="regional-chart" aria-label="Regional spread by ${escapeHtml(safeGrouping)}">
      ${rowMarkup}
    </div>
    <div class="regional-legend" aria-label="Legend">${legend}</div>`;
}

export function renderMode(snapshot, mode) {
  if (!snapshot) return empty("No snapshot is loaded.");

  if (mode === "world") {
    const items = snapshot.world_state ?? [];
    return items.length
      ? `<div class="card-grid">${items.map(item => card(item, [item.domain, item.status])).join("")}</div>`
      : empty("No public world-state items are exposed for this World Day.");
  }

  if (mode === "knowledge") {
    const items = snapshot.knowledge ?? [];
    return items.length
      ? `<div class="card-grid">${items.map(item => card(item, [item.holder, item.confidence != null ? `confidence ${item.confidence}` : null])).join("")}</div>`
      : empty("No public knowledge changes are exposed for this World Day.");
  }

  if (mode === "frontier") {
    const items = snapshot.frontier ?? [];
    return items.length
      ? `<div class="card-grid">${items.map(item => card(item, [item.kind, item.probability != null ? `${Math.round(item.probability * 100)}%` : null])).join("")}</div>`
      : empty("The exported next-horizon frontier is empty.");
  }

  const items = snapshot.causal_trace ?? [];
  return items.length
    ? `<div class="card-grid">${items.map(item => card(item, [item.cause, item.effect])).join("")}</div>`
    : empty("No public causal trace is exposed for this World Day.");
}

export function renderTimelineMarkers(entries) {
  if (!entries?.length) return "";
  const first = entries[0].world_day;
  const last = entries.at(-1).world_day;
  return `<span>WD ${escapeHtml(first)}</span><span>WD ${escapeHtml(last)}</span>`;
}
