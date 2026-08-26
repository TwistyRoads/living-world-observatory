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
