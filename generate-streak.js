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

  const max = Math.max(...recent.map(d => d.contributionCount), 1);
  const W = 13, GAP = 3, H = 40;

  const bars = weeks.map((week, i) => {
    const sum = week.reduce((s, d) => s + d.contributionCount, 0);
    const h   = Math.max(2, (sum / (max * 7)) * H);
    const op  = (0.12 + (sum / (max * 7)) * 0.88).toFixed(2);
    return `<rect x="${i * (W + GAP)}" y="${H - h}" width="${W}" height="${h}" rx="2" fill="#22d3ee" fill-opacity="${op}"/>`;
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
  const barX = (740 - barW) / 2;

  const ACCENT = "#22d3ee";
  const W = 860, H = 400;

  const card = (x, y, w, h, label, value, sub) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#0d1117" stroke="#21262d" stroke-width="1"/>
  <rect x="${x}" y="${y}" width="3" height="${h}" rx="1.5" fill="${ACCENT}" opacity="0.9"/>
  <text x="${x + 20}" y="${y + 28}" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="2" fill="#484f58">${label}</text>
  <text x="${x + 20}" y="${y + 68}" font-family="'SF Mono','Fira Code',monospace" font-size="38" font-weight="600" fill="#e6edf3">${value}</text>
  <text x="${x + 20}" y="${y + 88}" font-family="'SF Mono','Fira Code',monospace" font-size="10" fill="${ACCENT}" opacity="0.7">${sub}</text>`;

  const pill = (x, y, label, value) => `
  <text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1.5" fill="#30363d">${label}</text>
  <text x="${x}" y="${y + 18}" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="600" fill="#8b949e">${value}</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <rect width="${W}" height="${H}" rx="16" fill="#010409"/>
  <rect width="${W}" height="${H}" rx="16" fill="none" stroke="#21262d" stroke-width="1"/>

  <rect x="40" y="0" width="120" height="2" rx="1" fill="${ACCENT}" opacity="0.8"/>

  <text x="40" y="40" font-family="'SF Mono','Fira Code',monospace" font-size="14" font-weight="600" letter-spacing="2" fill="#e6edf3">${USERNAME}</text>
  <text x="40" y="56" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="1" fill="#30363d">github contribution stats  ·  ${firstDate} to ${lastDate}</text>

  <line x1="40" y1="68" x2="820" y2="68" stroke="#161b22" stroke-width="1"/>

  ${card(40,  82, 242, 108, "CURRENT STREAK",  current,              "days")}
  ${card(309, 82, 242, 108, "LONGEST STREAK",  longest,              "days all-time")}
  ${card(578, 82, 242, 108, "CONTRIBUTIONS",   total.toLocaleString(), "all time")}

  <text x="40" y="218" font-family="'SF Mono','Fira Code',monospace" font-size="9" letter-spacing="2" fill="#21262d">LAST 26 WEEKS</text>

  <g transform="translate(${40 + barX}, 226)">${bars}</g>

  <line x1="40" y1="${226 + barH + 6}" x2="820" y2="${226 + barH + 6}" stroke="#161b22" stroke-width="1"/>

  <g transform="translate(40, ${226 + barH + 22})">
    ${pill(0,   0, "ACTIVE DAYS",      active)}
    ${pill(160, 0, "CONSISTENCY",      consistency + "%")}
    ${pill(320, 0, "AVG / ACTIVE DAY", avg)}
    ${pill(480, 0, "YEARS OF DATA",    years + " yrs")}
    <text x="780" y="18" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#21262d">auto-updated daily</text>
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
