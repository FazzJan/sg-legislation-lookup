// Build an encrypted copy of the site into dist/.
// The password comes from the SITE_PASSWORD environment variable (a GitHub
// Actions secret). It is never written to the repository.
//   SITE_PASSWORD='...' node scripts/build-encrypted.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const password = process.env.SITE_PASSWORD;
if (!password) { console.error('SITE_PASSWORD is not set'); process.exit(1); }
if (password.length < 12) console.warn('Warning: SITE_PASSWORD is shorter than 12 characters and is easy to guess.');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const acts = read('data/acts.json');
const lists = acts.map((a) => read(`data/acts/${a.id}.json`));
const guide = read('data/guides/cpc-part19.json');
const charges = read('data/guides/charges.json');
const meta = read('data/meta.json');
const npcGeo = read('data/geo/npc.json');
const npcNames = read('data/geo/npc-names.json');
const plain = new TextEncoder().encode(JSON.stringify({ acts, lists, guide, charges, meta, npcGeo, npcNames }));

const iterations = 600000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
const b64 = (u) => Buffer.from(u).toString('base64');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/data', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('css', 'dist/css', { recursive: true });
cpSync('js', 'dist/js', { recursive: true });
cpSync('icons', 'dist/icons', { recursive: true });
cpSync('fonts', 'dist/fonts', { recursive: true });
cpSync('manifest.webmanifest', 'dist/manifest.webmanifest');
cpSync('sw.js', 'dist/sw.js');
writeFileSync('dist/data/vault.json', JSON.stringify({ v: 1, iterations, salt: b64(salt), iv: b64(iv), data: b64(data) }));
writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
console.log(`dist/ built: ${acts.length} statutes, ${lists.flat().length} rows, ${data.length} encrypted bytes`);
