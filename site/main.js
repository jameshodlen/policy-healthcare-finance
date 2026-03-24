/* Healthcare Finance Platform — Interactive Components */

const TIER_COLORS = {
  Full: '#0e6b3a',
  Substantial: '#1e7a8a',
  Partial: '#d4920b',
  Minimal: '#c23616',
  None: '#6b1a1a'
};

function tierClass(tier) {
  return (tier || 'none').toLowerCase();
}

function renderTransBar(pct, tier) {
  const color = TIER_COLORS[tier] || '#999';
  return `<div class="trans-bar-wrap">
    <div class="trans-bar"><div class="trans-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="pct-text">${pct}%</span>
  </div>`;
}

function renderTierBadge(tier) {
  return `<span class="tier-badge ${tierClass(tier)}">${tier}</span>`;
}

function renderTierBars(tiers, total) {
  const order = ['Full','Substantial','Partial','Minimal','None'];
  let html = '';
  for (const t of order) {
    const count = tiers[t] || 0;
    if (count > 0) {
      const pct = (count / total) * 100;
      html += `<div class="tier-bar" style="flex:${pct};background:${TIER_COLORS[t]}" title="${t}: ${count}"></div>`;
    }
  }
  return html;
}

/* Sort a table by column index */
function sortTable(tableId, colIdx, type) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const th = table.querySelectorAll('th')[colIdx];

  // Toggle direction
  const currentDir = th.classList.contains('sorted-asc') ? 'asc' : 'desc';
  const newDir = currentDir === 'asc' ? 'desc' : 'asc';

  // Clear other sort indicators
  table.querySelectorAll('th').forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
  th.classList.add('sorted-' + newDir);

  rows.sort((a, b) => {
    let va = a.cells[colIdx]?.dataset?.val || a.cells[colIdx]?.textContent?.trim() || '';
    let vb = b.cells[colIdx]?.dataset?.val || b.cells[colIdx]?.textContent?.trim() || '';
    if (type === 'number') {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    }
    let cmp = va > vb ? 1 : va < vb ? -1 : 0;
    return newDir === 'desc' ? -cmp : cmp;
  });

  rows.forEach(r => tbody.appendChild(r));
}

/* Render state hospital table */
function renderHospitalTable(containerId, hospitals, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = [...hospitals];
  
  // Apply filters
  const systemFilter = options.systemFilter;
  const tierFilter = options.tierFilter;
  if (systemFilter && systemFilter !== 'all') {
    filtered = filtered.filter(h => h.system === systemFilter);
  }
  if (tierFilter && tierFilter !== 'all') {
    filtered = filtered.filter(h => h.tier === tierFilter);
  }

  const tableId = containerId + '-table';
  let html = `<div class="data-table-wrapper"><table class="data-table" id="${tableId}">
    <thead><tr>
      <th onclick="sortTable('${tableId}',0,'string')">Hospital</th>
      <th onclick="sortTable('${tableId}',1,'string')">System</th>
      <th onclick="sortTable('${tableId}',2,'number')" class="sorted-asc">Transparency</th>
      <th onclick="sortTable('${tableId}',3,'string')">Tier</th>
      <th onclick="sortTable('${tableId}',4,'number')">Payers</th>
      <th onclick="sortTable('${tableId}',5,'number')">Cash Disc.</th>
    </tr></thead>
    <tbody>`;

  for (const h of filtered) {
    const cd = h.cash_discount_pct != null && h.cash_discount_pct > -50 ? h.cash_discount_pct + '%' : '—';
    html += `<tr>
      <td class="hospital-name">${h.name}</td>
      <td>${h.system}</td>
      <td class="trans-bar-cell" data-val="${h.transparency_pct}">${renderTransBar(h.transparency_pct, h.tier)}</td>
      <td data-val="${h.tier}">${renderTierBadge(h.tier)}</td>
      <td data-val="${h.payer_count}">${h.payer_count}</td>
      <td data-val="${h.cash_discount_pct || 0}">${cd}</td>
    </tr>`;
  }

  html += `</tbody></table></div>
    <p style="font-size:0.72rem;color:var(--color-muted);margin-top:0.5rem;font-family:var(--font-mono);">
      Showing ${filtered.length} of ${hospitals.length} hospitals. Click column headers to sort.
    </p>`;
  container.innerHTML = html;
}

/* Load and render a state page */
async function loadStatePage(state) {
  try {
    const res = await fetch(`/data/three_state_summary.json`);
    const data = await res.json();
    const stateData = data[state];
    if (!stateData) return;

    // Render metric strip
    const metricEl = document.getElementById('state-metrics');
    if (metricEl) {
      metricEl.innerHTML = `
        <div class="metric-item">
          <div class="metric-value">${stateData.hospitals.length}</div>
          <div class="metric-label">Hospitals Analyzed</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${stateData.median_transparency}%</div>
          <div class="metric-label">Median Transparency</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${stateData.tiers.Full}</div>
          <div class="metric-label">Full Transparency</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${stateData.tiers.Minimal + (stateData.tiers.None || 0)}</div>
          <div class="metric-label">Minimal / None</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${stateData.systems.length}</div>
          <div class="metric-label">Health Systems</div>
        </div>
      `;
    }

    // Populate filter dropdowns
    const systemSelect = document.getElementById('filter-system');
    if (systemSelect) {
      const systems = [...new Set(stateData.hospitals.map(h => h.system))].sort();
      systemSelect.innerHTML = '<option value="all">All Systems</option>' +
        systems.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Render table
    window._stateHospitals = stateData.hospitals;
    renderHospitalTable('hospital-table-container', stateData.hospitals);

    // Wire up filters
    document.getElementById('filter-system')?.addEventListener('change', applyFilters);
    document.getElementById('filter-tier')?.addEventListener('change', applyFilters);

  } catch (err) {
    console.error('Failed to load state data:', err);
  }
}

function applyFilters() {
  const system = document.getElementById('filter-system')?.value;
  const tier = document.getElementById('filter-tier')?.value;
  renderHospitalTable('hospital-table-container', window._stateHospitals, {
    systemFilter: system,
    tierFilter: tier
  });
}

/* Load landing page state cards */
async function loadLandingPage() {
  try {
    const res = await fetch('/data/three_state_summary.json');
    const data = await res.json();

    for (const [state, label, finding] of [
      ['WI', 'Wisconsin', 'ThedaCare achieves 100% at all 9 facilities. Froedtert (Milwaukee flagship) discloses only <strong>6 payers</strong>.'],
      ['MN', 'Minnesota', 'HealthPartners Regions Hospital discloses <strong>6.9%</strong> of payer rates — the lowest non-zero score in 99 hospitals.'],
      ['IL', 'Illinois', 'UChicago Medical Center discloses payer rates for only <strong>2.9%</strong> of items — DRG bundles only.'],
    ]) {
      const d = data[state];
      if (!d) continue;
      const card = document.getElementById('card-' + state);
      if (!card) continue;

      card.querySelector('.median-score').textContent = d.median_transparency + '%';
      card.querySelector('.median-label').textContent = `Median transparency · ${d.total_hospitals} hospitals`;
      card.querySelector('.tier-bars').innerHTML = renderTierBars(d.tiers, d.total_hospitals);
      card.querySelector('.finding').innerHTML = finding;
    }
  } catch (err) {
    console.error('Failed to load landing data:', err);
  }
}
