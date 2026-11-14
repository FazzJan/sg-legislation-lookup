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

/* ---------- display settings: theme, font, text size ---------- */
const FONTS = [
  ['System font', "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif"],
  ['Inter', "'Inter', system-ui, sans-serif"],
  ['Roboto', "'Roboto', system-ui, sans-serif"],
  ['Open Sans', "'Open Sans', system-ui, sans-serif"],
  ['Lato', "'Lato', system-ui, sans-serif"],
  ['Source Sans 3', "'Source Sans 3', system-ui, sans-serif"],
  ['IBM Plex Sans', "'IBM Plex Sans', system-ui, sans-serif"],
  ['Atkinson Hyperlegible', "'Atkinson Hyperlegible', system-ui, sans-serif"],
  ['Nunito', "'Nunito', system-ui, sans-serif"],
  ['Merriweather (serif)', "'Merriweather', Georgia, serif"],
  ['Lora (serif)', "'Lora', Georgia, serif"],
];
const ZOOMS = [0.85, 0.9, 1, 1.1, 1.2, 1.35, 1.5];
const root = document.documentElement;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} },
};
function applyTheme(t) {
  if (t === 'auto') { delete root.dataset.theme; store.set('legis-theme', null); }
  else { root.dataset.theme = t; store.set('legis-theme', t); }
  document.querySelectorAll('#themeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeVal === t)));
}
function applyFont(stack) {
  root.style.setProperty('--sans', stack); store.set('legis-font', stack);
  $('fontSelect').value = stack;
}
function applyZoom(z) {
  root.style.setProperty('--zoom', z); store.set('legis-zoom', String(z));
  $('zoomVal').textContent = `${Math.round(z * 100)}%`;
}
function initSettings() {
  $('fontSelect').innerHTML = FONTS.map(([n, st]) => `<option value="${esc(st)}" style="font-family:${esc(st)}">${esc(n)}</option>`).join('');
  $('fontSelect').value = store.get('legis-font') || FONTS[0][1];
  $('fontSelect').addEventListener('change', (e) => applyFont(e.target.value));
  let z = parseFloat(store.get('legis-zoom')) || 1;
  applyZoom(z);
  const step = (d) => {
    const i = ZOOMS.findIndex((x) => Math.abs(x - z) < 0.001);
    z = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 2 : i) + d))];
    applyZoom(z);
  };
  $('zoomIn').addEventListener('click', () => step(1));
  $('zoomOut').addEventListener('click', () => step(-1));
  document.querySelectorAll('#themeSeg button').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeVal)));
  applyTheme(store.get('legis-theme') || 'auto');
  $('resetDisplay').addEventListener('click', () => {
    z = 1; applyZoom(1); applyFont(FONTS[0][1]); applyTheme('auto');
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#settings')) $('settings').open = false; });
}
initSettings();
$('reloadLatest').addEventListener('click', () => forceUpdate());

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

function search(query, filter = state.filter) {
  // "PC 379" / "POHA 4": a leading Act code or short name narrows the search to that Act.
  const parts = String(query).trim().split(/\s+/);
  if (parts.length > 1 && filter === 'all') {
    const act = actFromToken(parts[0]);
    if (act) { filter = act.id; query = parts.slice(1).join(' '); }
  }
  const q = normalise(query);
  if (!q) return [];
  const words = q.split(/\s+/);
  const out = [];
  for (const r of state.rows) {
    if (filter !== 'all' && r.act.id !== filter) continue;
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
    b.innerHTML = `<span class="row-sec">${esc(r.section)}</span>
      <span><div class="row-title">${esc(r.offence)}</div><div class="row-act">${esc(r.act.short)}</div></span>
      <span class="badge ${r.arrest}">${ARREST_LABEL[r.arrest]}</span>`;
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
  if (act && sec) links.push(`<a class="btn filled" href="${ssoUrl(act, sec.toUpperCase())}" target="_blank" rel="noopener">${esc(act.short)} § ${esc(sec.toUpperCase())} on SSO</a>`);
  links.push(`<a class="btn tinted" href="https://sso.agc.gov.sg/Search/Content?Phrase=${encodeURIComponent(q)}" target="_blank" rel="noopener">Search SSO</a>`);
  links.push(`<a class="btn tinted" href="https://github.com/FazzJan/sg-legislation-lookup/issues/new?title=${encodeURIComponent('Add: ' + (act ? act.short + ' ' : '') + q)}" target="_blank" rel="noopener">Request this section</a>`);
  els.empty.innerHTML = `<h3>Not indexed yet</h3>
    <p>${act ? `Nothing in ${esc(act.name)} matches “${esc(q)}”.` : `Nothing matches “${esc(q)}”. Pick a statute above to get a direct SSO link.`}
    Try the <a href="#" id="openQuick">quick arrest check</a> below with the maximum punishment.</p>
    <div class="links">${links.join('')}</div>`;
  els.empty.hidden = false;
  $('openQuick').addEventListener('click', (e) => { e.preventDefault(); $('quick').open = true; $('quick').scrollIntoView({ behavior: 'smooth' }); });
}

/* ---------- detail ---------- */
function basisText(r) {
  const p = r.act.arrestPower;
  if (r.act.id === 'PC1871') return 'CPC 2010 First Schedule entry for this Penal Code section.';
  const v = p.verified ? ` (Arrest provision checked: ${p.verified}.)` : ' (Arrest provision not yet checked against the Act text.)';
  if (p.type === 'none') return `${p.summary}${v}`;
  return `${r.act.short} ${p.provision}: ${p.summary}${v}`;
}

function setTile(id, valueId, kind, label) {
  $(id).className = `stat ${kind || ''}`;
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
  $('chargeLink').hidden = false;
  $('chargeLink').href = `#charge/${r.act.id}/${encodeURIComponent(r.section)}`;
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
    <div class="status">
      <div class="stat ${arrest}"><span class="stat-label">Arrest without warrant</span><span class="stat-value">${ARREST_LABEL[arrest]}</span></div>
      <div class="stat ${bailKind}"><span class="stat-label">Bailable</span><span class="stat-value">${BAIL_LABEL[bail]}</span></div>
      <div class="stat"><span class="stat-label">Process (CPC default)</span><span class="stat-value">${cpc.process}</span></div>
    </div>
    <p class="secondary">CPC 2010 First Schedule, offences against other laws: ${serious
      ? 'punishable with death or imprisonment for 3 years and upwards → may arrest without warrant, warrant, not bailable.'
      : 'punishable with imprisonment for less than 3 years or with fine only → shall not arrest without warrant, summons, bailable.'}</p>
    <p>${caveat}</p>`;
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

/* ---------- views ---------- */
let guideLoaded = false;
let chargeLoaded = false;
function currentView() {
  const h = location.hash;
  if (h === '#exhibits') return 'exhibits';
  if (h === '#npc') return 'npc';
  if (h === '#osint' || h.startsWith('#osint/')) return 'osint';
  if (h === '#charge' || h.startsWith('#charge/')) return 'charge';
  return 'offences';
}
function showView() {
  const v = currentView();
  $('viewOffences').hidden = v !== 'offences';
  $('viewCharge').hidden = v !== 'charge';
  $('viewExhibits').hidden = v !== 'exhibits';
  $('viewNpc').hidden = v !== 'npc';
  $('viewOsint').hidden = v !== 'osint';
  document.querySelectorAll('[data-view]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === v)));
  if (v === 'exhibits' && !guideLoaded) loadGuide();
  if (v === 'charge') loadCharge();
  if (v === 'npc') loadNpc();
  if (v === 'osint' && window.loadOsint) window.loadOsint();
}
document.querySelectorAll('[data-view], [data-view-link]').forEach((t) => t.addEventListener('click', (e) => {
  e.preventDefault();
  const v = t.dataset.view || t.dataset.viewLink;
  history.pushState(null, '', v === 'offences' ? location.pathname : `#${v}`);
  showView();
  window.scrollTo({ top: 0 });
}));
window.addEventListener('popstate', showView);
window.addEventListener('hashchange', showView);

async function loadGuide() {
  guideLoaded = true;
  try {
    const g = (await getBundle()).guide;
    $('exStatus').textContent = `${g.status === 'draft' ? 'Draft' : 'Verified'} · reviewed ${g.lastReviewed.split('-').reverse().join('/')}. ${g.statusNote}`;
    $('exFlow').innerHTML = g.flow.map((f) => `<li><b>${esc(f.step)}</b><span>${esc(f.text)}</span></li>`).join('');
    const label = { verified: 'Verified', partial: 'Partly verified', pending: 'Pending' };
    $('exSections').innerHTML = g.sections.map((x) => `<details class="sec">
      <summary><span class="sec-num">s.${esc(x.s)}</span><h3>${esc(x.heading || 'Heading not yet verified')}</h3></summary>
      <div class="sec-body"><p>${esc(x.summary)}</p>
      <span class="badge ${x.status}">${label[x.status]}</span> &nbsp;<a href="https://sso.agc.gov.sg/Act/CPC2010?ProvIds=pr${esc(x.s)}-#pr${esc(x.s)}-" target="_blank" rel="noopener">Read on SSO ↗</a></div>
    </details>`).join('');
    $('exCaveat').textContent = g.caveat;
    renderHelper(g.helper);
  } catch (err) {
    console.error(err);
    $('exStatus').textContent = 'Could not load the guide — please refresh.';
  }
}

/* ---------- charge generator ---------- */
// Type an offence code; get a draft with [placeholders] and a filled-in sample, both copyable.
let charges = null;
function findTemplate(section, actId = 'PC1871') {
  // Templates are Penal Code unless they name another Act with "act".
  if (!charges) return null;
  const s = String(section);
  const list = charges.templates.filter((t) => (t.act || 'PC1871') === actId);
  return list.find((t) => t.section === s)
    || list.find((t) => t.section.replace(/\(.*$/, '') === s)
    || list.find((t) => t.section === `${s}(1)`) || null;
}
const ORD = (n) => { const v = n % 100; return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'); };
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg); } catch (_) { toast('Copy failed'); } }

// "PC 379", "poha 3", "379": an optional Act code or short name, then the section or keywords.
function actFromToken(tok) {
  const t = tok.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (t.length < 2) return null;
  return state.acts.find((a) => [a.code, a.short, ...(a.aliases || [])].some((n) => {
    const x = String(n).toLowerCase().replace(/[^a-z0-9]/g, '');
    return x === t || (t.length >= 2 && /^[a-z]+$/.test(t) && x.replace(/\d+$/, '') === t);
  })) || null;
}
function chargeSearch(q) { return search(q, 'all'); }

let chargeRow = null;
async function loadCharge() {
  if (!chargeLoaded) {
    chargeLoaded = true;
    charges = (await getBundle()).charges;
    $('cDisclaimer').textContent = `${charges.disclaimer} Source: ${charges.source}.`;
    $('cSearch').addEventListener('input', renderChargeResults);
    $('cSearch').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = $('cResults').querySelector('.row'); if (first) first.click(); }
    });
    $('cS34').addEventListener('change', renderCharge);
    $('cAttempt').addEventListener('change', renderCharge);
    $('cAmalg').addEventListener('change', renderCharge);
    $('cCopy').addEventListener('click', () => copyText(plainOf('cOut'), 'Draft copied'));
    $('cCopySample').addEventListener('click', () => copyText(plainOf('cSample'), 'Sample copied'));
  }
  await rowsReady;
  // #charge/PC1871/379 (from the Offences tab) or the older #charge/379.
  const m = location.hash.match(/^#charge\/(?:([A-Z0-9]+)\/)?(.+)$/);
  if (m) {
    const sec = decodeURIComponent(m[2]);
    const act = m[1] || 'PC1871';
    const r = state.rows.find((x) => x.act.id === act && x.section === sec)
      || state.rows.find((x) => x.act.id === act && baseSection(x.section) === baseSection(sec));
    if (r) { $('cSearch').value = `${r.act.short} ${r.section}`; selectCharge(r); $('cResults').innerHTML = ''; $('cStatus').textContent = ''; return; }
  }
  renderChargeResults();
}
function renderChargeResults(keepSelection) {
  const q = $('cSearch').value;
  const list = q.trim() ? chargeSearch(q) : [];
  $('cResults').innerHTML = '';
  if (!q.trim()) {
    $('cStatus').textContent = `${state.rows.length.toLocaleString()} offences · ${charges.templates.length} with full charge wording`;
    if (keepSelection !== true) { chargeRow = null; $('cDraftWrap').hidden = true; }
    return;
  }
  $('cStatus').textContent = list.length ? `${list.length} match${list.length === 1 ? '' : 'es'}` : 'No matches. Try the section number, e.g. 379 or POHA 3.';
  if (keepSelection === true && chargeRow) return;
  list.slice(0, 8).forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'row'; b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(chargeRow === r));
    const tpl = findTemplate(r.section, r.act.id);
    b.innerHTML = `<span class="row-sec">${esc(r.section)}</span>
      <span><div class="row-title">${esc(r.offence)}</div><div class="row-act">${esc(r.act.short)}${tpl ? ' · full template' : ''}</div></span>
      <span class="badge ${r.arrest}">${ARREST_LABEL[r.arrest]}</span>`;
    b.addEventListener('click', () => { selectCharge(r); $('cResults').innerHTML = ''; $('cSearch').value = `${r.act.short} ${r.section}`; $('cStatus').textContent = ''; });
    $('cResults').appendChild(b);
  });
}
function selectCharge(r) {
  chargeRow = r;
  $('cDraftWrap').hidden = false;
  $('cAct').textContent = r.act.name;
  $('cTitle').textContent = `s.${r.section} · ${r.offence}`;
  const pc = r.act.id === 'PC1871';
  $('tS34').hidden = !pc; $('tAttempt').hidden = !pc;
  // CPC s.124(4)(a)(iii): an amalgamated charge cannot specify an offence punishable with death.
  const death = /death/i.test(r.punishment || '');
  $('cAmalg').disabled = death;
  $('amalgHint').textContent = death ? 'Not allowed: punishable with death · CPC s.124(4)(a)(iii)' : 'Several incidents in one charge · CPC s.124(4)';
  $('cS34').checked = false; $('cAttempt').checked = false; $('cAmalg').checked = false;
  history.replaceState(null, '', `#charge/${r.act.id}/${encodeURIComponent(r.section)}`);
  renderCharge();
  $('cDraftWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const SAMPLE = {
  name: 'Ahmad Faizal bin Ismail', id: 'NRIC No. S9012345D', age: '32', date: '1st January 2026', time: '10.30 pm',
  place: 'Blk 123 Ang Mo Kio Avenue 3 #01-234', co: 'Lee Ah Huat, NRIC No. S2345678C',
  count: '5', from: '1st January 2026', to: '31st March 2026', places: 'various locations in Ang Mo Kio',
};
function buildCharge(r, sample) {
  const ph = (label) => `<span class="fill">[${esc(label)}]</span>`;
  const F = (label, ex) => (sample ? esc(ex) : ph(label));
  const t = findTemplate(r.section, r.act.id);
  const notes = [];
  let particulars;
  let punishable;
  if (t) {
    // In the sample, "the said {victim}" repeats just the name, not the name and ID.
    const shortName = (k) => { const f = t.fields.find((x) => x.id === k); return f && f.placeholder ? esc(f.placeholder.split(',')[0]) : null; };
    const fill = (str) => str.replace(/the said \{(\w+)\}/g, (m, k) => (sample && shortName(k) ? `the said ${shortName(k)}` : m)).replace(/\{(\w+)\}/g, (_, k) => {
      const f = t.fields.find((x) => x.id === k);
      if (!f) return ph(k);
      if (f.type === 'select') {
        if (sample) return fill(esc(f.options[0]));
        const opts = f.options.map((o) => o.replace(/the said \{\w+\}/g, 'the victim').replace(/\{\w+\}/g, 'the victim'));
        if (opts.join(' / ').length <= 70) return ph(opts.join(' / '));
        notes.push(`${f.label}, choose one: ${opts.map((o, i) => `(${i + 1}) ${o}`).join('; ')}.`);
        return ph(`${f.label}: see options below`);
      }
      return sample ? esc(f.placeholder || f.label) : ph(f.label);
    });
    particulars = fill(t.particulars);
    punishable = esc(t.punishable);
    notes.push(...t.notes);
  } else {
    particulars = ph(`particulars: what the accused did that amounts to “${r.offence}”`);
    punishable = r.act.id === 'PC1871'
      ? `section ${esc(r.section)} of the Penal Code 1871`
      : null;
    notes.push('There is no full wording for this offence yet, so the particulars are left for you to write. Use the words of the section on SSO.');
    if (r.act.id !== 'PC1871') notes.push(`Check which section of the ${r.act.name} sets the punishment (often a separate penalty section) and fill it in.`);
  }
  const reads = [];
  let together = '';
  if (r.act.id === 'PC1871' && $('cAttempt').checked) {
    particulars = particulars.replace(/^did /, 'did attempt to ');
    if (!/^did attempt to /.test(particulars)) particulars = particulars.replace(/, did /, ', did attempt to ');
    const grave = t ? t.deathOrLife : /death|imprisonment for life/i.test(r.punishment || '');
    reads.push(grave ? '512(1)' : '512(2)');
  }
  if (r.act.id === 'PC1871' && $('cS34').checked) {
    together = `together with ${F('co-accused name and ID', SAMPLE.co)}, and in furtherance of the common intention of you both, `;
    reads.unshift('34');
  }
  if (reads.length && punishable) {
    const rw = reads.length === 1 ? `section ${reads[0]}` : `sections ${reads.join(' and ')}`;
    punishable = punishable.replace(' of the Penal Code 1871', ` read with ${rw} of the Penal Code 1871`);
  }
  const ending = punishable
    ? `and you have thereby committed an offence punishable under ${punishable}.`
    : `and you have thereby committed an offence under section ${esc(r.section)} of the ${esc(r.act.name)}, punishable under ${ph('penalty section')} of the ${esc(r.act.name)}.`;
  const accused = `You, ${F('name of accused', SAMPLE.name)}, ${F('NRIC / FIN / passport no.', SAMPLE.id)}, ${F('age', SAMPLE.age)} years old,`;
  let html;
  if ($('cAmalg').checked && !$('cAmalg').disabled) {
    // CPC s.124(4)(a)(i): (A) say it is amalgamated, (B) the number of incidents (or the aggregate outcome),
    // (C) that they amount to a course of conduct, (D) the dates between which they happened.
    html = `${accused}
are charged, in this amalgamated charge under section 124(4) of the Criminal Procedure Code 2010, that you, ${together}on not less than ${F('number of', SAMPLE.count)} occasions between ${F('start date', SAMPLE.from)} and ${F('end date', SAMPLE.to)}, at ${F('place or places', SAMPLE.places)}, Singapore, ${particulars}, which incidents taken together amount to a course of conduct, ${ending}`;
    notes.unshift(
      'Amalgamated charge (CPC s.124(4)): every incident must be the same offence with the same maximum punishment, and the incidents together must amount to a course of conduct, e.g. same victim or class of victims, same or similar method, same or nearby places, or within 12 months (s.124(5)).',
      'State the number of incidents, or for an offence defined by its outcome (e.g. value stolen), the total outcome across all incidents. No need to give each date: the period between the first and last is enough.',
      'On conviction the court may impose up to twice the maximum for one incident (s.124(8)(a)(ii)); caning stays within s.328. Not available if the accused relies on a different defence for each incident (s.124(7)).',
    );
  } else {
    html = `${accused}
are charged that you, ${together}on ${F('date', SAMPLE.date)}, at about ${F('time', SAMPLE.time)}, at ${F('place', SAMPLE.place)}, Singapore, ${particulars}, ${ending}`;
  }
  return { html, notes };
}
function renderCharge() {
  if (!chargeRow) return;
  const d = buildCharge(chargeRow, false);
  $('cOut').innerHTML = d.html;
  $('cSample').innerHTML = buildCharge(chargeRow, true).html;
  $('cNotes').innerHTML = d.notes.map((n) => `<li>${esc(n)}</li>`).join('');
}
function plainOf(id) { return $(id).textContent.replace(/[ \t]+\n/g, '\n').trim(); }

/* ---------- NPC finder ---------- */
let npc = null;
let npcBound = false;
async function loadNpc() {
  if (!npcBound) {
    npcBound = true;
    $('npcForm').addEventListener('submit', (e) => { e.preventDefault(); if (npc) npcSearch($('npcInput').value); else outdated(); });
  }
  if (npc) return;
  const b = await getBundle();
  if (!b.npcGeo || !b.npcNames) { outdated(); return; }
  npc = { geo: b.npcGeo, names: b.npcNames };
  $('npcMeta').textContent = `Boundaries: ${npc.geo.source}, updated ${npc.geo.sourceUpdated}. NPC names are expanded from the codes in that file; codes without a confirmed name are shown as-is.`;
  $('npcStatus').textContent = 'Enter a 6-digit postal code, an address, or coordinates.';
}
function outdated() {
  $('npcStatus').innerHTML = 'This copy of the app is out of date. <button type="button" class="text-btn" id="forceUpdate">Update now</button>';
  $('forceUpdate').addEventListener('click', forceUpdate);
}
async function forceUpdate() {
  try {
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    if (navigator.serviceWorker) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
  } catch (_) {}
  location.reload();
}
function inRing(x, y, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDistM(lat, lng, poly) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110574;
  let best = Infinity;
  for (const ring of poly) {
    for (let i = 1; i < ring.length; i++) {
      const ax = (ring[i - 1][0] - lng) * kx, ay = (ring[i - 1][1] - lat) * ky;
      const bx = (ring[i][0] - lng) * kx, by = (ring[i][1] - lat) * ky;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}
function locate(lat, lng) {
  const hits = [];
  for (const f of npc.geo.features) {
    for (const poly of f.polys) {
      if (inRing(lng, lat, poly[0]) && !poly.slice(1).some((h) => inRing(lng, lat, h))) {
        hits.push({ f, dist: edgeDistM(lat, lng, poly) });
      }
    }
  }
  return hits;
}
function npcLabel(f) {
  const code = f.npc || f.division || 'Unknown';
  const name = npc.names.npcs[code];
  const div = f.div ? (npc.names.divisions[f.div] || `${f.div} Division`) : '';
  return { title: name || code, code: name ? code : '', div, sector: !f.npc };
}
function renderNpcRows(items) {
  $('npcResults').innerHTML = items.map((it) => {
    const hits = locate(it.lat, it.lng);
    const maps = `https://www.google.com/maps?q=${it.lat},${it.lng}`;
    let body;
    if (!hits.length) {
      body = '<div class="npc-name">Outside mapped NPC boundaries</div><div class="warn">This point is not inside any boundary in the data file. Check the location.</div>';
    } else {
      body = hits.map((h) => {
        const l = npcLabel(h.f);
        return `<div class="npc-name">${esc(l.title)}</div>
          <div class="npc-sub">${[l.code, l.div].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</div>
          ${l.sector ? '<div class="warn">This area is a sector in the boundary data, with no NPC named.</div>' : ''}
          ${h.dist < 50 ? `<div class="warn">About ${Math.round(h.dist)} m from a boundary. Confirm the exact location.</div>` : ''}`;
      }).join('');
      if (hits.length > 1) body += '<div class="warn">This point falls inside more than one boundary.</div>';
    }
    return `<div class="npc-row"><div class="npc-addr">${esc(it.label)}</div>${body}
      <div class="links"><a href="${maps}" target="_blank" rel="noopener">View on map</a><span class="secondary">${it.lat.toFixed(5)}, ${it.lng.toFixed(5)}</span></div></div>`;
  }).join('');
}
async function npcSearch(q) {
  q = q.trim();
  if (!q) return;
  const m = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const lat = +m[1], lng = +m[2];
    $('npcStatus').textContent = 'Coordinates entered';
    renderNpcRows([{ label: `${lat}, ${lng}`, lat, lng }]);
    return;
  }
  $('npcStatus').textContent = 'Searching OneMap…';
  $('npcResults').innerHTML = '';
  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`OneMap returned ${res.status}`);
    const data = await res.json();
    const items = (data.results || []).slice(0, 8).map((r) => ({
      label: r.ADDRESS || r.SEARCHVAL, lat: parseFloat(r.LATITUDE), lng: parseFloat(r.LONGITUDE),
    })).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (!items.length) { $('npcStatus').textContent = `No address found for “${q}”.`; return; }
    $('npcStatus').textContent = `${data.found > items.length ? `Showing ${items.length} of ${data.found}` : `${items.length} result${items.length === 1 ? '' : 's'}`} from OneMap`;
    renderNpcRows(items);
  } catch (err) {
    console.warn(err);
    $('npcStatus').innerHTML = 'Could not reach OneMap. You need internet for address search. Offline, enter coordinates instead, e.g. <code>1.3691, 103.8483</code>.';
  }
}

/* ---------- exhibit application helper ---------- */
function renderHelper(h) {
  if (!h) { $('helper').hidden = true; return; }
  const label = { verified: 'Verified', pending: 'Check CPC text', tip: 'Practice tip' };
  $('hIntro').textContent = h.intro;
  $('hScenario').innerHTML = h.scenarios.map((x) => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
  const steps = () => {
    const sc = h.scenarios.find((x) => x.id === $('hScenario').value) || h.scenarios[0];
    $('hSteps').innerHTML = sc.steps.map((st) => `<li><p>${esc(st.text)}</p><span class="badge ${st.status}">${label[st.status]}</span></li>`).join('');
  };
  const deadline = () => {
    const v = $('hDate').value; const box = $('hDeadline');
    if (!v) { box.hidden = true; return; }
    const [y, m, d] = v.split('-').map(Number);
    const due = new Date(Date.UTC(y + 1, m - 1, d));
    if (due.getUTCMonth() !== m - 1) due.setUTCDate(0); // 29 Feb -> 28 Feb
    const today = new Date(); const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((due - t) / 864e5);
    const fmt = due.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    box.className = `deadline ${days < 0 ? 'past' : days <= 60 ? 'soon' : ''}`;
    box.innerHTML = `<span>Latest date for the s.370(1)(b) report to court</span><b>${fmt}</b><span>${days < 0 ? `${-days} days overdue` : days === 0 ? 'Due today' : `${days} days left`} · report earlier if the item stops being relevant</span>`;
    box.hidden = false;
  };
  $('hScenario').addEventListener('change', steps);
  $('hDate').addEventListener('input', deadline);
  $('hTemplate').textContent = h.template.map((f) => `${f}:\n`).join('\n');
  $('hCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('hTemplate').textContent); toast('Template copied'); } catch (_) { toast('Copy failed'); }
  });
  steps();
}

/* ---------- data source: plain files (dev) or encrypted vault (published) ---------- */
let bundlePromise = null;
let unlockResolve;
const unlocked = new Promise((res) => { unlockResolve = res; });
function getBundle() { return bundlePromise || (bundlePromise = loadBundle()); }

async function loadBundle() {
  const res = await fetch('data/vault.json', { cache: 'no-cache' });
  if (res.ok) return unlocked; // published build: wait for the password
  const acts = await fetch('data/acts.json').then((r) => r.json());
  const lists = await Promise.all(acts.map((a) => fetch(`data/acts/${a.id}.json`).then((r) => (r.ok ? r.json() : []))));
  const [guide, charges, meta, npcGeo, npcNames] = await Promise.all(['data/guides/cpc-part19.json', 'data/guides/charges.json', 'data/meta.json', 'data/geo/npc.json', 'data/geo/npc-names.json']
    .map((u) => fetch(u).then((r) => r.json())));
  return { acts, lists, guide, charges, meta, npcGeo, npcNames };
}

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decryptVault(vault, password) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(vault.salt), iterations: vault.iterations, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(vault.iv) }, key, b64(vault.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function setupLock() {
  const res = await fetch('data/vault.json', { cache: 'no-cache' }).catch(() => null);
  if (!res || !res.ok) return;
  const vault = await res.json();
  const lock = $('lock'); const form = $('lockForm'); const input = $('lockInput'); const msg = $('lockMsg');
  document.body.classList.add('locked');
  lock.hidden = false;
  const tryPw = async (pw, silent) => {
    try {
      const bundle = await decryptVault(vault, pw);
      try { sessionStorage.setItem('legis-pw', pw); } catch (_) {}
      lock.hidden = true; document.body.classList.remove('locked');
      unlockResolve(bundle);
      return true;
    } catch (_) {
      if (!silent) { msg.textContent = 'Incorrect password.'; input.select(); }
      return false;
    }
  };
  let saved = null; try { saved = sessionStorage.getItem('legis-pw'); } catch (_) {}
  if (saved && await tryPw(saved, true)) return;
  input.focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = 'Unlocking…';
    await tryPw(input.value, false);
  });
}

let rowsReadyResolve;
const rowsReady = new Promise((res) => { rowsReadyResolve = res; });
async function init() {
  try {
    const { acts, lists, charges: ch, meta } = await getBundle();
    charges = ch;
    if (meta && meta.asOf) $('asOf').textContent = meta.asOf;
    state.acts = acts;
    acts.forEach((a, i) => {
      state.byId[a.id] = a;
      lists[i].forEach((row) => {
        row.act = a;
        row._order = state.rows.length;
        row._hay = [row.section, row.offence, row.punishment, a.short, a.name, a.code, ...(a.aliases || [])].join(' ').toLowerCase();
        state.rows.push(row);
      });
    });
    rowsReadyResolve();
    renderChips();
    els.qAct.innerHTML = '<option value="">Another Act (not listed)</option>'
      + acts.filter((a) => a.id !== 'PC1871').map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
    renderQuick();
    els.stats.textContent = `${state.rows.length.toLocaleString()} offences across ${acts.length} statutes`;
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
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // When a new version takes over, reload once so the page and its data match.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((r) => r.update()).catch(() => {}));
}
setupLock();
showView();
init();
