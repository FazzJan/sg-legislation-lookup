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
function currentTheme() {
  return root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
function applyTheme(t) {
  root.dataset.theme = t; store.set('legis-theme', t);
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
  applyTheme(currentTheme());
  $('resetDisplay').addEventListener('click', () => {
    z = 1; applyZoom(1); applyFont(FONTS[0][1]);
    store.set('legis-theme', null); delete root.dataset.theme; applyTheme(currentTheme()); store.set('legis-theme', null);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#settings')) $('settings').open = false; });
}
initSettings();

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
  const tpl = r.act.id === 'PC1871' && findTemplate(r.section);
  $('chargeLink').hidden = !tpl;
  if (tpl) $('chargeLink').href = `#charge/${encodeURIComponent(tpl.section)}`;
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

/* ---------- views ---------- */
let guideLoaded = false;
let chargeLoaded = false;
function currentView() {
  const h = location.hash;
  if (h === '#exhibits') return 'exhibits';
  if (h === '#charge' || h.startsWith('#charge/')) return 'charge';
  return 'offences';
}
function showView() {
  const v = currentView();
  $('viewOffences').hidden = v !== 'offences';
  $('viewCharge').hidden = v !== 'charge';
  $('viewExhibits').hidden = v !== 'exhibits';
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === v)));
  if (v === 'exhibits' && !guideLoaded) loadGuide();
  if (v === 'charge') loadCharge();
}
document.querySelectorAll('.tab, [data-view-link]').forEach((t) => t.addEventListener('click', (e) => {
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
    $('exStatus').className = `banner ${g.status}`;
    $('exStatus').innerHTML = `<strong>${g.status === 'draft' ? 'Draft' : 'Verified'}</strong> · last reviewed ${esc(g.lastReviewed)} — ${esc(g.statusNote)}`;
    $('exFlow').innerHTML = g.flow.map((f) => `<li><b>${esc(f.step)}</b><span>${esc(f.text)}</span></li>`).join('');
    const label = { verified: 'Verified', partial: 'Partly verified', pending: 'Pending' };
    $('exSections').innerHTML = g.sections.map((x) => `<details class="sec">
      <summary><span class="sec-num">s.${esc(x.s)}</span><h3>${esc(x.heading || 'Heading not yet verified')}</h3></summary>
      <div class="sec-body"><p>${esc(x.summary)}</p>
      <span class="pill ${x.status}">${label[x.status]}</span> &nbsp;<a href="https://sso.agc.gov.sg/Act/CPC2010?ProvIds=pr${esc(x.s)}-#pr${esc(x.s)}-" target="_blank" rel="noopener">Read on SSO ↗</a></div>
    </details>`).join('');
    $('exCaveat').textContent = g.caveat;
    renderHelper(g.helper);
  } catch (err) {
    console.error(err);
    $('exStatus').textContent = 'Could not load the guide — please refresh.';
  }
}

/* ---------- charge generator ---------- */
let charges = null;
function findTemplate(section) {
  if (!charges) return null;
  const s = String(section);
  return charges.templates.find((t) => t.section === s)
    || charges.templates.find((t) => t.section.replace(/\(.*$/, '') === s)
    || charges.templates.find((t) => t.section === `${s}(1)`) || null;
}
const ORD = (n) => { const v = n % 100; return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'); };
function fmtDate(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${ORD(d)} ${months[m - 1]} ${y}`;
}
const CHARGE_FIELDS = ['cNo', 'cName', 'cId', 'cAge', 'cNat', 'cDate', 'cDate2', 'cTime', 'cPlace'];
async function loadCharge() {
  if (!chargeLoaded) {
    chargeLoaded = true;
    charges = (await getBundle()).charges;
    $('cFormat').textContent = charges.format;
    $('cDisclaimer').textContent = `${charges.disclaimer} Source: ${charges.source}.`;
    $('cTemplate').innerHTML = charges.templates.map((t) => `<option value="${esc(t.section)}">s.${esc(t.section)} — ${esc(t.title)}</option>`).join('');
    $('cTemplate').addEventListener('change', () => { renderChargeFields(); history.replaceState(null, '', `#charge/${encodeURIComponent($('cTemplate').value)}`); });
    CHARGE_FIELDS.forEach((id) => $(id).addEventListener('input', renderCharge));
    $('cRange').addEventListener('change', () => { $('cDate2Wrap').hidden = !$('cRange').checked; renderCharge(); });
    $('cCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('cOut').innerText); toast('Charge copied'); } catch (_) { toast('Copy failed'); }
    });
    $('cClear').addEventListener('click', () => {
      CHARGE_FIELDS.forEach((id) => { $(id).value = ''; });
      $('cFields').querySelectorAll('input').forEach((i) => { i.value = ''; });
      renderCharge();
    });
  }
  const m = location.hash.match(/^#charge\/(.+)$/);
  const want = m && findTemplate(decodeURIComponent(m[1]));
  if (want) $('cTemplate').value = want.section;
  renderChargeFields();
}
function renderChargeFields() {
  const t = findTemplate($('cTemplate').value) || charges.templates[0];
  $('cFields').innerHTML = t.fields.map((f) => f.type === 'select'
    ? `<label class="span-2">${esc(f.label)}<select data-f="${esc(f.id)}">${f.options.map((o) => `<option value="${esc(o)}">${esc(o.replace(/the said \{\w+\}/g, 'the victim').replace(/\{\w+\}/g, 'the victim'))}</option>`).join('')}</select></label>`
    : `<label>${esc(f.label)}<input data-f="${esc(f.id)}" placeholder="${esc(f.placeholder || '')}" autocomplete="off"></label>`).join('');
  $('cFields').querySelectorAll('[data-f]').forEach((el) => el.addEventListener('input', renderCharge));
  $('cRangeWrap').hidden = !t.dateRange;
  if (!t.dateRange) { $('cRange').checked = false; $('cDate2Wrap').hidden = true; }
  $('cNotes').innerHTML = t.notes.map((n) => `<li>${esc(n)}</li>`).join('');
  renderCharge();
}
function renderCharge() {
  const t = findTemplate($('cTemplate').value) || charges.templates[0];
  const val = (id, ph) => { const v = $(id).value.trim(); return v ? esc(v) : `<span class="fill">[${ph}]</span>`; };
  const vals = {};
  $('cFields').querySelectorAll('[data-f]').forEach((el) => { vals[el.dataset.f] = el.value.trim(); });
  const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => {
    const f = t.fields.find((x) => x.id === k);
    const v = vals[k];
    if (v) return f && f.type === 'select' ? fill(esc(v)) : esc(v);
    return `<span class="fill">[${esc(f ? f.label : k)}]</span>`;
  });
  const range = t.dateRange && $('cRange').checked;
  const d1 = $('cDate').value ? esc(fmtDate($('cDate').value)) : '<span class="fill">[date]</span>';
  const d2 = $('cDate2').value ? esc(fmtDate($('cDate2').value)) : '<span class="fill">[to date]</span>';
  let rangeWarn = '';
  if (range && $('cDate').value && $('cDate2').value) {
    const [a, b] = [new Date($('cDate').value), new Date($('cDate2').value)];
    const lim = new Date(a); lim.setFullYear(lim.getFullYear() + 1);
    if (b < a) rangeWarn = 'The end date is before the start date.';
    else if (b >= lim) rangeWarn = 'CPC s.124(2)(a)(ii): the period must not exceed 12 months.';
  }
  const when = range ? `between ${d1} and ${d2}` : `on ${d1}${$('cTime').value.trim() ? `, at about ${esc($('cTime').value.trim())}` : ', at about <span class="fill">[time]</span>'}`;
  const nat = $('cNat').value.trim() ? `${esc($('cNat').value.trim())}, ` : '';
  const head = $('cNo').value.trim() ? `${esc($('cNo').value.trim().toUpperCase())} CHARGE\n\n` : '';
  $('cOut').innerHTML = `${head}You, ${val('cName', 'name')}, ${val('cId', 'NRIC / FIN / passport no.')}, ${nat}${val('cAge', 'age')} years old,
are charged that you, ${when}, at ${val('cPlace', 'place')}, Singapore, ${fill(t.particulars)}, and you have thereby committed an offence punishable under ${esc(t.punishable)}.`;
  if (rangeWarn) $('cOut').insertAdjacentHTML('beforeend', `<div class="fill" style="margin-top:12px;font-family:var(--sans);font-size:13px">⚠ ${esc(rangeWarn)}</div>`);
}

/* ---------- exhibit application helper ---------- */
function renderHelper(h) {
  if (!h) { $('helper').hidden = true; return; }
  const label = { verified: 'Verified', pending: 'Check CPC text', tip: 'Practice tip' };
  $('hIntro').textContent = h.intro;
  $('hScenario').innerHTML = h.scenarios.map((x) => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
  const steps = () => {
    const sc = h.scenarios.find((x) => x.id === $('hScenario').value) || h.scenarios[0];
    $('hSteps').innerHTML = sc.steps.map((st) => `<li><p>${esc(st.text)}</p><span class="pill ${st.status}">${label[st.status]}</span></li>`).join('');
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
  const res = await fetch('data/vault.json');
  if (res.ok) return unlocked; // published build: wait for the password
  const acts = await fetch('data/acts.json').then((r) => r.json());
  const lists = await Promise.all(acts.map((a) => fetch(`data/acts/${a.id}.json`).then((r) => (r.ok ? r.json() : []))));
  const [guide, charges, meta] = await Promise.all(['data/guides/cpc-part19.json', 'data/guides/charges.json', 'data/meta.json']
    .map((u) => fetch(u).then((r) => r.json())));
  return { acts, lists, guide, charges, meta };
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
  const res = await fetch('data/vault.json').catch(() => null);
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
        row._hay = [row.section, row.offence, row.punishment, a.short, a.name].join(' ').toLowerCase();
        state.rows.push(row);
      });
    });
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
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
setupLock();
showView();
init();
