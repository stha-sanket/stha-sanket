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
            weeks { contributionDays { date contributionCount weekday } }
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
  // fetch current year + previous year for a full ~52 week view
  const [cur, prev] = await Promise.all([fetchYear(year), fetchYear(year - 1)]);

  const allDays = [
    ...(prev?.weeks.flatMap(w => w.contributionDays) || []),
    ...(cur?.weeks.flatMap(w => w.contributionDays) || []),
  ];

  // dedupe and sort
  const days = Array.from(new Map(allDays.map(d => [d.date, d])).values())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // take last 371 days (53 weeks)
  const recent = days.slice(-371);
  const total  = recent.reduce((s, d) => s + d.contributionCount, 0);
  return { days: recent, total };
}

function buildSVG({ days, total }) {
  const CELL  = 11;
  const GAP   = 3;
  const STEP  = CELL + GAP;
  const COLS  = 53;
  const ROWS  = 7;
  const PAD_L = 32;   // space for day labels
  const PAD_T = 28;   // space for month labels
  const PAD_R = 24;
  const PAD_B = 48;

  const W = PAD_L + COLS * STEP - GAP + PAD_R;
  const H = PAD_T + ROWS * STEP - GAP + PAD_B;

  const ACCENT = "#22d3ee";

  // bucket days into week columns
  // pad front so col 0 starts on Sunday
  const firstDay = new Date(days[0].date);
  const startPad = firstDay.getDay(); // 0=Sun
  const padded   = [...Array(startPad).fill(null), ...days];

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const max = Math.max(...days.map(d => d.contributionCount), 1);

  // color scale — 5 levels
  function cellColor(count) {
    if (count === 0) return { fill: "#161b22", op: 1 };
    const lvl = Math.ceil((count / max) * 4);
    const ops = [0, 0.25, 0.45, 0.7, 1.0];
    return { fill: ACCENT, op: ops[lvl] };
  }

  // build cells
  const cells = weeks.map((week, wi) =>
    week.map((day, di) => {
      if (!day) return "";
      const x = PAD_L + wi * STEP;
      const y = PAD_T + di * STEP;
      const { fill, op } = cellColor(day.contributionCount);
      const title = `${day.date}: ${day.contributionCount}`;
      return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}" fill-opacity="${op}"><title>${title}</title></rect>`;
    }).join("")
  ).join("");

  // month labels
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d);
    if (!firstReal) return;
    const m = new Date(firstReal.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push(`<text x="${PAD_L + wi * STEP}" y="16" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#484f58">${MONTHS[m]}</text>`);
      lastMonth = m;
    }
  });

  // day labels (Mon, Wed, Fri)
  const DAY_LABELS = [null, "Mon", null, "Wed", null, "Fri", null];
  const dayLabels = DAY_LABELS.map((label, i) =>
    label ? `<text x="${PAD_L - 6}" y="${PAD_T + i * STEP + CELL - 2}" text-anchor="end" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">${label}</text>` : ""
  ).join("");

  // legend
  const legendX = W - PAD_R - 6 * (CELL + 2);
  const legendCells = [0, 0.25, 0.45, 0.7, 1.0].map((op, i) =>
    `<rect x="${legendX + i * (CELL + 2)}" y="0" width="${CELL}" height="${CELL}" rx="2" fill="${op === 0 ? '#161b22' : ACCENT}" fill-opacity="${op === 0 ? 1 : op}"/>`
  ).join("");

  // active days + consistency
  const active      = days.filter(d => d.contributionCount > 0).length;
  const consistency = ((active / days.length) * 100).toFixed(1);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <rect width="${W}" height="${H}" rx="14" fill="#010409"/>
  <rect width="${W}" height="${H}" rx="14" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- top accent -->
  <rect x="24" y="0" width="80" height="2" rx="1" fill="${ACCENT}" opacity="0.8"/>

  <!-- month labels -->
  ${monthLabels.join("")}

  <!-- day labels -->
  ${dayLabels}

  <!-- cells -->
  ${cells}

  <!-- footer -->
  <text x="${PAD_L}" y="${H - 22}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">${total.toLocaleString()} contributions in the last year  ·  ${consistency}% consistency</text>

  <!-- legend -->
  <text x="${legendX - 30}" y="${H - 22 + 1}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">less</text>
  <g transform="translate(${legendX - 4}, ${H - 32})">${legendCells}</g>
  <text x="${legendX + 5 * (CELL + 2) + 4}" y="${H - 22 + 1}" font-family="'SF Mono','Fira Code',monospace" font-size="9" fill="#30363d">more</text>

</svg>`;
}

(async () => {
  const { days, total } = await fetchContributions();
  const svg = buildSVG({ days, total });
  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/graph.svg", svg);
  console.log("done — output/graph.svg");
})().catch(e => { console.error(e); process.exit(1); });
