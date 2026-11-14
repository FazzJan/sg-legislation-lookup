'use strict';
/* OSINT tab. Runs entirely in the browser: offline checks where possible, free public
   services that allow browser requests otherwise, and link-outs for the rest.
   Nothing typed here is stored or sent to this site. */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;
  const regionName = (() => {
    let dn = null;
    try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (_) {}
    return (r) => { try { return (dn && r && r !== '001' && dn.of(r)) || r || 'Unknown'; } catch (_) { return r || 'Unknown'; } };
  })();

  const TABS = [
    ['phone', 'Phone', 'Phone number, e.g. 9123 4567 or +60 12 345 6789'],
    ['ip', 'IP · VPN · Tor', 'IP address or .onion address'],
    ['domain', 'Domain', 'Domain or website, e.g. example.com.sg'],
    ['email', 'Email', 'Email address'],
    ['username', 'Username', 'Username or handle, without spaces'],
    ['image', 'Image', ''],
    ['uen', 'UEN · ACRA', 'UEN or business name'],
  ];
  let tab = 'phone';
  let bound = false;

  /* ---------------------------------------------------------------- rendering */
  function card({ title, verdict, level, rows = [], links = [], note, html, items, id }) {
    const r = rows.filter((x) => x && x[1] != null && x[1] !== '').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const l = links.filter(Boolean).map(([t, u, extra]) => `<a class="btn tinted small-btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer"${extra || ''}>${esc(t)}</a>`).join('');
    const it = items && items.length ? `<ul class="osint-items">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
    return `<section class="group osint-card"${id ? ` id="${id}"` : ''}>
      <p class="caption">${esc(title)}</p>
      ${verdict ? `<p class="osint-verdict ${level || ''}">${esc(verdict)}</p>` : ''}
      ${r ? `<dl class="facts osint-facts">${r}</dl>` : ''}${it}${html || ''}
      ${l ? `<div class="osint-links">${l}</div>` : ''}
      ${note ? `<p class="footnote osint-note">${esc(note)}</p>` : ''}
    </section>`;
  }
  const out = (html) => { $('osintOut').innerHTML = html; };
  const status = (t) => { $('osintStatus').textContent = t || ''; };

  async function getJSON(url, opts = {}, ms = 9000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { ...opts, signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) return null;
      return await r.json();
    } catch (_) { return null; } finally { clearTimeout(timer); }
  }
  async function getText(url, ms = 15000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      return r.ok ? await r.text() : null;
    } catch (_) { return null; } finally { clearTimeout(timer); }
  }
  async function doh(name, type) {
    const j = await getJSON(`https://dns.google/resolve?name=${enc(name)}&type=${type}`, {}, 6000);
    if (!j) return null;
    return (j.Answer || []).filter((a) => a.type === { A: 1, NS: 2, CNAME: 5, PTR: 12, MX: 15, TXT: 16, AAAA: 28 }[type]).map((a) => a.data.replace(/^"|"$/g, '').replace(/\.$/, ''));
  }

  /* ---------------------------------------------------------------- phone */
  const P = () => window.OSINT_PHONE || { cc: {}, meta: {}, carriers: {} };
  const TYPE_LABEL = {
    mobile: 'Mobile', fixed_line: 'Fixed line', voip: 'VoIP (internet calling)', toll_free: 'Toll-free',
    premium_rate: 'Premium rate', shared_cost: 'Shared cost', uan: 'Company number', personal_number: 'Personal number', pager: 'Pager',
  };
  const full = (pat, s) => { try { return new RegExp(`^(?:${pat})$`).test(s); } catch (_) { return false; } };

  function parsePhone(input) {
    let raw = String(input).trim().replace(/[\s\-().\/]/g, '');
    let assumed = false;
    if (raw.startsWith('00')) raw = '+' + raw.slice(2);
    if (!/^\+?\d{3,17}$/.test(raw)) return null;
    let cc, nat;
    if (raw.startsWith('+')) {
      const d = raw.slice(1);
      for (const n of [1, 2, 3]) if (P().cc[d.slice(0, n)]) { cc = d.slice(0, n); nat = d.slice(n); break; }
      if (!cc) return { invalid: true, e164: raw, reason: 'Unknown country code' };
    } else if (/^65\d{8}$/.test(raw)) { cc = '65'; nat = raw.slice(2); }
    else { cc = '65'; nat = raw; assumed = true; }
    const regions = P().cc[cc] || [];
    let region = regions[0];
    let type = null;
    let valid = null;
    let detailed = false;
    for (const r of regions) {
      const m = P().meta[r];
      if (!m) continue;
      detailed = true;
      let n = nat;
      if (!full(m.all, n) && m.np && n.startsWith(m.np)) n = n.slice(m.np.length);
      if (full(m.all, n)) {
        region = r; nat = n; valid = true;
        type = Object.keys(m.t).find((k) => full(m.t[k], n)) || null;
        break;
      }
      valid = false;
    }
    let carrier = null;
    const digits = cc + nat;
    for (let i = digits.length; i > cc.length; i--) if (P().carriers[digits.slice(0, i)]) { carrier = P().carriers[digits.slice(0, i)]; break; }
    return { cc, nat, region, type, valid, detailed, carrier, assumed, e164: `+${cc}${nat}` };
  }

  const SG_NOTE = {
    3: '3xxx xxxx is a VoIP (internet calling) number. These are easy to get remotely and are often used by call centres and overseas callers.',
    6: '6xxx xxxx is a fixed line (home or office).',
    8: '8xxx xxxx is a mobile number.',
    9: '9xxx xxxx is a mobile number.',
  };

  function runPhone(q) {
    const p = parsePhone(q);
    if (!p) return out(card({ title: 'Phone number', verdict: 'Not a phone number', level: 'warn', note: 'Enter digits only, with or without a country code (+65, +60 …).' }));
    if (p.invalid) return out(card({ title: 'Phone number', verdict: p.reason, level: 'bad', rows: [['Entered', p.e164]] }));
    const sg = p.cc === '65';
    const country = regionName(p.region);
    let verdict;
    let level;
    if (p.valid === false) { verdict = `Not a valid ${country} number format`; level = 'bad'; }
    else if (sg) { verdict = `Singapore · ${TYPE_LABEL[p.type] || 'number'}`; level = 'good'; }
    else { verdict = `Foreign number · ${country}${p.type ? ` · ${TYPE_LABEL[p.type]}` : ''}`; level = 'warn'; }
    const notes = [];
    if (p.assumed) notes.push('No country code was given, so it was read as a Singapore number.');
    if (sg && p.valid) {
      if (p.nat.startsWith('1800')) notes.push('1800 numbers are toll-free.');
      else if (p.nat.startsWith('1900')) notes.push('1900 numbers are premium rate.');
      else if (SG_NOTE[p.nat[0]]) notes.push(SG_NOTE[p.nat[0]]);
    }
    if (p.carrier) notes.push('The telco shown is the one this number block was first issued to. Numbers can be ported, so the current telco may differ.');
    if (!p.detailed) notes.push('Line type and validity are only checked for Singapore and nearby countries; for this country only the country is shown.');
    notes.push('Caller ID can be faked, so a local-looking number does not prove the caller is in Singapore.');
    const nat = p.nat;
    const spaced = sg && nat.length === 8 ? `${nat.slice(0, 4)} ${nat.slice(4)}` : nat;
    out(card({
      title: 'Phone number', verdict, level,
      rows: [['Number', `+${p.cc} ${spaced}`], ['Country', `${country} (+${p.cc})`], ['Line type', TYPE_LABEL[p.type] || (p.detailed ? 'Unknown' : 'Not checked')],
        ['Valid format', p.valid == null ? 'Not checked' : p.valid ? 'Yes' : 'No'], ['First issued to', p.carrier]],
      links: [
        ['WhatsApp', `https://wa.me/${p.cc}${nat}`], ['Telegram', `https://t.me/+${p.cc}${nat}`],
        ['Truecaller', `https://www.truecaller.com/search/${(p.region || 'sg').toLowerCase()}/${nat}`],
        ['eMobileTracker', 'https://www.emobiletracker.com/'],
        ['Google', `https://www.google.com/search?q=${enc(`"${nat}" OR "${spaced}" OR "+${p.cc}${nat}"`)}`],
        ['Facebook search', `https://www.facebook.com/search/top?q=${enc(nat)}`],
        ['ScamShield', 'https://www.scamshield.gov.sg/'],
      ],
      note: notes.join(' '),
    }));
  }

  /* ---------------------------------------------------------------- IP, VPN, Tor */
  const LIST_URLS = {
    vpn: 'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt',
    dc: 'https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt',
  };
  const lists = {};
  const ip4num = (s) => s.split('.').reduce((a, o) => a * 256 + Number(o), 0);
  async function loadList(name) {
    if (lists[name] !== undefined) return lists[name];
    const t = await getText(LIST_URLS[name], 20000);
    if (!t) { lists[name] = null; return null; }
    const ranges = [];
    t.split('\n').forEach((l) => {
      const m = l.trim().match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/);
      if (!m) return;
      const bits = m[2] ? +m[2] : 32;
      const start = ip4num(m[1]) - (ip4num(m[1]) % 2 ** (32 - bits));
      ranges.push([start, start + 2 ** (32 - bits) - 1]);
    });
    ranges.sort((a, b) => a[0] - b[0]);
    lists[name] = ranges;
    return ranges;
  }
  function inRanges(ranges, n) {
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (n < ranges[mid][0]) hi = mid - 1;
      else if (n > ranges[mid][1]) lo = mid + 1;
      else return true;
    }
    return false;
  }
  const isIPv4 = (s) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);
  const isIPv6 = (s) => /^[0-9a-f:]+$/i.test(s) && s.includes(':') && s.split(':').length >= 3;
  function specialRange(ip) {
    if (!isIPv4(ip)) return /^(fe80|fc|fd|::1$)/i.test(ip) ? 'private or local IPv6 range' : null;
    const n = ip4num(ip);
    const r = (cidr) => { const [a, b] = cidr.split('/'); const s = ip4num(a); return n >= s && n < s + 2 ** (32 - +b); };
    if (r('100.64.0.0/10')) return 'shared range used by Tailscale and by telcos internally (100.64.0.0/10)';
    if (r('10.0.0.0/8') || r('172.16.0.0/12') || r('192.168.0.0/16')) return 'private home or office network range';
    if (r('127.0.0.0/8')) return 'this device (loopback)';
    if (r('169.254.0.0/16')) return 'link-local range';
    if (n >= ip4num('224.0.0.0')) return 'multicast or reserved range';
    return null;
  }
  const SG_ISP = /singtel|starhub|\bm1\b|myrepublic|viewqwest|simba|tpg|circles|whizcomms/i;

  async function runIP(q) {
    const ip = q.trim();
    if (/\.onion\/?$/i.test(ip.replace(/^https?:\/\//i, '').split('/')[0])) return runOnion(ip);
    if (!isIPv4(ip) && !isIPv6(ip)) return out(card({ title: 'IP address', verdict: 'Not an IP address', level: 'warn', note: 'Enter an address like 203.0.113.5. For a website name, use the Domain tab.' }));
    const sp = specialRange(ip);
    if (sp) return out(card({ title: 'IP address', verdict: 'Not a public internet address', level: 'warn', rows: [['Address', ip], ['Range', sp]], note: 'This address only has meaning inside a private network, so there is nothing to look up online.' }));
    status('Checking… the first IP check downloads the VPN lists (about 1 MB).');
    const rev = isIPv4(ip) ? `${ip.split('.').reverse().join('.')}.in-addr.arpa` : null;
    const [info, pc, rdap, onio, ptr, vpn, dc] = await Promise.all([
      getJSON(`https://ipinfo.io/${ip}/json`),
      getJSON(`https://proxycheck.io/v2/${ip}?vpn=1&asn=1&risk=1`),
      getJSON(`https://rdap.org/ip/${ip}`),
      getJSON(`https://onionoo.torproject.org/details?search=${enc(ip)}&limit=5`, {}, 12000),
      rev ? doh(rev, 'PTR') : null,
      isIPv4(ip) ? loadList('vpn') : null,
      isIPv4(ip) ? loadList('dc') : null,
    ]);
    status('');
    const p = (pc && pc[ip]) || {};
    const relays = onio ? (onio.relays || []) : null;
    const relay = relays && relays[0];
    const exit = !!(relay && (relay.flags || []).includes('Exit') || (relay && relay.exit_addresses && relay.exit_addresses.includes(ip)));
    const n = isIPv4(ip) ? ip4num(ip) : null;
    const onVpn = vpn && n != null ? inRanges(vpn, n) : null;
    const onDc = dc && n != null ? inRanges(dc, n) : null;
    const pType = p.type || '';
    const pProxy = String(p.proxy || '').toLowerCase() === 'yes';
    const org = (info && info.org) || [p.asn, p.provider].filter(Boolean).join(' ') || (rdap && rdap.name) || '';
    const country = (info && info.country) || p.isocode || (rdap && rdap.country) || '';
    let verdict;
    let level;
    if (exit || /tor/i.test(pType)) { verdict = 'Tor exit node: traffic from the Tor network'; level = 'bad'; }
    else if (relay) { verdict = 'Tor relay (part of the Tor network, not an exit)'; level = 'warn'; }
    else if (onVpn || pProxy) { verdict = `Likely VPN or proxy${pType && pProxy ? ` (${pType})` : ''}`; level = 'bad'; }
    else if (onDc || /hosting|business/i.test(pType)) { verdict = 'Hosting or datacentre address: a server, or possibly a VPN'; level = 'warn'; }
    else if (country === 'SG' && SG_ISP.test(org)) { verdict = 'No VPN signs · Singapore home or mobile ISP'; level = 'good'; }
    else { verdict = 'No VPN signs found'; level = 'good'; }
    const loc = info ? [info.city, info.region, regionName(info.country)].filter(Boolean).join(', ') : (country ? regionName(country) : '');
    const yn = (v) => (v == null ? 'Could not check' : v ? 'Yes' : 'No');
    const rows = [['Address', ip], ['Network owner', org], ['Approx. location', loc], ['Hostname', (ptr && ptr[0]) || (info && info.hostname)],
      ['Registered block', rdap && rdap.name ? `${rdap.name}${rdap.startAddress ? ` (${rdap.startAddress} – ${rdap.endAddress})` : ''}` : ''],
      ['On VPN list', yn(onVpn)], ['On datacentre list', yn(onDc)], ['Tor exit', relays == null ? 'Could not check' : exit ? 'Yes' : 'No'],
      ['proxycheck.io', pc ? `proxy: ${p.proxy || '?'}${pType ? `, type: ${pType}` : ''}${p.risk != null ? `, risk ${p.risk}/100` : ''}` : 'Could not check']];
    if (relay) {
      rows.push(['Tor relay name', `${relay.nickname || '?'} · ${(relay.flags || []).join(', ') || 'no flags'}`]);
      rows.push(['Tor relay active', `${(relay.first_seen || '?').slice(0, 10)} to ${(relay.last_seen || '?').slice(0, 10)}${relay.running ? ' (running now)' : ''}`]);
      if (relay.contact) rows.push(['Relay operator contact', String(relay.contact).slice(0, 140)]);
    }
    const missing = [[info, 'ipinfo.io'], [pc, 'proxycheck.io'], [rdap, 'RDAP'], [onio, 'Tor directory']].filter((x) => !x[0]).map((x) => x[1]);
    const day = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
    out(card({
      title: 'IP address', verdict, level, rows,
      links: [['Was it Tor on a past date? (ExoneraTor)', `https://metrics.torproject.org/exonerator.html?ip=${enc(ip)}&timestamp=${day}&lang=en`],
        ['AbuseIPDB', `https://www.abuseipdb.com/check/${enc(ip)}`], ['Shodan', `https://www.shodan.io/host/${enc(ip)}`],
        ['ipinfo.io', `https://ipinfo.io/${enc(ip)}`], ['Network (bgp.he.net)', `https://bgp.he.net/ip/${enc(ip)}`]],
      note: `A clean result does not rule out a VPN: residential proxies and new VPN ranges are often missed. Mobile addresses are shared by many subscribers, and location is approximate. Tor status is for today; for an incident, use ExoneraTor with the date of the event.${missing.length ? ` No answer from: ${missing.join(', ')}.` : ''}`,
    }));
  }

  function runOnion(q) {
    const host = q.trim().replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const name = host.replace(/\.onion$/, '').split('.').pop();
    const v3 = /^[a-z2-7]{56}$/.test(name);
    const v2 = /^[a-z2-7]{16}$/.test(name);
    out(card({
      title: 'Tor onion address',
      verdict: v3 ? 'Valid onion address (current v3 format)' : v2 ? 'Old v2 onion address: no longer reachable since 2021' : 'Not a valid onion address',
      level: v3 ? 'good' : 'warn',
      rows: [['Address', host], ['Format', v3 ? 'v3 (56 characters)' : v2 ? 'v2 (16 characters)' : 'Unrecognised']],
      links: [['Ahmia (onion search)', `https://ahmia.fi/search/?q=${enc(name)}`], ['Google', `https://www.google.com/search?q=${enc(`"${host}"`)}`]],
      note: 'An onion address hides where the server is, so there is no IP, owner or location to look up. This page does not connect to Tor; open the address in Tor Browser if you need to see it.',
    }));
  }

  /* ---------------------------------------------------------------- domain */
  function cleanDomain(q) { return q.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[\/?#]/)[0].replace(/^www\./, '').replace(/:\d+$/, ''); }
  const rdapPeople = (o, acc = []) => {
    (o.entities || []).forEach((e) => {
      const vc = e.vcardArray && e.vcardArray[1];
      const fn = vc && vc.find((x) => x[0] === 'fn' || x[0] === 'org');
      if (fn && fn[3] && (e.roles || []).length) acc.push([e.roles.join(', ').replace(/^./, (c) => c.toUpperCase()), String(fn[3])]);
      rdapPeople(e, acc);
    });
    return acc;
  };
  async function runDomain(q, embed) {
    const d = cleanDomain(q);
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)) { if (!embed) out(card({ title: 'Domain', verdict: 'Not a domain name', level: 'warn', note: 'Enter something like example.com.sg or a website address.' })); return ''; }
    if (!embed) status('Checking…');
    const [rdap, a, aaaa, mx, ns, txt, crt] = await Promise.all([
      getJSON(`https://rdap.org/domain/${d}`), doh(d, 'A'), doh(d, 'AAAA'), doh(d, 'MX'), doh(d, 'NS'), doh(d, 'TXT'),
      embed ? null : getJSON(`https://crt.sh/?q=${enc(`%.${d}`)}&output=json`, {}, 15000),
    ]);
    const rows = [];
    if (rdap) {
      const ev = {}; (rdap.events || []).forEach((e) => { ev[e.eventAction] = (e.eventDate || '').slice(0, 10); });
      rows.push(['Registered', ev.registration], ['Expires', ev.expiration], ['Last changed', ev['last changed']]);
      rdapPeople(rdap).slice(0, 6).forEach((x) => rows.push(x));
      if (rdap.status) rows.push(['Status', rdap.status.join(', ')]);
    }
    const exists = !!(rdap || (a && a.length) || (ns && ns.length));
    let age = '';
    const reg = rows.find((r) => r[0] === 'Registered' && r[1]);
    if (reg) {
      const months = Math.floor((Date.now() - new Date(reg[1])) / (30.44 * 864e5));
      age = months < 12 ? `${months} month${months === 1 ? '' : 's'} old` : `${Math.floor(months / 12)} years old`;
      rows.splice(1, 0, ['Age', age]);
    }
    const sg = d.endsWith('.sg');
    let html = card({
      title: `Domain registration · ${d}`,
      verdict: !exists ? 'No registration or DNS found' : reg ? `Registered domain · ${age}` : 'Registered domain',
      level: !exists ? 'warn' : reg && /month/.test(age) ? 'warn' : 'good',
      rows,
      links: [['Full WHOIS', `https://who.is/whois/${d}`], sg ? ['SGNIC WHOIS (.sg)', 'https://www.sgnic.sg/domain-search.html'] : null,
        ['Web archive history', `https://web.archive.org/web/*/${d}`], ['urlscan.io', `https://urlscan.io/search/#domain:${d}`],
        ['ScamAdviser', `https://www.scamadviser.com/check-website/${d}`]],
      note: !rdap && exists ? (sg ? 'The .sg registry does not answer automated lookups here. Use the SGNIC WHOIS button.' : 'Registration details did not load. Use the Full WHOIS button.')
        : 'Owner details are usually hidden for privacy. The registration date matters most: a business claiming years of history on a domain registered recently deserves a closer look.',
    });
    if (embed) return html;
    const spf = (txt || []).find((t) => /^v=spf1/i.test(t));
    html += card({ title: 'DNS records', rows: [['IP (A)', (a || []).join(', ')], ['IPv6 (AAAA)', (aaaa || []).join(', ')], ['Mail (MX)', (mx || []).join(', ')], ['Name servers', (ns || []).join(', ')], ['SPF', spf]],
      note: a == null ? 'DNS lookup did not answer.' : (a.length || ns.length ? '' : 'No DNS records found.') });
    if (crt) {
      const subs = [...new Set(crt.flatMap((c) => String(c.name_value || '').split('\n')).map((s) => s.trim().toLowerCase().replace(/^\*\./, '')).filter((s) => s.endsWith(d) && s !== d))].sort();
      html += card({ title: `Subdomains seen in certificates (${subs.length})`, items: subs.slice(0, 150), note: subs.length ? '' : 'None found.', links: [['crt.sh', `https://crt.sh/?q=%25.${d}`]] });
    } else {
      html += card({ title: 'Subdomains', note: 'The certificate search (crt.sh) did not answer. It is often slow; try the button.', links: [['crt.sh', `https://crt.sh/?q=%25.${d}`]] });
    }
    status('');
    out(html);
    return '';
  }

  /* ---------------------------------------------------------------- email */
  const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|proton|protonmail|pm|gmx|yandex|mail|zoho|qq|163|126|singnet|starhub|pacific)\.(com|me|net|com\.sg|net\.sg|sg|ru|de|co\.uk)$/i;
  const TEMP_MAIL = /(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|throwaway|yopmail|sharklasers|getnada|dispostable|trashmail|maildrop|mohmal|emailondeck|fakeinbox|mintemail)\./i;
  async function runEmail(q) {
    const e = q.trim().toLowerCase();
    const m = e.match(/^([^@\s]+)@([a-z0-9.-]+\.[a-z]{2,})$/);
    if (!m) return out(card({ title: 'Email', verdict: 'Not an email address', level: 'warn' }));
    const [, local, domain] = m;
    status('Checking…');
    const mx = await doh(domain, 'MX');
    const free = FREE_MAIL.test(domain);
    const temp = TEMP_MAIL.test(domain);
    let verdict = temp ? 'Disposable (throwaway) email service' : mx && !mx.length ? 'This domain cannot receive email' : free ? 'Personal email provider' : 'Custom or company domain';
    const level = temp || (mx && !mx.length) ? 'bad' : free ? 'good' : 'warn';
    if (mx == null) verdict += ' · mail check did not answer';
    let html = card({
      title: 'Email address', verdict, level,
      rows: [['Mailbox name', local], ['Domain', domain], ['Accepts mail (MX)', mx == null ? 'Could not check' : mx.length ? `Yes · ${mx.slice(0, 3).join(', ')}` : 'No']],
      links: [['Breaches (Have I Been Pwned)', 'https://haveibeenpwned.com/'], ['Linked accounts (Epieos)', 'https://epieos.com/'],
        ['Google', `https://www.google.com/search?q=${enc(`"${e}"`)}`], ['Facebook search', `https://www.facebook.com/search/top?q=${enc(e)}`],
        ['Gravatar profile', `https://gravatar.com/${enc(local)}`]],
      html: `<div class="osint-links"><button type="button" class="btn filled small-btn" data-osint-go="username" data-q="${esc(local.replace(/\+.*$/, ''))}">Search “${esc(local.replace(/\+.*$/, ''))}” as a username</button></div>`,
      note: 'Have I Been Pwned and Epieos need the address pasted on their site. People often reuse the mailbox name as a username, so that search is worth running.',
    });
    if (!free && !temp) html += await runDomain(domain, true);
    status('');
    out(html);
  }

  /* ---------------------------------------------------------------- username */
  function runUsername(q) {
    const u = q.trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_.\-]{2,40}$/.test(u)) return out(card({ title: 'Username', verdict: 'Not a username', level: 'warn', note: 'Use 2–40 letters, numbers, dots, dashes or underscores, without spaces.' }));
    const x = (s) => `"${s}"`;
    out(card({
      title: `Search the web for “${u}”`,
      links: [['Google', `https://www.google.com/search?q=${enc(x(u))}`], ['Bing', `https://www.bing.com/search?q=${enc(x(u))}`],
        ['Yandex', `https://yandex.com/search/?text=${enc(x(u))}`], ['DuckDuckGo', `https://duckduckgo.com/?q=${enc(x(u))}`]],
      note: 'Exact-phrase searches. Google usually finds the most.',
    }) + card({
      title: 'Check about 700 sites at once',
      links: [['WhatsMyName', `https://whatsmyname.app/?q=${enc(u)}`], ['Instant Username', `https://instantusername.com/?q=${enc(u)}`]],
      note: 'These free sites test the handle on hundreds of sites in one go. If the name is not filled in, paste it on their page.',
    }) + card({
      title: 'Open the profile directly',
      links: [['Facebook', `https://www.facebook.com/${u}`], ['Instagram', `https://www.instagram.com/${u}/`], ['TikTok', `https://www.tiktok.com/@${u}`],
        ['X / Twitter', `https://x.com/${u}`], ['Threads', `https://www.threads.net/@${u}`], ['Telegram', `https://t.me/${u}`],
        ['LinkedIn', `https://www.linkedin.com/in/${u}`], ['YouTube', `https://www.youtube.com/@${u}`], ['Reddit', `https://www.reddit.com/user/${u}`],
        ['Carousell', `https://www.carousell.sg/u/${u}/`], ['Snapchat', `https://www.snapchat.com/add/${u}`], ['GitHub', `https://github.com/${u}`],
        ['Pinterest', `https://www.pinterest.com/${u}/`], ['Twitch', `https://www.twitch.tv/${u}`], ['Linktree', `https://linktr.ee/${u}`]],
      note: 'A profile that loads means the handle exists there. Treat matches as leads: the same handle on two sites can be two different people, so confirm with a second detail such as a photo, location or linked account.',
    }));
  }

  /* ---------------------------------------------------------------- image */
  function readExif(buf) {
    const v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return { kind: 'notjpeg' };
    let off = 2;
    while (off + 4 < v.byteLength) {
      if (v.getUint8(off) !== 0xff) return { kind: 'none' };
      const marker = v.getUint8(off + 1);
      const len = v.getUint16(off + 2);
      if (marker === 0xe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10);
      if (marker === 0xda) break;
      off += 2 + len;
    }
    return { kind: 'none' };
  }
  function parseTiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (o) => v.getUint16(t + o, le);
    const u32 = (o) => v.getUint32(t + o, le);
    const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const readIfd = (o) => {
      const tags = {};
      if (!o || t + o + 2 > v.byteLength) return tags;
      const n = u16(o);
      for (let i = 0; i < n; i++) {
        const e = o + 2 + i * 12;
        if (t + e + 12 > v.byteLength) break;
        const tag = u16(e); const type = u16(e + 2); const cnt = u32(e + 4);
        const size = (SIZE[type] || 1) * cnt;
        const vo = size > 4 ? u32(e + 8) : e + 8;
        if (t + vo + size > v.byteLength) continue;
        if (type === 2) { let s = ''; for (let k = 0; k < cnt; k++) { const c = v.getUint8(t + vo + k); if (!c) break; s += String.fromCharCode(c); } tags[tag] = s.trim(); }
        else if (type === 3) tags[tag] = u16(vo);
        else if (type === 4) tags[tag] = u32(vo);
        else if (type === 5) { const r = []; for (let k = 0; k < cnt; k++) { const d = u32(vo + k * 8 + 4); r.push(d ? u32(vo + k * 8) / d : 0); } tags[tag] = r; }
      }
      return tags;
    };
    const ifd0 = readIfd(u32(4));
    const exif = ifd0[0x8769] ? readIfd(ifd0[0x8769]) : {};
    const gps = ifd0[0x8825] ? readIfd(ifd0[0x8825]) : {};
    const dms = (a) => (Array.isArray(a) && a.length === 3 ? a[0] + a[1] / 60 + a[2] / 3600 : null);
    let lat = dms(gps[2]); let lon = dms(gps[4]);
    if (lat != null && gps[1] === 'S') lat = -lat;
    if (lon != null && gps[3] === 'W') lon = -lon;
    return {
      kind: 'exif', make: ifd0[0x010f], model: ifd0[0x0110], software: ifd0[0x0131], modified: ifd0[0x0132],
      taken: exif[0x9003], offset: exif[0x9011], lens: exif[0xa434], owner: exif[0xa430] || ifd0[0x013b],
      lat, lon, alt: Array.isArray(gps[6]) ? gps[6][0] : null,
    };
  }
  let imageFile = null;
  function initImage() {
    $('osintFile').addEventListener('change', async () => {
      const f = $('osintFile').files[0];
      if (!f) return;
      imageFile = f;
      const url = URL.createObjectURL(f);
      const meta = readExif(await f.arrayBuffer());
      const rows = [['File', f.name], ['Size', `${(f.size / 1024).toFixed(0)} KB · ${f.type || 'unknown type'}`]];
      let note;
      if (meta.kind === 'exif') {
        rows.push(['Taken', meta.taken ? `${meta.taken.replace(/^(\d+):(\d+):(\d+)/, '$3/$2/$1')}${meta.offset ? ` (UTC${meta.offset})` : ''}` : ''],
          ['Camera', [meta.make, meta.model].filter(Boolean).join(' ')], ['Lens', meta.lens], ['Software / edited with', meta.software],
          ['Last saved', meta.modified ? meta.modified.replace(/^(\d+):(\d+):(\d+)/, '$3/$2/$1') : ''], ['Owner name in file', meta.owner],
          ['GPS location', meta.lat != null ? `${meta.lat.toFixed(6)}, ${meta.lon.toFixed(6)}` : 'None in file']);
        note = meta.lat == null ? 'No location in the file. iPhone removes location when sharing unless “Location” is turned on under Options in the share sheet, and most apps (WhatsApp, Facebook, Telegram) strip it too.' : 'Location comes from the device that took the photo. It can be edited, so treat it as a lead.';
      } else {
        note = meta.kind === 'notjpeg' ? 'Only JPEG photos carry readable camera details here. Screenshots and PNG/WebP files usually have none.' : 'No camera details in this file. It was probably saved by an app that strips them.';
      }
      const links = meta.lat != null ? [['Open in Google Maps', `https://www.google.com/maps?q=${meta.lat},${meta.lon}`], ['Open in OneMap', `https://www.onemap.gov.sg/?lat=${meta.lat}&lng=${meta.lon}`]] : [];
      const share = navigator.canShare && navigator.canShare({ files: [f] });
      out(card({
        title: 'Photo details (read on this device, not uploaded)', rows, links, note,
        html: `<img class="osint-preview" src="${url}" alt="Selected image">`,
      }) + card({
        title: 'Reverse image search',
        html: `<div class="osint-links">
          <button type="button" class="btn filled small-btn" id="lensUpload">Google Lens</button>
          ${share ? '<button type="button" class="btn tinted small-btn" id="shareImg">Share to Google app…</button>' : ''}
          <a class="btn tinted small-btn" href="https://www.bing.com/visualsearch" target="_blank" rel="noopener noreferrer">Bing</a>
          <a class="btn tinted small-btn" href="https://yandex.com/images/" target="_blank" rel="noopener noreferrer">Yandex</a>
          <a class="btn tinted small-btn" href="https://tineye.com/" target="_blank" rel="noopener noreferrer">TinEye</a></div>`,
        note: 'Google Lens opens with this photo. If it opens empty, use “Share to Google app” on iPhone, or upload it on the Lens page. Bing, Yandex and TinEye need the photo uploaded on their page. These find where the same or similar pictures appear online.',
      }));
      $('lensUpload').addEventListener('click', () => lensUpload(f));
      if (share) $('shareImg').addEventListener('click', () => navigator.share({ files: [f] }).catch(() => {}));
    });
    $('osintImgUrlForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = $('osintImgUrl').value.trim();
      if (!/^https?:\/\//i.test(u)) { status('Paste a full image address starting with http:// or https://'); return; }
      status('');
      const x = enc(u);
      out(card({
        title: 'Reverse image search by web address',
        html: `<img class="osint-preview" src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`,
        links: [['Google Lens', `https://lens.google.com/uploadbyurl?url=${x}`], ['Bing', `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${x}`],
          ['Yandex', `https://yandex.com/images/search?rpt=imageview&url=${x}`], ['TinEye', `https://tineye.com/search?url=${x}`]],
        note: 'Each button opens that search engine with the image already loaded. The address must point to the image itself (right-click or long-press the picture → copy image address).',
      }));
    });
  }
  function lensUpload(file) {
    // Posts the photo straight to Google Lens in a new tab, as Google's own "search image" feature does.
    const form = document.createElement('form');
    form.method = 'POST'; form.action = `https://lens.google.com/v3/upload?ep=ccm&s=&st=${Date.now()}`;
    form.enctype = 'multipart/form-data'; form.target = '_blank'; form.hidden = true;
    const input = document.createElement('input');
    input.type = 'file'; input.name = 'encoded_image';
    try { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; } catch (_) { window.open('https://lens.google.com/', '_blank', 'noopener'); return; }
    form.appendChild(input); document.body.appendChild(form); form.submit(); form.remove();
  }

  /* ---------------------------------------------------------------- UEN / ACRA */
  const ACRA_SETS = [['d_3f960c10fed6145404ca7b821f263b87', 'ACRA'], ['d_b1d2b840ab9e993570c037b706b39bb8', 'Other agencies']];
  const UEN_TYPES = {
    LL: 'Limited liability partnership', LP: 'Limited partnership', FC: 'Foreign company', PF: 'Public accounting firm',
    RF: 'Representative office', SS: 'Society', CC: 'Charity', CS: 'Co-operative society', TU: 'Trade union', MB: 'Mosque or Muslim body',
    CP: 'Political party', NB: 'News bureau', GS: 'Government school', GA: 'Government agency', MC: 'Management corporation (strata)',
  };
  function uenKind(u) {
    if (/^\d{8}[A-Z]$/.test(u)) return 'Business (sole proprietor or partnership), registered with ACRA';
    if (/^(18|19|20)\d{7}[A-Z]$/.test(u)) return `Local company, registered in ${u.slice(0, 4)}`;
    const m = u.match(/^([TSR])(\d{2})([A-Z]{2})\d{4}[A-Z]$/);
    if (m) return `${UEN_TYPES[m[3]] || `Other entity (type code ${m[3]})`}, issued ${m[1] === 'T' ? '20' : m[1] === 'S' ? '19' : '18'}${m[2]}`;
    return null;
  }
  const label = (k) => k.replace(/_desc$|_description$/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()).replace(/\bUen\b/g, 'UEN');
  async function runUEN(q) {
    const raw = q.trim();
    const u = raw.toUpperCase().replace(/\s+/g, '');
    const kind = uenKind(u);
    status('Searching ACRA open data…');
    let rows = [];
    let failed = 0;
    if (kind) {
      const res = await Promise.all(ACRA_SETS.map(([id]) => getJSON(`https://data.gov.sg/api/action/datastore_search?resource_id=${id}&filters=${enc(JSON.stringify({ uen: u }))}&limit=5`, {}, 15000)));
      res.forEach((r) => { if (!r || !r.result) failed++; else rows = rows.concat(r.result.records || []); });
    } else {
      if (raw.length < 3) { status(''); return out(card({ title: 'UEN · ACRA', verdict: 'Enter a UEN or at least 3 letters of a name', level: 'warn' })); }
      const r = await getJSON(`https://data.gov.sg/api/action/datastore_search?resource_id=${ACRA_SETS[0][0]}&q=${enc(raw)}&limit=20`, {}, 15000);
      if (!r || !r.result) failed++; else rows = r.result.records || [];
    }
    status('');
    const links = [['BizFile+ (ACRA)', 'https://www.bizfile.gov.sg/'], ['UEN search (uen.gov.sg)', 'https://www.uen.gov.sg/'],
      kind ? ['OpenCorporates', `https://opencorporates.com/companies/sg/${enc(u)}`] : ['OpenCorporates', `https://opencorporates.com/companies/sg?q=${enc(raw)}`],
      ['Google', `https://www.google.com/search?q=${enc(`"${kind ? u : raw}"`)}`]];
    let html = '';
    if (kind) html += card({ title: 'UEN format', verdict: kind, level: 'good', rows: [['UEN', u]] });
    if (failed && !rows.length) {
      html += card({ title: 'ACRA open data', verdict: 'The ACRA data service did not answer', level: 'warn', links,
        note: 'data.gov.sg limits how often it can be searched without an account. Wait a minute and try again, or use the buttons.' });
    } else if (!rows.length) {
      html += card({ title: 'ACRA open data', verdict: kind ? 'No entity found with this UEN' : 'No entity names match', level: 'warn', links,
        note: kind ? 'A correctly formatted UEN that is not on the register may be mistyped or made up. Check on BizFile+.' : 'Try fewer words, or the exact registered name.' });
    } else {
      rows.slice(0, 20).forEach((rec) => {
        const status_ = rec.uen_status_desc || rec.entity_status_description || '';
        const r = Object.entries(rec).filter(([k, v]) => !k.startsWith('_') && v && v !== 'na' && v !== 'NA').map(([k, v]) => [label(k), v]);
        html += card({ title: rec.entity_name || 'Entity', verdict: status_ ? `${status_}${rec.entity_type_desc ? ` · ${rec.entity_type_desc}` : ''}` : '', level: /^registered$|live/i.test(status_) ? 'good' : 'warn', rows: r });
      });
      html += card({ title: 'More detail', links, note: `From ACRA's open data on data.gov.sg, updated monthly. Officers, shareholders and filings are only in the paid BizFile+ business profile.${!kind && rows.length >= 20 ? ' Showing the first 20 matches.' : ''}` });
    }
    out(html);
  }

  /* ---------------------------------------------------------------- tabs and wiring */
  function detect(q) {
    const s = q.trim();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s)) return 'email';
    if (isIPv4(s) || isIPv6(s) || /\.onion\/?$/i.test(s)) return 'ip';
    if (uenKind(s.toUpperCase().replace(/\s+/g, ''))) return 'uen';
    const digits = s.replace(/[\s\-().]/g, '');
    if (/^\+?\d{7,15}$/.test(digits)) return 'phone';
    if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s)) return 'domain';
    return null;
  }
  function setTab(t, keepOut) {
    tab = t;
    document.querySelectorAll('#osintTabs .chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.t === t)));
    const def = TABS.find((x) => x[0] === t);
    $('osintForm').hidden = t === 'image';
    $('osintImage').hidden = t !== 'image';
    $('osintInput').placeholder = def[2];
    $('osintInput').inputMode = t === 'phone' ? 'tel' : t === 'email' ? 'email' : 'text';
    if (!keepOut) { out(''); status(''); }
    if (location.hash !== `#osint/${t}`) history.replaceState(null, '', `#osint/${t}`);
  }
  async function run() {
    const q = $('osintInput').value.trim();
    if (!q) return;
    const d = detect(q);
    // Obvious mismatch (e.g. an email typed on the Phone tab): switch to the right tab.
    if (d && d !== tab && !(tab === 'username' && d === 'domain') && !(tab === 'uen' && d === 'phone')) setTab(d, true);
    $('osintGo').disabled = true;
    try {
      if (tab === 'phone') runPhone(q);
      else if (tab === 'ip') await runIP(q);
      else if (tab === 'domain') await runDomain(q);
      else if (tab === 'email') await runEmail(q);
      else if (tab === 'username') runUsername(q);
      else if (tab === 'uen') await runUEN(q);
    } catch (err) {
      console.error(err); status('Something went wrong with this check. Try again.');
    } finally { $('osintGo').disabled = false; }
  }

  window.loadOsint = function loadOsint() {
    if (!bound) {
      bound = true;
      $('osintTabs').innerHTML = TABS.map(([t, n]) => `<button type="button" class="chip" role="tab" data-t="${t}">${esc(n)}</button>`).join('');
      $('osintTabs').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { setTab(b.dataset.t); if (b.dataset.t !== 'image') $('osintInput').focus(); } });
      $('osintForm').addEventListener('submit', (e) => { e.preventDefault(); run(); });
      $('osintOut').addEventListener('click', (e) => {
        const b = e.target.closest('[data-osint-go]');
        if (b) { setTab(b.dataset.osintGo); $('osintInput').value = b.dataset.q; run(); }
      });
      initImage();
    }
    const m = location.hash.match(/^#osint\/(\w+)/);
    setTab(m && TABS.some((x) => x[0] === m[1]) ? m[1] : tab, true);
  };

  // Exposed for automated tests only.
  window.__osint = { parsePhone, readExif, uenKind, detect, specialRange, inRanges };
})();
