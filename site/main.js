/* Healthcare Finance Platform — Interactive Components */

const DATA_URL = '/data/state_data.json';

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',
  FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',
  IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
  NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

const REGIONS = {
  Midwest:['IA','IL','IN','KS','MI','MN','MO','ND','NE','OH','SD','WI'],
  South:['AL','AR','DC','DE','FL','GA','KY','LA','MD','MS','NC','OK','SC','TN','TX','VA','WV'],
  Northeast:['CT','MA','ME','NH','NJ','NY','PA','RI','VT'],
  West:['AK','AZ','CA','CO','HI','ID','MT','NM','NV','OR','UT','WA','WY']
};

function stateSlug(code) {
  return (STATE_NAMES[code] || code).toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
}

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
    const res = await fetch(DATA_URL);
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

/* Load landing page — dynamic state cards from data */
async function loadLandingPage() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const states = Object.keys(data).sort((a, b) =>
      (STATE_NAMES[a] || a).localeCompare(STATE_NAMES[b] || b)
    );

    // National metrics
    let totalHospitals = 0, allTransparencies = [];
    for (const s of states) {
      totalHospitals += data[s].total_hospitals;
      allTransparencies.push(data[s].median_transparency);
    }
    allTransparencies.sort((a, b) => a - b);
    const natMedian = allTransparencies.length
      ? allTransparencies[Math.floor(allTransparencies.length / 2)]
      : 0;

    const metricEl = document.getElementById('national-metrics');
    if (metricEl) {
      metricEl.innerHTML = `
        <div class="metric-item">
          <div class="metric-value">${states.length}</div>
          <div class="metric-label">States Analyzed</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${totalHospitals}</div>
          <div class="metric-label">Hospitals Profiled</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${natMedian}%</div>
          <div class="metric-label">Median Transparency</div>
        </div>
      `;
    }

    // Populate dynamic state card grid
    const grid = document.getElementById('state-card-grid');
    if (grid) {
      let html = '';
      for (const s of states) {
        const d = data[s];
        const name = STATE_NAMES[s] || s;
        const sl = stateSlug(s);
        html += `<a class="state-card" href="/${sl}.html">
          <div class="state-label">State Profile</div>
          <div class="state-name">${name}</div>
          <div class="median-score">${d.median_transparency}%</div>
          <div class="median-label">Median transparency · ${d.total_hospitals} hospitals</div>
          <div class="tier-bars">${renderTierBars(d.tiers, d.total_hospitals)}</div>
        </a>`;
      }
      grid.innerHTML = html;
    }

    // Legacy: populate any hard-coded cards
    for (const s of states) {
      const card = document.getElementById('card-' + s);
      if (!card) continue;
      const d = data[s];
      card.querySelector('.median-score').textContent = d.median_transparency + '%';
      card.querySelector('.median-label').textContent = `Median transparency · ${d.total_hospitals} hospitals`;
      card.querySelector('.tier-bars').innerHTML = renderTierBars(d.tiers, d.total_hospitals);
    }
  } catch (err) {
    console.error('Failed to load landing data:', err);
  }
}

/* Load states index page */
async function loadStatesIndex() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const states = Object.keys(data).sort((a, b) =>
      (STATE_NAMES[a] || a).localeCompare(STATE_NAMES[b] || b)
    );

    // National metrics
    let totalHospitals = 0, totalFull = 0, totalMinNone = 0;
    for (const s of states) {
      const d = data[s];
      totalHospitals += d.total_hospitals;
      totalFull += (d.tiers.Full || 0);
      totalMinNone += (d.tiers.Minimal || 0) + (d.tiers.None || 0);
    }

    const metricEl = document.getElementById('national-metrics');
    if (metricEl) {
      metricEl.innerHTML = `
        <div class="metric-item">
          <div class="metric-value">${states.length}</div>
          <div class="metric-label">States Analyzed</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${totalHospitals}</div>
          <div class="metric-label">Hospitals Profiled</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${totalFull}</div>
          <div class="metric-label">Full Transparency</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${totalMinNone}</div>
          <div class="metric-label">Minimal / None</div>
        </div>
      `;
    }

    // Build reverse lookup: state -> region
    const stateRegion = {};
    for (const [region, codes] of Object.entries(REGIONS)) {
      for (const c of codes) stateRegion[c] = region;
    }

    function renderGrid(filter, search) {
      const grid = document.getElementById('state-grid');
      if (!grid) return;
      let html = '';
      for (const s of states) {
        const name = STATE_NAMES[s] || s;
        const region = stateRegion[s] || '';
        if (filter !== 'all' && region !== filter) continue;
        if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;

        const d = data[s];
        const sl = stateSlug(s);
        html += `<a class="state-card" href="/${sl}.html">
          <div class="state-label">${region}</div>
          <div class="state-name">${name}</div>
          <div class="median-score">${d.median_transparency}%</div>
          <div class="median-label">Median · ${d.total_hospitals} hospitals</div>
          <div class="tier-bars">${renderTierBars(d.tiers, d.total_hospitals)}</div>
        </a>`;
      }
      if (!html) html = '<p style="color:var(--color-muted);">No states match your filter.</p>';
      grid.innerHTML = html;
    }

    renderGrid('all', '');

    document.getElementById('region-filter')?.addEventListener('change', () => {
      renderGrid(
        document.getElementById('region-filter').value,
        document.getElementById('state-search')?.value || ''
      );
    });
    document.getElementById('state-search')?.addEventListener('input', () => {
      renderGrid(
        document.getElementById('region-filter')?.value || 'all',
        document.getElementById('state-search').value
      );
    });

  } catch (err) {
    console.error('Failed to load states index:', err);
  }
}
