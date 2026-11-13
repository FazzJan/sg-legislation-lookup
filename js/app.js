'use strict';

const $ = (id) => document.getElementById(id);
const els = {
  search: $('searchBox'), chips: $('statuteChips'), results: $('results'), detail: $('detail'),
  empty: $('empty'), count: $('resultCount'), loading: $('loadingStatus'), layout: document.querySelector('.layout'),
  qAct: $('qAct'), qTerm: $('qTerm'), quickOut: $('quickOut'), stats: $('dataStats'),
};
const MAX_ROWS = 40;

const state = { acts: [], byId: {}, rows: [], filter: 'all', matches: [], active: -1, selected: null };

const ARREST_LABEL = {
  yes: 'Arrestable', no: 'Not arrestable', conditional: 'Conditional', depends: 'Depends', check: 'Check Act',
};
const BAIL_LABEL = { yes: 'Bailable', no: 'Not bailable', depends: 'Depends', check: 'Check Act' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('legis-theme', t); } catch (_) {}
}
$('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(cur === 'dark' ? 'light' : 'dark');
});

/* ---------- links ---------- */
function baseSection(sec) {
  return String(sec).replace(/\(.*$/, '').replace(/\s+/g, '');
}
function ssoUrl(act, section) {
  if (!act) return 'https://sso.agc.gov.sg';
  if (!section) return `https://sso.agc.gov.sg/Act/${act.code}`;
  const s = baseSection(section);
  return `https://sso.agc.gov.sg/Act/${act.code}?ProvIds=pr${s}-#pr${s}-`;
}

/* ---------- search ---------- */
function normalise(s) { return String(s).toLowerCase().replace(/^(section|sec|s)\.?\s*/i, '').trim(); }

function search(query) {
  const q = normalise(query);
  if (!q) return [];
  const words = q.split(/\s+/);
  const out = [];
  for (const r of state.rows) {
    if (state.filter !== 'all' && r.act.id !== state.filter) continue;
    const sec = r.section.toLowerCase();
    let score;
    if (sec === q) score = 0;
    else if (baseSection(sec) === q) score = 1;
    else if (sec.startsWith(q)) score = 2;
    else if (words.every((w) => r._hay.includes(w))) score = r.offence.toLowerCase().includes(q) ? 3 : 4;
    else continue;
    out.push([score, r]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1]._order - b[1]._order);
  return out.map((x) => x[1]);
}

function renderResults() {
  const q = els.search.value;
  els.results.innerHTML = '';
  state.active = -1;
  if (!q.trim()) {
    els.empty.hidden = true;
    els.count.textContent = `${state.rows.length.toLocaleString()} offences indexed · type to search`;
    return;
  }
  const list = search(q);
  state.matches = list;
  els.count.textContent = list.length ? `${list.length} match${list.length === 1 ? '' : 'es'}` : 'No matches';
  if (!list.length) { showEmpty(q); return; }
  els.empty.hidden = true;
  const frag = document.createDocumentFragment();
  list.slice(0, MAX_ROWS).forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'row';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(state.selected === r));
    b.innerHTML = `<span class="row-sec">§ ${esc(r.section)}</span>
      <span><div class="row-title">${esc(r.offence)}</div><div class="row-act">${esc(r.act.short)}</div></span>
      <span class="pill ${r.arrest}">${ARREST_LABEL[r.arrest]}</span>`;
    b.addEventListener('click', () => select(r, true));
    b.dataset.i = i;
    frag.appendChild(b);
  });
  if (list.length > MAX_ROWS) {
    const m = document.createElement('div');
    m.className = 'more';
    m.textContent = `+ ${list.length - MAX_ROWS} more — refine your search or pick a statute`;
    frag.appendChild(m);
  }
  els.results.appendChild(frag);
}

function showEmpty(q) {
  const act = state.filter !== 'all' ? state.byId[state.filter] : null;
  const sec = (normalise(q).match(/^\d+[a-z]*/i) || [])[0];
  const links = [];
  if (act && sec) links.push(`<a class="btn primary" href="${ssoUrl(act, sec.toUpperCase())}" target="_blank" rel="noopener">${esc(act.short)} § ${esc(sec.toUpperCase())} on SSO</a>`);
  links.push(`<a class="btn" href="https://sso.agc.gov.sg/Search/Content?Phrase=${encodeURIComponent(q)}" target="_blank" rel="noopener">Search SSO</a>`);
  links.push(`<a class="btn" href="https://github.com/FazzJan/sg-legislation-lookup/issues/new?title=${encodeURIComponent('Add: ' + (act ? act.short + ' ' : '') + q)}" target="_blank" rel="noopener">Request this section</a>`);
  els.empty.innerHTML = `<h3>Not indexed yet</h3>
    <p>${act ? `Nothing in ${esc(act.name)} matches “${esc(q)}”.` : `Nothing matches “${esc(q)}”. Pick a statute above to get a direct SSO link.`}
    You can use the <a href="#quick">quick arrest check</a> below with the maximum punishment.</p>
    <div class="links">${links.join('')}</div>`;
  els.empty.hidden = false;
}

/* ---------- detail ---------- */
function basisText(r) {
  const p = r.act.arrestPower;
  if (r.act.id === 'PC1871') return 'CPC 2010 First Schedule entry for this Penal Code section.';
  if (p.type === 'none') return `${p.summary}`;
  return `${r.act.short} ${p.provision}: ${p.summary}`;
}

function setTile(id, valueId, kind, label) {
  $(id).className = `tile ${kind || ''}`;
  $(valueId).textContent = label;
}

function select(r, fromClick) {
  state.selected = r;
  els.detail.hidden = false;
  els.layout.classList.add('has-detail');
  $('dStatute').textContent = r.act.name;
  $('dSection').textContent = r.section;
  $('dOffence').textContent = r.offence;
  setTile('tArrest', 'vArrest', r.arrest, ARREST_LABEL[r.arrest]);
  // Bail: "no" bail is the serious outcome, so reuse the red/green palette inverted.
  const bailKind = { yes: 'no', no: 'yes' }[r.bail] || r.bail;
  setTile('tBail', 'vBail', bailKind, BAIL_LABEL[r.bail]);
  const proc = /^(warrant|summons)$/i.test(r.process || '') ? r.process : (r.process ? 'See detail' : '—');
  setTile('tProcess', 'vProcess', '', proc);
  $('dPunishment').textContent = r.punishment || '—';
  $('dArrestText').textContent = r.arrestText || ARREST_LABEL[r.arrest];
  const showBail = r.bailText && !/^(not )?bailable$/i.test(r.bailText);
  $('bailTextRow').hidden = !showBail;
  $('dBailText').textContent = r.bailText || '';
  $('dBasis').textContent = basisText(r);
  $('noteRow').hidden = !r.note;
  $('dNote').textContent = r.note || '';
  $('ssoLink').href = r.link || ssoUrl(r.act, r.section);
  history.replaceState(null, '', `#${r.act.id}/${encodeURIComponent(r.section)}`);
  [...els.results.querySelectorAll('.row')].forEach((b) => b.setAttribute('aria-selected', String(state.matches[+b.dataset.i] === r)));
  if (fromClick && matchMedia('(max-width: 860px)').matches) els.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
  catch (_) { toast('Copy failed — use the address bar'); }
});
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

/* ---------- chips ---------- */
function renderChips() {
  const counts = {};
  state.rows.forEach((r) => { counts[r.act.id] = (counts[r.act.id] || 0) + 1; });
  const items = [{ id: 'all', short: 'All', n: state.rows.length }, ...state.acts.map((a) => ({ id: a.id, short: a.short, n: counts[a.id] || 0, name: a.name }))];
  els.chips.innerHTML = items.map((a) => `<button type="button" class="chip" role="tab" data-id="${a.id}" aria-selected="${a.id === state.filter}" title="${esc(a.name || 'All statutes')}">${esc(a.short)}<span class="n">${a.n}</span></button>`).join('');
  els.chips.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
    state.filter = c.dataset.id;
    els.chips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-selected', String(x === c)));
    renderResults();
    els.search.focus();
  }));
}

/* ---------- quick check ---------- */
function renderQuick() {
  const act = state.byId[els.qAct.value];
  const term = els.qTerm.value;
  const serious = term === 'death' || term === '3plus';
  const cpc = serious
    ? { arrest: 'yes', bail: 'no', process: 'Warrant' }
    : { arrest: 'no', bail: 'yes', process: 'Summons' };
  let caveat = '';
  let arrest = cpc.arrest;
  let bail = cpc.bail;
  if (act) {
    const p = act.arrestPower;
    if (p.type === 'all') { arrest = 'yes'; if (act.id === 'VA1966') bail = 'no'; }
    else if (p.type === 'conditional' && !serious) arrest = 'conditional';
    else if (p.type === 'listed' && !serious) arrest = 'check';
    caveat = p.type === 'none'
      ? `${esc(act.name)}: ${esc(p.summary)}`
      : `<strong>${esc(act.short)} ${esc(p.provision)}</strong> — ${esc(p.summary)}`;
  } else {
    caveat = 'Open the Act on SSO and look for a general power of arrest (often near the end, e.g. “Powers of arrest”) or a section-specific clause before relying on the default.';
  }
  const bailKind = { yes: 'no', no: 'yes' }[bail] || bail;
  els.quickOut.innerHTML = `
    <div class="tiles">
      <div class="tile ${arrest}"><span class="tile-label">Arrest without warrant</span><span class="tile-value">${ARREST_LABEL[arrest]}</span></div>
      <div class="tile ${bailKind}"><span class="tile-label">Bailable</span><span class="tile-value">${BAIL_LABEL[bail]}</span></div>
      <div class="tile"><span class="tile-label">Process (CPC default)</span><span class="tile-value">${cpc.process}</span></div>
    </div>
    <p class="muted">CPC 2010 First Schedule, offences against other laws: ${serious
      ? 'punishable with death or imprisonment for 3 years and upwards → may arrest without warrant, warrant, not bailable.'
      : 'punishable with imprisonment for less than 3 years or with fine only → shall not arrest without warrant, summons, bailable.'}</p>
    <p class="callout">${caveat}</p>`;
}

/* ---------- keyboard ---------- */
els.search.addEventListener('input', renderResults);
els.search.addEventListener('keydown', (e) => {
  const rows = [...els.results.querySelectorAll('.row')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!rows.length) return;
    e.preventDefault();
    state.active = e.key === 'ArrowDown' ? Math.min(state.active + 1, rows.length - 1) : Math.max(state.active - 1, 0);
    rows.forEach((r, i) => r.classList.toggle('active', i === state.active));
    rows[state.active].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    const r = state.matches[state.active >= 0 ? state.active : 0];
    if (r) select(r, true);
  } else if (e.key === 'Escape') {
    els.search.value = ''; renderResults();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== els.search && !/input|select|textarea/i.test(document.activeElement.tagName)) {
    e.preventDefault(); els.search.focus();
  }
});
els.qAct.addEventListener('change', renderQuick);
els.qTerm.addEventListener('change', renderQuick);

/* ---------- load ---------- */
async function init() {
  try {
    const acts = await fetch('data/acts.json').then((r) => r.json());
    const lists = await Promise.all(acts.map((a) => fetch(`data/acts/${a.id}.json`).then((r) => (r.ok ? r.json() : []))));
    state.acts = acts;
    acts.forEach((a, i) => {
      state.byId[a.id] = a;
      lists[i].forEach((row) => {
        row.act = a;
        row._order = state.rows.length;
        row._hay = [row.section, row.offence, row.punishment, a.short, a.name].join(' ').toLowerCase();
        state.rows.push(row);
      });
    });
    renderChips();
    els.qAct.innerHTML = '<option value="">Another Act (not listed)</option>'
      + acts.filter((a) => a.id !== 'PC1871').map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
    renderQuick();
    els.stats.textContent = `${state.rows.length.toLocaleString()} offences across ${acts.length} statutes.`;
    const m = location.hash.match(/^#([A-Z0-9]+)\/(.+)$/);
    if (m) {
      const sec = decodeURIComponent(m[2]);
      const r = state.rows.find((x) => x.act.id === m[1] && x.section === sec);
      if (r) { els.search.value = r.section; state.filter = 'all'; renderResults(); select(r); return; }
    }
    renderResults();
  } catch (err) {
    console.error(err);
    els.count.textContent = 'Could not load data — please refresh.';
  }
}
init();
