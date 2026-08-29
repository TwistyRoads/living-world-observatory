const FALLBACK_REGION = "Other / Transregional";

const REALIZATION_TYPES = [
  { id: "ambient_bark", label: "Ambient Bark", matches: ["ambient bark"] },
  { id: "dialogue", label: "Dialogue", matches: ["dialogue"] },
  { id: "correspondence", label: "Correspondence", matches: ["correspondence", "letter"] },
  { id: "quest", label: "Quest / Contract", matches: ["quest", "contract"] },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayLabel(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizedRegion(item, config) {
  const mapped = config?.holder_regions?.[item.holder_id ?? item.holder];
  if (mapped) return mapped;

  const raw = String(item.region ?? "").toLowerCase();
  const aliases = {
    white_orchard: "White Orchard",
    velen: "Velen",
    novigrad: "Novigrad",
    skellige: "Skellige",
    kaer_morhen: "Kaer Morhen",
    nilfgaard: "Vizima / Nilfgaard",
    vizima: "Vizima / Nilfgaard",
    toussaint: "Toussaint",
    mobile: FALLBACK_REGION,
  };
  return aliases[raw] ?? FALLBACK_REGION;
}

function classifiedSurfaces(item) {
  const results = [];
  for (const surface of item.potential_surfaces ?? []) {
    const normalized = String(surface).toLowerCase();
    for (const type of REALIZATION_TYPES) {
      if (type.matches.some(token => normalized.includes(token))) {
        results.push({ type: type.id, label: type.label, surface });
        break;
      }
    }
  }
  return results;
}

export function deriveEligible(snapshot, presentation) {
  const config = presentation?.regional_spread ?? {};
  const regions = config.region_order?.length
    ? [...config.region_order]
    : ["White Orchard", "Velen", "Novigrad", "Skellige", "Kaer Morhen", "Vizima / Nilfgaard", "Toussaint", FALLBACK_REGION];

  const knowledgeBySeedRegion = new Map();
  for (const item of snapshot?.knowledge ?? []) {
    if (!item.seed_id) continue;
    const region = normalizedRegion(item, config);
    const key = `${item.seed_id}::${region}`;
    if (!knowledgeBySeedRegion.has(key)) knowledgeBySeedRegion.set(key, []);
    knowledgeBySeedRegion.get(key).push(item);
  }

  const byRegion = new Map(regions.map(region => [region, []]));
  for (const future of snapshot?.frontier ?? []) {
    if (future.kind !== "probable-future" || future.status !== "ACTIVE" || !future.seed_id) continue;
    const surfaces = classifiedSurfaces(future);
    if (!surfaces.length) continue;

    for (const region of regions) {
      const holders = knowledgeBySeedRegion.get(`${future.seed_id}::${region}`) ?? [];
      if (!holders.length) continue;

      const channels = [...new Set(holders.map(item => item.channel).filter(Boolean))].sort();
      const holderNames = [...new Set(holders.map(item => item.holder).filter(Boolean))].sort();
      const confidenceValues = holders
        .map(item => item.confidence)
        .filter(value => typeof value === "number");
      const maxConfidence = confidenceValues.length ? Math.max(...confidenceValues) : null;

      for (const surface of surfaces) {
        byRegion.get(region).push({
          id: `${future.id}:${region}:${surface.type}`,
          type: surface.type,
          typeLabel: surface.label,
          surface: surface.surface,
          region,
          future,
          holders,
          channels,
          holderNames,
          maxConfidence,
        });
      }
    }
  }

  for (const items of byRegion.values()) {
    items.sort((left, right) =>
      (right.future.pressure ?? -1) - (left.future.pressure ?? -1)
      || left.typeLabel.localeCompare(right.typeLabel)
      || String(left.future.title).localeCompare(String(right.future.title))
    );
  }

  return { regions, byRegion };
}

function regionButton(region, count, selected) {
  return `
    <button
      type="button"
      class="eligible-region${selected ? " is-active" : ""}"
      data-eligible-region="${escapeHtml(region)}"
      aria-pressed="${selected}"
    >
      <span>${escapeHtml(region)}</span>
      <strong>${count}</strong>
    </button>`;
}

function eligibilityCard(item) {
  const pressure = typeof item.future.pressure === "number"
    ? item.future.pressure.toFixed(3)
    : "—";
  const confidence = item.maxConfidence == null ? "—" : item.maxConfidence.toFixed(3);
  const holderText = item.holderNames.length ? item.holderNames.join(", ") : "regional holder";
  const channelText = item.channels.length ? item.channels.map(displayLabel).join(", ") : "unknown channel";

  return `
    <article class="card eligible-card">
      <div class="eligible-card-heading">
        <span class="eligible-type">${escapeHtml(item.typeLabel)}</span>
        <span class="eligible-pressure">pressure ${escapeHtml(pressure)}</span>
      </div>
      <h3>${escapeHtml(item.future.title ?? item.future.statement ?? item.future.id)}</h3>
      <p><strong>Why here:</strong> knowledge of this seed exists in ${escapeHtml(item.region)} via ${escapeHtml(channelText)}.</p>
      <dl class="eligible-basis">
        <div><dt>Holder basis</dt><dd>${escapeHtml(holderText)}</dd></div>
        <div><dt>Best confidence</dt><dd>${escapeHtml(confidence)}</dd></div>
        <div><dt>Authored surface</dt><dd>${escapeHtml(displayLabel(item.surface))}</dd></div>
      </dl>
    </article>`;
}

export function renderEligible(snapshot, presentation, selectedRegion = null) {
  if (!snapshot) return `<div class="empty"><p>No snapshot is loaded.</p></div>`;

  const { regions, byRegion } = deriveEligible(snapshot, presentation);
  const totals = new Map(regions.map(region => [region, byRegion.get(region)?.length ?? 0]));
  const fallbackSelection = regions.find(region => totals.get(region) > 0) ?? regions[0] ?? FALLBACK_REGION;
  const region = regions.includes(selectedRegion) ? selectedRegion : fallbackSelection;
  const items = byRegion.get(region) ?? [];

  const byType = new Map(REALIZATION_TYPES.map(type => [type.id, []]));
  for (const item of items) byType.get(item.type)?.push(item);

  const counters = REALIZATION_TYPES.map(type => `
    <div class="eligible-count">
      <strong>${byType.get(type.id)?.length ?? 0}</strong>
      <span>${escapeHtml(type.label)}</span>
    </div>`).join("");

  const sections = REALIZATION_TYPES
    .filter(type => (byType.get(type.id)?.length ?? 0) > 0)
    .map(type => `
      <section class="eligible-group">
        <div class="delta-heading">
          <h3>${escapeHtml(type.label.toUpperCase())}</h3>
          <span>${byType.get(type.id).length}</span>
        </div>
        <div class="card-grid">
          ${byType.get(type.id).map(eligibilityCard).join("")}
        </div>
      </section>`).join("");

  const content = sections || `
    <div class="empty eligible-empty">
      <p>No demo realization surfaces intersect propagated knowledge in ${escapeHtml(region)} on WD ${escapeHtml(snapshot.world_day)}.</p>
    </div>`;

  return `
    <header class="mode-heading eligible-heading">
      <div>
        <p class="eyebrow">ELIGIBLE · DEMO-DERIVED</p>
        <p>Where an ACTIVE authored realization surface intersects knowledge that has actually reached the selected region. This is a presentation-layer demo join, not a separate engine authority.</p>
      </div>
    </header>
    <div class="eligible-region-picker" role="group" aria-label="Eligible realization region">
      ${regions.map(candidate => regionButton(candidate, totals.get(candidate), candidate === region)).join("")}
    </div>
    <div class="eligible-summary">
      <div>
        <p class="eyebrow">${escapeHtml(region)}</p>
        <h3>What can surface here on WD ${escapeHtml(snapshot.world_day)}?</h3>
      </div>
      <div class="eligible-counts">${counters}</div>
    </div>
    ${content}`;
}
