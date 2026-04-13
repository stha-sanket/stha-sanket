// generate-langs.js
// Run by the GitHub Action — fetches language data and writes assets/langs.svg

const fs = require('fs');
const path = require('path');
const https = require('https');

const USERNAME   = process.env.USERNAME   || 'stha-sanket';
const TOKEN      = process.env.GITHUB_TOKEN || '';
const LANGS_COUNT = parseInt(process.env.LANGS_COUNT || '6', 10);

const LANG_COLORS = {
  JavaScript: '#F7DF1E', TypeScript: '#3178C6', Python:  '#4584B6',
  Java:       '#B07219', 'C#':       '#239120', 'C++':   '#F34B7D',
  C:          '#A8A8A8', Ruby:       '#CC342D', Go:      '#00ACD7',
  Rust:       '#DEA584', PHP:        '#8892BF', Swift:   '#FA7343',
  Kotlin:     '#7F52FF', HTML:       '#E44D26', CSS:     '#264DE4',
  Shell:      '#4EAA25', Dart:       '#00B4AB', Vue:     '#41B883',
  Svelte:     '#FF3E00', Scala:      '#DC322F', R:       '#276DC3',
};
const FALLBACK_COLORS = ['#8B949E','#6E7681','#484F58','#30363D'];

function get(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'lang-graph-action',
        'Accept':     'application/vnd.github+json',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    };
    https.get(url, opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchRepos() {
  let all = [], page = 1;
  while (true) {
    const data = await get(`https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}`);
    if (!Array.isArray(data) || !data.length) break;
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function fetchLangs(repos) {
  const totals = {};
  await Promise.all(repos.slice(0, 50).map(async repo => {
    try {
      const langs = await get(repo.languages_url);
      for (const [lang, bytes] of Object.entries(langs)) {
        totals[lang] = (totals[lang] || 0) + bytes;
      }
    } catch {}
  }));
  return totals;
}

function buildSVG(langs, user) {
  // Layout constants
  const W          = 320;
  const PAD        = 20;
  const ROW_H      = 28;
  const HEADER_H   = 52;
  const FOOTER_H   = 32;
  const BAR_X      = 110;          // x where bars start
  const BAR_W      = W - BAR_X - PAD - 44;  // bar track width
  const H          = HEADER_H + langs.length * ROW_H + FOOTER_H + 8;

  const total = langs.reduce((s, l) => s + l.bytes, 0);

  const rows = langs.map((l, i) => {
    const pct    = ((l.bytes / total) * 100).toFixed(1);
    const barLen = ((l.bytes / total) * BAR_W).toFixed(1);
    const color  = LANG_COLORS[l.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    const y      = HEADER_H + i * ROW_H + ROW_H / 2;

    return `
    <!-- ${l.name} -->
    <circle cx="${PAD + 4}" cy="${y}" r="3.5" fill="${color}" />
    <text x="${PAD + 14}" y="${y + 4}" font-size="11" fill="#c9d1d9" font-family="'SF Mono','Fira Code',monospace" letter-spacing="0.3">${l.name}</text>
    <rect x="${BAR_X}" y="${y - 5}" width="${BAR_W}" height="3" rx="1.5" fill="#21262d" />
    <rect x="${BAR_X}" y="${y - 5}" width="${barLen}" height="3" rx="1.5" fill="${color}" />
    <text x="${W - PAD}" y="${y + 4}" font-size="10" fill="#484f58" font-family="'SF Mono','Fira Code',monospace" text-anchor="end">${pct}%</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>Top Languages — ${USERNAME}</title>

  <!-- background -->
  <rect width="${W}" height="${H}" rx="12" fill="#161b22" />
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#30363d" stroke-width="1" />

  <!-- header -->
  <text x="${PAD}" y="22" font-size="11" fill="#8b949e" font-family="'SF Mono','Fira Code',monospace" letter-spacing="0.5">TOP LANGUAGES</text>
  <text x="${PAD}" y="40" font-size="12" fill="#484f58" font-family="'SF Mono','Fira Code',monospace">@${user}</text>
  <line x1="${PAD}" y1="${HEADER_H}" x2="${W - PAD}" y2="${HEADER_H}" stroke="#21262d" stroke-width="1" />

  ${rows}

  <!-- footer -->
  <line x1="${PAD}" y1="${H - FOOTER_H}" x2="${W - PAD}" y2="${H - FOOTER_H}" stroke="#21262d" stroke-width="1" />
  <text x="${PAD}" y="${H - 12}" font-size="10" fill="#484f58" font-family="'SF Mono','Fira Code',monospace">updated automatically</text>
</svg>`;
}

(async () => {
  console.log(`Fetching data for ${USERNAME}...`);
  const repos = await fetchRepos();
  console.log(`  ${repos.length} repos found`);

  const langBytes = await fetchLangs(repos);
  const sorted = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, LANGS_COUNT)
    .map(([name, bytes]) => ({ name, bytes }));

  console.log('  Languages:', sorted.map(l => l.name).join(', '));

  const svg = buildSVG(sorted, USERNAME);

  const outDir = path.join(process.cwd(), 'assets');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'langs.svg'), svg, 'utf8');
  console.log('  Written to assets/langs.svg');
})();
