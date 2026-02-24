const fs = require("fs");

const username = "stha-sanket";
const token = process.env.GITHUB_TOKEN;

async function getAllContributions() {
  if (!token) throw new Error("GITHUB_TOKEN is not defined");

  const currentYear = new Date().getFullYear();
  const startYear = 2015;

  let allDays = [];
  let totalContributions = 0;

  console.log(`Fetching contributions year by year for ${username}...`);

  for (let year = currentYear; year >= startYear; year--) {
    try {
      const fromDate = `${year}-01-01T00:00:00Z`;
      const toDate =
        year === currentYear
          ? new Date().toISOString()
          : `${year}-12-31T23:59:59Z`;

      console.log(`  📅 Fetching ${year}...`);

      const query = `{
        user(login: "${username}") {
          contributionsCollection(from: "${fromDate}", to: "${toDate}") {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays { date contributionCount }
              }
            }
          }
        }
      }`;

      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();

      if (json.data?.user) {
        const cal =
          json.data.user.contributionsCollection.contributionCalendar;
        totalContributions += cal.totalContributions || 0;
        allDays = [...allDays, ...cal.weeks.flatMap((w) => w.contributionDays)];
        console.log(`     ✓ ${cal.totalContributions} contributions in ${year}`);
      }

      await new Promise((r) => setTimeout(r, 300));
    } catch {
      console.log(`     ⚠ Error fetching ${year}, skipping...`);
    }
  }

  const days = Array.from(
    new Map(allDays.map((d) => [d.date, d])).values()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\n✅ Total: ${totalContributions} contributions over ${days.length} days`);
  return { total: totalContributions, days };
}

function calculateStreak(days) {
  if (!days?.length) return { current: 0, longest: 0 };

  let longest = 0, temp = 0, current = 0;

  for (const day of days) {
    if (day.contributionCount > 0) { temp++; longest = Math.max(longest, temp); }
    else temp = 0;
  }

  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) current++;
    else break;
  }

  return { current, longest };
}

// ─── Heatmap builder ────────────────────────────────────────────────────────
function buildHeatmap(days) {
  // Take last 182 days (26 weeks)
  const recent = days.slice(-182);
  const max = Math.max(...recent.map((d) => d.contributionCount), 1);

  // Arrange into weeks (columns) × days (rows)
  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) {
    weeks.push(recent.slice(i, i + 7));
  }

  const cellSize = 11;
  const gap = 3;
  const cols = weeks.length;
  const rows = 7;
  const width = cols * (cellSize + gap);
  const height = rows * (cellSize + gap);

  const levelColor = (count) => {
    const ratio = count / max;
    if (count === 0) return "#1a1e2a";
    if (ratio < 0.25) return "#1a4a3a";
    if (ratio < 0.5)  return "#1a7a5a";
    if (ratio < 0.75) return "#00c896";
    return "#00ffc3";
  };

  let cells = "";
  weeks.forEach((week, col) => {
    week.forEach((day, row) => {
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      const fill = levelColor(day.contributionCount);
      const opacity = day.contributionCount === 0 ? "0.4" : "1";
      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${fill}" opacity="${opacity}">
        <title>${day.date}: ${day.contributionCount} contributions</title>
      </rect>`;
    });
  });

  return { svg: cells, width, height };
}

// ─── SVG generator ──────────────────────────────────────────────────────────
function generateSVG({ username, current, longest, total, activeDays, totalDays, consistency, avgPerActiveDay, firstDate, lastDate, yearsOfData, days }) {
  const heatmap = buildHeatmap(days);
  const W = 920;
  const H = 480;
  const heatX = (W - heatmap.width) / 2;
  const heatY = 295;

  // Format large numbers
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="'SF Mono', 'Fira Code', 'Cascadia Code', monospace">

  <defs>
    <!-- Deep space background -->
    <radialGradient id="bg" cx="30%" cy="25%" r="80%">
      <stop offset="0%"   stop-color="#0d1424"/>
      <stop offset="60%"  stop-color="#070c18"/>
      <stop offset="100%" stop-color="#04080f"/>
    </radialGradient>

    <!-- Teal accent gradient -->
    <linearGradient id="teal" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#00ffc3"/>
      <stop offset="100%" stop-color="#00c8ff"/>
    </linearGradient>

    <!-- Amber accent gradient -->
    <linearGradient id="amber" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#ffb347"/>
      <stop offset="100%" stop-color="#ff6b6b"/>
    </linearGradient>

    <!-- Purple accent gradient -->
    <linearGradient id="purple" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>

    <!-- Card fill -->
    <linearGradient id="cardFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.01"/>
    </linearGradient>

    <!-- Glow for numbers -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Subtle card glow -->
    <filter id="cardGlow" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Noise texture -->
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
      <feComposite in="blend" in2="SourceGraphic" operator="in"/>
    </filter>

    <!-- Grid clip -->
    <clipPath id="heatClip">
      <rect x="${heatX - 4}" y="${heatY - 4}" width="${heatmap.width + 8}" height="${heatmap.height + 8}" rx="6"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="24" fill="url(#bg)"/>

  <!-- Subtle noise overlay -->
  <rect width="${W}" height="${H}" rx="24" fill="#ffffff" opacity="0.015" filter="url(#noise)"/>

  <!-- Border -->
  <rect width="${W}" height="${H}" rx="24" fill="none" stroke="url(#teal)" stroke-width="1" stroke-opacity="0.25"/>

  <!-- Top-left accent line -->
  <line x1="24" y1="24" x2="100" y2="24" stroke="url(#teal)" stroke-width="1.5" stroke-opacity="0.6"/>
  <line x1="24" y1="24" x2="24" y2="80" stroke="url(#teal)" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Top-right accent line -->
  <line x1="${W - 24}" y1="24" x2="${W - 100}" y2="24" stroke="url(#purple)" stroke-width="1.5" stroke-opacity="0.6"/>
  <line x1="${W - 24}" y1="24" x2="${W - 24}" y2="80" stroke="url(#purple)" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Bottom corners -->
  <line x1="24" y1="${H - 24}" x2="100" y2="${H - 24}" stroke="url(#teal)" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="24" y1="${H - 24}" x2="24" y2="${H - 80}" stroke="url(#teal)" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="${W - 24}" y1="${H - 24}" x2="${W - 100}" y2="${H - 24}" stroke="url(#purple)" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="${W - 24}" y1="${H - 24}" x2="${W - 24}" y2="${H - 80}" stroke="url(#purple)" stroke-width="1.5" stroke-opacity="0.3"/>

  <!-- Header: username -->
  <text x="50" y="62" font-size="11" letter-spacing="4" fill="url(#teal)" fill-opacity="0.7" text-anchor="start">GITHUB STATS</text>
  <text x="${W / 2}" y="70" font-size="28" font-weight="700" letter-spacing="6" fill="#e8eaf6" text-anchor="middle" filter="url(#cardGlow)">${username.toUpperCase()}</text>
  <text x="${W - 50}" y="62" font-size="11" letter-spacing="2" fill="url(#purple)" fill-opacity="0.7" text-anchor="end">${firstDate} → ${lastDate}</text>

  <!-- Divider -->
  <line x1="50" y1="90" x2="${W - 50}" y2="90" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.08"/>

  <!-- ── STAT CARDS ──────────────────────────────────────────────────────── -->

  <!-- Current Streak Card -->
  <g transform="translate(50, 112)">
    <rect x="0" y="0" width="250" height="145" rx="16" fill="url(#cardFill)" stroke="url(#teal)" stroke-width="1" stroke-opacity="0.35"/>
    <!-- Glow blob -->
    <ellipse cx="50" cy="30" rx="60" ry="30" fill="#00ffc3" fill-opacity="0.04"/>
    <!-- Label row -->
    <text x="20" y="28" font-size="9" letter-spacing="3" fill="#00ffc3" fill-opacity="0.6">CURRENT STREAK</text>
    <!-- Value -->
    <text x="20" y="95" font-size="64" font-weight="700" fill="url(#teal)" filter="url(#glow)">${current}</text>
    <!-- Unit -->
    <text x="20" y="120" font-size="11" letter-spacing="2" fill="#00ffc3" fill-opacity="0.5">DAYS IN A ROW</text>
    <!-- Decorative tick marks -->
    <line x1="0" y1="145" x2="60" y2="145" stroke="url(#teal)" stroke-width="2" stroke-opacity="0.5"/>
  </g>

  <!-- Longest Streak Card -->
  <g transform="translate(335, 112)">
    <rect x="0" y="0" width="250" height="145" rx="16" fill="url(#cardFill)" stroke="url(#amber)" stroke-width="1" stroke-opacity="0.35"/>
    <ellipse cx="50" cy="30" rx="60" ry="30" fill="#ffb347" fill-opacity="0.04"/>
    <text x="20" y="28" font-size="9" letter-spacing="3" fill="#ffb347" fill-opacity="0.6">LONGEST STREAK</text>
    <text x="20" y="95" font-size="64" font-weight="700" fill="url(#amber)" filter="url(#glow)">${longest}</text>
    <text x="20" y="120" font-size="11" letter-spacing="2" fill="#ffb347" fill-opacity="0.5">PERSONAL BEST</text>
    <line x1="0" y1="145" x2="60" y2="145" stroke="url(#amber)" stroke-width="2" stroke-opacity="0.5"/>
  </g>

  <!-- Total Contributions Card -->
  <g transform="translate(620, 112)">
    <rect x="0" y="0" width="250" height="145" rx="16" fill="url(#cardFill)" stroke="url(#purple)" stroke-width="1" stroke-opacity="0.35"/>
    <ellipse cx="50" cy="30" rx="60" ry="30" fill="#a78bfa" fill-opacity="0.04"/>
    <text x="20" y="28" font-size="9" letter-spacing="3" fill="#a78bfa" fill-opacity="0.6">TOTAL CONTRIBUTIONS</text>
    <text x="20" y="95" font-size="64" font-weight="700" fill="url(#purple)" filter="url(#glow)">${fmt(total)}</text>
    <text x="20" y="120" font-size="11" letter-spacing="2" fill="#a78bfa" fill-opacity="0.5">OVER ${yearsOfData} YEARS</text>
    <line x1="0" y1="145" x2="60" y2="145" stroke="url(#purple)" stroke-width="2" stroke-opacity="0.5"/>
  </g>

  <!-- ── HEATMAP SECTION ─────────────────────────────────────────────────── -->

  <!-- Section label -->
  <text x="50" y="${heatY - 14}" font-size="9" letter-spacing="3" fill="#ffffff" fill-opacity="0.25">LAST 26 WEEKS</text>
  <text x="${W - 50}" y="${heatY - 14}" font-size="9" letter-spacing="2" fill="#ffffff" fill-opacity="0.25" text-anchor="end">TODAY</text>

  <!-- Heatmap cells -->
  <g transform="translate(${heatX}, ${heatY})" clip-path="url(#heatClip)">
    ${heatmap.svg}
  </g>

  <!-- ── FOOTER STATS ────────────────────────────────────────────────────── -->
  <line x1="50" y1="${H - 60}" x2="${W - 50}" y2="${H - 60}" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.08"/>

  <g transform="translate(${W / 2}, ${H - 34})" text-anchor="middle">
    <!-- Three mini stats in one line -->
    <text font-size="10" letter-spacing="1" fill="#60687a">
      <tspan fill="#00ffc3" fill-opacity="0.7">${activeDays}</tspan>
      <tspan fill="#404858" dx="4">active days</tspan>
      <tspan fill="#2a3040" dx="12">·</tspan>
      <tspan fill="#ffb347" fill-opacity="0.7" dx="12">${consistency}%</tspan>
      <tspan fill="#404858" dx="4">consistency</tspan>
      <tspan fill="#2a3040" dx="12">·</tspan>
      <tspan fill="#a78bfa" fill-opacity="0.7" dx="12">${avgPerActiveDay}</tspan>
      <tspan fill="#404858" dx="4">avg / active day</tspan>
    </text>
  </g>

  <!-- Bottom attribution -->
  <text x="${W / 2}" y="${H - 14}" font-size="9" letter-spacing="2" fill="#ffffff" fill-opacity="0.1" text-anchor="middle">github.com/${username}</text>

</svg>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("🚀 GitHub Stats Generator\n");

    const data = await getAllContributions();
    const { current, longest } = calculateStreak(data.days);

    const firstDate = data.days.at(0)?.date ?? "N/A";
    const lastDate  = data.days.at(-1)?.date ?? "N/A";
    const yearsOfData =
      data.days.length > 0
        ? (
            (new Date(lastDate) - new Date(firstDate)) /
            (1000 * 60 * 60 * 24 * 365)
          ).toFixed(1)
        : 0;

    const activeDays      = data.days.filter((d) => d.contributionCount > 0).length;
    const totalDays       = data.days.length;
    const consistency     = totalDays > 0 ? ((activeDays / totalDays) * 100).toFixed(1) : 0;
    const avgPerActiveDay = activeDays > 0 ? Math.round(data.total / activeDays) : 0;

    console.log(`\n📊 Stats for ${username}:`);
    console.log(`   Period    : ${firstDate} → ${lastDate} (${yearsOfData} yrs)`);
    console.log(`   Streak    : ${current} days (longest: ${longest})`);
    console.log(`   Total     : ${data.total.toLocaleString()}`);
    console.log(`   Consistency: ${consistency}%`);

    const svg = generateSVG({
      username,
      current,
      longest,
      total: data.total,
      activeDays,
      totalDays,
      consistency,
      avgPerActiveDay,
      firstDate,
      lastDate,
      yearsOfData,
      days: data.days,
    });

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);

    console.log("\n✅ SVG saved → output/streak.svg");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
})();
