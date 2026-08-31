const ARRESTABLE = 'May arrest without warrant';
const NONARRESTABLE = 'May not arrest without warrant';

const ACT_CODES = {
  'Penal Code 1871': 'PC1871',
  'POHA 2014': 'PHA2014',
  'Miscellaneous Offences Act': 'MOPONA1906',
  'CESOWA': 'CESOWA1958',
  'GEWCA': 'GEWCA2021',
  'GCA 2022': 'GCA2022',
  'Liquor Control Act': 'LCSCA2015',
  'Vandalism Act': 'VA1966',
  'Destitute Persons Act': 'DPA1989',
  'Moneylenders Act': 'MA2008',
  'Computer Misuse Act': 'CMA1993'
};

let allData = [];
let activeIndex = -1;

const $ = (id) => document.getElementById(id);
const searchBox = $('searchBox');
const statuteFilter = $('statuteFilter');
const suggestions = $('suggestions');
const clearBtn = $('clearBtn');
const result = $('result');
const emptyBox = $('emptyBox');
const resultCount = $('resultCount');
const loadingStatus = $('loadingStatus');
const themeToggle = $('themeToggle');

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem('legis-theme', theme);
}
setTheme(localStorage.getItem('legis-theme') || 'dark');
themeToggle.addEventListener('click', () =>
  setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
);

function arrestKind(text) {
  if (!text) return 'unknown';
  const t = text.toLowerCase();
  if (t.includes('may not arrest')) return 'no-arrest';
  if (t.includes('may arrest without warrant')) return 'arrest';
  return 'unknown';
}

function arrestLetter(kind) {
  if (kind === 'arrest') return 'A';
  if (kind === 'no-arrest') return 'N';
  return '?';
}

function arrestLabel(kind) {
  if (kind === 'arrest') return 'Arrestable';
  if (kind === 'no-arrest') return 'Not arrestable';
  return 'Check Act';
}

function bailDisplay(text) {
  if (!text) return { cls: '', label: '\u2014' };
  if (text === 'Bailable' || text === 'Yes') return { cls: 'bail-yes', label: 'Yes' };
  if (text === 'Not bailable' || (text && text.includes('Not bailable'))) {
    return { cls: 'bail-no', label: 'No' };
  }
  if (text.toLowerCase().includes('bailable') && !text.toLowerCase().includes('not bailable')) {
    return { cls: 'bail-yes', label: 'Yes' };
  }
  return { cls: '', label: text };
}

function extractSectionToken(query) {
  if (!query) return null;
  const m = String(query).trim().match(/(?:(?:section|sec|s|\u00a7)\.?\s*)?(\d+[A-Za-z]?)/i);
  return m ? m[1].toUpperCase() : null;
}

function buildActSectionUrl(actCode, section) {
  if (!actCode) return 'https://sso.agc.gov.sg';
  if (!section) return `https://sso.agc.gov.sg/Act/${actCode}`;
  return `https://sso.agc.gov.sg/Act/${actCode}?ProvIds=pr${section}-`;
}

function buildAgcLink(item) {
  if (item.link) return item.link;
  const code = ACT_CODES[item.statute];
  if (code && item.section) {
    const sec = String(item.section).replace(/ *\([^)]*\) */g, '').replace(/\s+/g, '');
    return buildActSectionUrl(code, sec);
  }
  if (item.statute === 'Penal Code 1871' && item.section) {
    const sec = String(item.section).replace(/ *\([^)]*\) */g, '');
    return `https://sso.agc.gov.sg/Act/PC1871?ProvIds=pr${sec}-#pr${sec}-`;
  }
  return 'https://sso.agc.gov.sg';
}

function filterMatches(query, statute) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  let list = allData.filter((item) => {
    const hay = [item.section||'', item.offence||'', item.statute||'', item.punishment||''].join(' ').toLowerCase();
    const okSearch = words.every((w) => hay.includes(w));
    const okStat = statute === 'all' || item.statute === statute;
    return okSearch && okStat;
  });
  list.sort((a, b) => {
    const aExact = (a.section||'').toLowerCase() === q || (a.section||'').toLowerCase().startsWith(q);
    const bExact = (b.section||'').toLowerCase() === q || (b.section||'').toLowerCase().startsWith(q);
    return (bExact ? 1 : 0) - (aExact ? 1 : 0);
  });
  return list;
}

function renderSuggestions(list) {
  suggestions.innerHTML = '';
  activeIndex = -1;
  if (!list.length) { suggestions.classList.remove('open'); return; }
  const top = list.slice(0, 12);
  top.forEach((item, i) => {
    const kind = arrestKind(item.arrestable);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion';
    btn.innerHTML = `<span class="sec">\u00a7 ${item.section}</span><span class="meta"><div class="title">${item.offence||''}</div><div class="stat">${item.statute}</div></span><span class="mini-pill ${kind}">${arrestLetter(kind)}</span>`;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      showResult(item);
      suggestions.classList.remove('open');
      searchBox.value = item.section;
      clearBtn.classList.add('show');
    });
    suggestions.appendChild(btn);
  });
  suggestions.classList.add('open');
  suggestions._items = top;
}

function showResult(item) {
  emptyBox.classList.remove('show');
  result.classList.add('show');
  const kind = arrestKind(item.arrestable);
  const bail = bailDisplay(item.bailable);
  $('resultStatute').textContent = item.statute || '';
  $('resultTitle').textContent = `\u00a7 ${item.section}`;
  $('resultOffence').textContent = item.offence || '';
  const banner = $('arrestBanner');
  banner.className = `arrest-banner ${kind}`;
  $('arrestLetter').textContent = arrestLetter(kind);
  $('arrestDesc').textContent = item.arrestable ? `${arrestLabel(kind)} \u2014 ${item.arrestable}` : arrestLabel(kind);
  const bailEl = $('bailableValue');
  bailEl.className = `fact-value ${bail.cls}`;
  bailEl.textContent = bail.label;
  $('warrantRow').style.display = item.warrant ? 'block' : 'none';
  $('warrantValue').textContent = item.warrant || '';
  $('punishmentValue').textContent = item.punishment || '\u2014';
  $('agcLink').href = buildAgcLink(item);
  resultCount.textContent = '1 selected';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showEmpty(query) {
  result.classList.remove('show');
  emptyBox.classList.add('show');
  resultCount.textContent = 'No results';
  const selected = statuteFilter.value;
  const secToken = extractSectionToken(query);
  const actCode = selected !== 'all' ? ACT_CODES[selected] : null;
  const actName = selected !== 'all' ? selected : null;
  let links = '';
  if (actCode && secToken) {
    const sectionUrl = buildActSectionUrl(actCode, secToken);
    const mainUrl = buildActSectionUrl(actCode, null);
    links = `<p style="margin:0 0 8px">Not indexed here \u2014 open on AGC:</p><p style="margin:0 0 6px"><a href="${sectionUrl}" target="_blank" rel="noopener">${actName} \u00a7 ${secToken}</a></p><p style="margin:0 0 6px"><a href="${mainUrl}" target="_blank" rel="noopener">${actName} main page</a></p>`;
  } else if (actCode) {
    links = `<p style="margin:0 0 8px"><a href="${buildActSectionUrl(actCode, null)}" target="_blank" rel="noopener">Open ${actName} on AGC</a></p>`;
  } else {
    links = `<p style="margin:0 0 8px">Select a statute, then search the section for a direct AGC link.</p>`;
  }
  emptyBox.innerHTML = `${links}<p style="margin:10px 0 0"><a href="https://sso.agc.gov.sg/Search/Content?Phrase=${encodeURIComponent(query||'')}" target="_blank" rel="noopener">Search SSO</a> \u00b7 <a href="https://github.com/FazzJan/sg-legislation-lookup/issues/new" target="_blank" rel="noopener">Request on GitHub</a></p>`;
}

function onSearchInput() {
  const query = searchBox.value;
  clearBtn.classList.toggle('show', query.length > 0);
  if (!query.trim()) {
    suggestions.classList.remove('open');
    result.classList.remove('show');
    emptyBox.classList.remove('show');
    resultCount.textContent = 'Type a section or keyword';
    return;
  }
  const list = filterMatches(query, statuteFilter.value);
  if (list.length) {
    emptyBox.classList.remove('show');
    renderSuggestions(list);
    resultCount.textContent = `${list.length} match${list.length !== 1 ? 'es' : ''}`;
  } else {
    suggestions.classList.remove('open');
    showEmpty(query);
  }
}

function clearSearch() {
  searchBox.value = '';
  clearBtn.classList.remove('show');
  suggestions.classList.remove('open');
  result.classList.remove('show');
  emptyBox.classList.remove('show');
  resultCount.textContent = 'Type a section or keyword';
  searchBox.focus();
}

searchBox.addEventListener('input', onSearchInput);
statuteFilter.addEventListener('change', onSearchInput);
clearBtn.addEventListener('click', clearSearch);
searchBox.addEventListener('keydown', (e) => {
  const items = suggestions._items || [];
  if (!suggestions.classList.contains('open') || !items.length) {
    if (e.key === 'Enter') {
      const list = filterMatches(searchBox.value, statuteFilter.value);
      if (list.length) { showResult(list[0]); suggestions.classList.remove('open'); }
      else if (searchBox.value.trim()) showEmpty(searchBox.value);
    }
    return;
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const item = activeIndex >= 0 ? items[activeIndex] : items[0];
    if (item) { showResult(item); searchBox.value = item.section; suggestions.classList.remove('open'); }
  } else if (e.key === 'Escape') suggestions.classList.remove('open');
  [...suggestions.querySelectorAll('.suggestion')].forEach((el, i) => el.classList.toggle('active', i === activeIndex));
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) suggestions.classList.remove('open');
});

async function gunzipB64(b64) {
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([binary]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

async function init() {
  loadingStatus.textContent = 'Loading\u2026';
  try {
    const n = 23;
    const texts = await Promise.all(
      Array.from({ length: n }, (_, i) => fetch('data/c' + i + '.txt').then((r) => r.text()))
    );
    const compact = JSON.parse(await gunzipB64(texts.join('').trim()));
    const extraFiles = ['data/extra.json', 'data/extra-part1.json', 'data/extra-part2.json', 'data/extra-part3.json'];
    const extraRaw = [];
    for (const f of extraFiles) {
      try {
        const extraRes = await fetch(f);
        if (extraRes.ok) {
          const parsed = await extraRes.json();
          if (Array.isArray(parsed)) extraRaw.push(...parsed);
        }
      } catch (_) {}
    }
    const expandArrest = (c) => (c === 1 ? 'May arrest without warrant' : c === 0 ? 'May not arrest without warrant' : (c || ''));
    const expandWarrant = (c) => (c === 1 ? 'Warrant' : c === 0 ? 'Summons' : (c || ''));
    const expandBail = (c) => (c === 1 ? 'Bailable' : c === 0 ? 'Not bailable' : (c || ''));
    function normalizeExtra(row) {
      if (!row) return null;
      if (row.statute && row.section) {
        return {
          statute: row.statute,
          section: String(row.section),
          offence: row.offence || row.title || '',
          arrestable: typeof row.arrestable === 'boolean'
            ? (row.arrestable ? 'May arrest without warrant' : 'May not arrest without warrant')
            : (row.arrestable || ''),
          warrant: row.warrant || '',
          bailable: typeof row.bailable === 'boolean'
            ? (row.bailable ? 'Bailable' : 'Not bailable')
            : (row.bailable || ''),
          punishment: row.punishment || '',
          link: row.link || row.sso || ''
        };
      }
      if (row.actName || row.act) {
        const actName = row.actName || row.act;
        const statute = Object.keys(ACT_CODES).find((k) => ACT_CODES[k] === row.act) || actName;
        return {
          statute,
          section: String(row.sec || row.section || ''),
          offence: row.title || row.offence || '',
          arrestable: row.arrestable === true || row.arrestable === 'true'
            ? ('May arrest without warrant' + (row.note ? ' \u2014 ' + row.note : ''))
            : (typeof row.arrestable === 'string' ? row.arrestable : 'May not arrest without warrant'),
          warrant: row.warrant || '',
          bailable: row.bailable === true || row.bailable === 'true' || row.bailable === 'Bailable'
            ? 'Bailable'
            : (row.bailable === false ? 'Not bailable' : (row.bailable || '')),
          punishment: row.punishment || '',
          link: row.sso || row.link || ''
        };
      }
      return null;
    }
    const extra = extraRaw.map(normalizeExtra).filter(Boolean);
    allData = [
      ...compact.map((row) => ({
        statute: 'Penal Code 1871',
        section: row[0],
        offence: row[1],
        arrestable: expandArrest(row[2]),
        warrant: expandWarrant(row[3]),
        bailable: expandBail(row[4]),
        punishment: row[5] || '',
        link: ''
      })),
      ...extra
    ];
    loadingStatus.textContent = '';
    resultCount.textContent = 'Type a section or keyword';
  } catch (err) {
    console.error(err);
    loadingStatus.textContent = 'Load error';
    try {
      const extraRes = await fetch('data/extra.json');
      allData = extraRes.ok ? await extraRes.json() : [];
    } catch (_) {
      allData = [];
    }
  }
}

init();
