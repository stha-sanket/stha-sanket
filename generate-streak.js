const fs = require("fs");

const USERNAME = process.env.USERNAME || "stha-sanket";
const TOKEN    = process.env.GITHUB_TOKEN;

async function fetchContributions() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is not defined");

  const currentYear = new Date().getFullYear();
  let allDays = [], total = 0;

  for (let year = currentYear; year >= 2015; year--) {
    const from = `${year}-01-01T00:00:00Z`;
    const to   = year === currentYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z`;

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
    const cal  = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) continue;

    total   += cal.totalContributions;
    allDays  = allDays.concat(cal.weeks.flatMap(w => w.contributionDays));

    await new Promise(r => setTimeout(r, 200));
  }

  const days = Array.from(
    new Map(allDays.map(d => [d.date, d])).values()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  return { total, days };
}

function streak(days) {
  let longest = 0, run = 0, current = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) current++;
    else break;
  }
  return { current, longest };
}

function weeklyBars(days) {
  const recent = days.slice(-182);
  const weeks  = [];
  for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7));

  const max  = Math.max(...recent.map(d => d.contributionCount), 1);
  const W    = 14, GAP = 3, H = 36;
  const bars = weeks.map((week, i) => {
    const sum = week.reduce((s, d) => s + d.contributionCount, 0);
    const h   = Math.max(2, (sum / (max * 7)) * H);
    const op  = (0.15 + (sum / (max * 7)) * 0.85).toFixed(2);
    return `<rect x="${i * (W + GAP)}" y="${H - h}" width="${W}" height="${h}" rx="2" fill="#c9d1d9" fill-opacity="${op}"/>`;
  }).join("");

  return { bars, w: weeks.length * (W + GAP) - GAP, h: H };
}

function buildSVG({ total, days, current, longest }) {
  const active      = days.filter(d => d.contributionCount > 0).length;
  const consistency = days.length ? ((active / days.length) * 100).toFixed(1) : "0.0";
  const avg         = active ? Math.round(total / active) : 0;
  const firstDate   = days[0]?.date ?? "";
  const lastDate    = days[days.length - 1]?.date ?? "";
  const years       = firstDate && lastDate
    ? ((new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    : "0";

  const { bars, w: barW, h: barH } = weeklyBars(days);
  const barX = (780 - barW) / 2;

  const W = 860, H = 380;

  const stat = (x, y, label, value, color = "#c9d1d9") => `
  <text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1.5" fill="#484f58">${label}</text>
  <text x="${x}" y="${y + 36}" font-family="'SF Mono','Fira Code',monospace" font-size="32" font-weight="600" fill="${color}">${value}</text>
  <text x="${x}" y="${y + 52}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">days</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- background -->
  <rect width="${W}" height="${H}" rx="14" fill="#0d1117"/>
  <rect width="${W}" height="${H}" rx="14" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- top rule -->
  <line x1="40" y1="58" x2="820" y2="58" stroke="#21262d" stroke-width="1"/>

  <!-- header -->
  <text x="40" y="36" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="600" letter-spacing="2" fill="#e6edf3">${USERNAME}</text>
  <text x="820" y="28" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1" fill="#30363d">contribution stats</text>
  <text x="820" y="44" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1" fill="#21262d">${firstDate} to ${lastDate}</text>

  <!-- stat cards -->
  <!-- current streak -->
  <rect x="40" y="74" width="240" height="110" rx="10" fill="#161b22" stroke="#21262d" stroke-width="1"/>
  ${stat(64, 100, "CURRENT STREAK", current, "#e6edf3")}

  <!-- longest streak -->
  <rect x="310" y="74" width="240" height="110" rx="10" fill="#161b22" stroke="#21262d" stroke-width="1"/>
  ${stat(334, 100, "LONGEST STREAK", longest, "#e6edf3")}

  <!-- total -->
  <rect x="580" y="74" width="240" height="110" rx="10" fill="#161b22" stroke="#21262d" stroke-width="1"/>
  <text x="604" y="100" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1.5" fill="#484f58">TOTAL CONTRIBUTIONS</text>
  <text x="604" y="136" font-family="'SF Mono','Fira Code',monospace" font-size="32" font-weight="600" fill="#e6edf3">${total.toLocaleString()}</text>
  <text x="604" y="152" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">all time</text>

  <!-- divider -->
  <line x1="40" y1="204" x2="820" y2="204" stroke="#161b22" stroke-width="1"/>

  <!-- weekly chart label -->
  <text x="40" y="224" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1.5" fill="#30363d">LAST 26 WEEKS</text>

  <!-- bars -->
  <g transform="translate(${40 + barX}, 232)">${bars}</g>

  <!-- chart baseline -->
  <line x1="40" y1="${232 + barH + 4}" x2="820" y2="${232 + barH + 4}" stroke="#21262d" stroke-width="1"/>

  <!-- footer metrics -->
  <g transform="translate(40, ${232 + barH + 24})">
    <text font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">ACTIVE DAYS</text>
    <text x="0" y="16" font-family="'SF Mono','Fira Code',monospace" font-size="11" font-weight="600" fill="#8b949e">${active}</text>

    <text x="160" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">CONSISTENCY</text>
    <text x="160" y="16" font-family="'SF Mono','Fira Code',monospace" font-size="11" font-weight="600" fill="#8b949e">${consistency}%</text>

    <text x="320" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">AVG / ACTIVE DAY</text>
    <text x="320" y="16" font-family="'SF Mono','Fira Code',monospace" font-size="11" font-weight="600" fill="#8b949e">${avg}</text>

    <text x="480" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">YEARS OF DATA</text>
    <text x="480" y="16" font-family="'SF Mono','Fira Code',monospace" font-size="11" font-weight="600" fill="#8b949e">${years}</text>

    <text x="780" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#21262d">updated automatically</text>
  </g>

</svg>`;
}

(async () => {
  const { total, days } = await fetchContributions();
  const { current, longest } = streak(days);
  const svg = buildSVG({ total, days, current, longest });

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/streak.svg", svg);
  console.log("done — output/streak.svg");
})().catch(e => { console.error(e); process.exit(1); });
