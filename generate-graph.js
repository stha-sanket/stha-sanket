const fs = require("fs");

const USERNAME = process.env.USERNAME || "stha-sanket";
const TOKEN    = process.env.GITHUB_TOKEN;

async function fetchYear(year) {
  const from = `${year}-01-01T00:00:00Z`;
  const to   = year === new Date().getFullYear()
    ? new Date().toISOString()
    : `${year}-12-31T23:59:59Z`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `{
      user(login: "${USERNAME}") {
        contributionsCollection(from: "${from}", to: "${to}") {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }` }),
  });

  const json = await res.json();
  return json.data?.user?.contributionsCollection?.contributionCalendar;
}

async function fetchContributions() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is not defined");
  const year = new Date().getFullYear();
  const [cur, prev] = await Promise.all([fetchYear(year), fetchYear(year - 1)]);

  const allDays = [
    ...(prev?.weeks.flatMap(w => w.contributionDays) || []),
    ...(cur?.weeks.flatMap(w => w.contributionDays) || []),
  ];

  const days = Array.from(new Map(allDays.map(d => [d.date, d])).values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-365);

  const total = days.reduce((s, d) => s + d.contributionCount, 0);
  return { days, total };
}

function buildSVG({ days, total }) {
  const ACCENT = "#22d3ee";

  const W       = 820;
  const H       = 220;
  const PAD_L   = 36;
  const PAD_R   = 24;
  const PAD_T   = 28;
  const PAD_B   = 40;
  const CARD_W  = W + PAD_L + PAD_R;
  const CARD_H  = H + PAD_T + PAD_B;

  const chartW = W;
  const chartH = H;

  const max    = Math.max(...days.map(d => d.contributionCount), 1);
  const n      = days.length;

  // map day index -> SVG coords
  const px = i => PAD_L + (i / (n - 1)) * chartW;
  const py = c => PAD_T + chartH - (c / max) * chartH;

  // smooth line points
  const points = days.map((d, i) => `${px(i).toFixed(1)},${py(d.contributionCount).toFixed(1)}`).join(" ");

  // area fill path
  const area = [
    `M ${px(0).toFixed(1)},${(PAD_T + chartH).toFixed(1)}`,
    ...days.map((d, i) => `L ${px(i).toFixed(1)},${py(d.contributionCount).toFixed(1)}`),
    `L ${px(n - 1).toFixed(1)},${(PAD_T + chartH).toFixed(1)}`,
    "Z"
  ].join(" ");

  // y-axis gridlines (4 levels)
  const gridLines = [0.25, 0.5, 0.75, 1].map(t => {
    const y   = (PAD_T + chartH - t * chartH).toFixed(1);
    const val = Math.round(t * max);
    return `
    <line x1="${PAD_L}" y1="${y}" x2="${PAD_L + chartW}" y2="${y}" stroke="#161b22" stroke-width="1"/>
    <text x="${PAD_L - 6}" y="${parseFloat(y) + 4}" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="8" fill="#30363d">${val}</text>`;
  }).join("");

  // month labels on x-axis
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabels = [];
  let lastMonth = -1;
  days.forEach((d, i) => {
    const m = new Date(d.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push(`<text x="${px(i).toFixed(1)}" y="${PAD_T + chartH + 16}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#484f58">${MONTHS[m]}</text>`);
      lastMonth = m;
    }
  });

  // peak dot — highest single day
  const peakIdx   = days.reduce((best, d, i) => d.contributionCount > days[best].contributionCount ? i : best, 0);
  const peakDay   = days[peakIdx];
  const peakX     = px(peakIdx).toFixed(1);
  const peakY     = py(peakDay.contributionCount).toFixed(1);

  // active days + consistency
  const active      = days.filter(d => d.contributionCount > 0).length;
  const consistency = ((active / days.length) * 100).toFixed(1);

  return `<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0.01"/>
    </linearGradient>
    <clipPath id="chartClip">
      <rect x="${PAD_L}" y="${PAD_T}" width="${chartW}" height="${chartH}"/>
    </clipPath>
  </defs>

  <!-- card -->
  <rect width="${CARD_W}" height="${CARD_H}" rx="14" fill="#010409"/>
  <rect width="${CARD_W}" height="${CARD_H}" rx="14" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- top accent -->
  <rect x="24" y="0" width="80" height="2" rx="1" fill="${ACCENT}" opacity="0.8"/>

  <!-- header -->
  <text x="24" y="20" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="2" fill="#30363d">DAILY CONTRIBUTIONS  ·  LAST 365 DAYS</text>

  <!-- gridlines + y labels -->
  ${gridLines}

  <!-- area fill -->
  <path d="${area}" fill="url(#areaGrad)" clip-path="url(#chartClip)"/>

  <!-- line -->
  <polyline points="${points}" fill="none" stroke="${ACCENT}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#chartClip)" opacity="0.9"/>

  <!-- peak dot -->
  <circle cx="${peakX}" cy="${peakY}" r="3" fill="${ACCENT}" clip-path="url(#chartClip)"/>
  <circle cx="${peakX}" cy="${peakY}" r="6" fill="${ACCENT}" fill-opacity="0.15" clip-path="url(#chartClip)"/>
  <text x="${parseFloat(peakX) + 8}" y="${parseFloat(peakY) - 4}" font-family="'SF Mono','Fira Code',monospace" font-size="8" fill="${ACCENT}" opacity="0.7">${peakDay.contributionCount} on ${peakDay.date}</text>

  <!-- x-axis month labels -->
  ${monthLabels.join("")}

  <!-- footer -->
  <text x="24" y="${CARD_H - 8}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">${total.toLocaleString()} contributions  ·  ${consistency}% consistency  ·  ${active} active days</text>

</svg>`;
}

(async () => {
  const { days, total } = await fetchContributions();
  const svg = buildSVG({ days, total });
  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/graph.svg", svg);
  console.log("done — output/graph.svg");
})().catch(e => { console.error(e); process.exit(1); });
