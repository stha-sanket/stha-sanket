const fs = require("fs");

const username = "stha-sanket";
const token = process.env.GITHUB_TOKEN;

async function getAllContributions() {
  if (!token) throw new Error("GITHUB_TOKEN is not defined");

  const currentYear = new Date().getFullYear();
  const startYear = 2015;
  let allDays = [];
  let totalContributions = 0;

  console.log(`Fetching contributions for ${username}...`);

  for (let year = currentYear; year >= startYear; year--) {
    try {
      const fromDate = `${year}-01-01T00:00:00Z`;
      const toDate = year === currentYear
        ? new Date().toISOString()
        : `${year}-12-31T23:59:59Z`;

      console.log(`  📅 Fetching ${year}...`);

      const query = `{
        user(login: "${username}") {
          contributionsCollection(from: "${fromDate}", to: "${toDate}") {
            contributionCalendar {
              totalContributions
              weeks { contributionDays { date contributionCount } }
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
        const calendar = json.data.user.contributionsCollection.contributionCalendar;
        totalContributions += calendar.totalContributions || 0;
        const days = calendar.weeks?.flatMap(w => w.contributionDays) || [];
        allDays = [...allDays, ...days];
        console.log(`     ✓ ${calendar.totalContributions} contributions in ${year}`);
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`     ⚠ Error fetching ${year}, skipping...`);
    }
  }

  const uniqueDays = Array.from(
    new Map(allDays.map(d => [d.date, d])).values()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  return { total: totalContributions, days: uniqueDays };
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

// Generate a mini bar chart of the last 26 weeks
function generateMiniChart(days) {
  const recentDays = days.slice(-182); // ~26 weeks
  const weeks = [];
  for (let i = 0; i < recentDays.length; i += 7) {
    weeks.push(recentDays.slice(i, i + 7));
  }

  const maxCount = Math.max(...recentDays.map(d => d.contributionCount), 1);
  const barW = 12;
  const gap = 4;
  const chartH = 40;
  const totalW = weeks.length * (barW + gap);

  const bars = weeks.map((week, wi) => {
    const total = week.reduce((s, d) => s + d.contributionCount, 0);
    const h = Math.max(2, (total / (maxCount * 7)) * chartH);
    const x = wi * (barW + gap);
    const y = chartH - h;
    // Color intensity based on activity
    const intensity = total / (maxCount * 7);
    const alpha = 0.2 + intensity * 0.8;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="#22d3ee" fill-opacity="${alpha.toFixed(2)}"/>`;
  }).join("\n    ");

  return { bars, totalW, chartH };
}

function generateSVG({ username, current, longest, total, activeDays, totalDays, consistency, avgPerActiveDay, firstDate, lastDate, yearsOfData, days }) {

  const { bars, totalW, chartH } = generateMiniChart(days);
  const chartOffsetX = (860 - totalW) / 2;

  // Format total with commas
  const totalFormatted = total.toLocaleString();

  // Rank badge
  const rank = total > 5000 ? "ELITE" : total > 2000 ? "PRO" : total > 500 ? "ACTIVE" : "RISING";
  const rankColor = total > 5000 ? "#f59e0b" : total > 2000 ? "#22d3ee" : total > 500 ? "#34d399" : "#a78bfa";

  return `<svg width="860" height="420" viewBox="0 0 860 420" xmlns="http://www.w3.org/2000/svg">
  <defs>

    <!-- Base background -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050b14"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>

    <!-- Cyan accent gradient -->
    <linearGradient id="accentCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>

    <!-- Amber accent gradient -->
    <linearGradient id="accentAmber" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>

    <!-- Purple accent gradient -->
    <linearGradient id="accentPurple" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>

    <!-- Green accent gradient -->
    <linearGradient id="accentGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>

    <!-- Card 1 fill -->
    <linearGradient id="card1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.04"/>
    </linearGradient>

    <!-- Card 2 fill -->
    <linearGradient id="card2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.04"/>
    </linearGradient>

    <!-- Card 3 fill -->
    <linearGradient id="card3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0.04"/>
    </linearGradient>

    <!-- Title shimmer -->
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="40%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-1.5 0;1.5 0;-1.5 0" dur="4s" repeatCount="indefinite"/>
    </linearGradient>

    <!-- Glow filters -->
    <filter id="glowCyan" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="glowAmber" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="softShadow" x="-5%" y="-5%" width="110%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.5"/>
    </filter>

    <filter id="cardGlow" x="-10%" y="-10%" width="120%" height="130%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Noise texture for depth -->
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
      <feComposite in="blend" in2="SourceGraphic" operator="in"/>
    </filter>

    <!-- Clip card corners -->
    <clipPath id="cardClip">
      <rect width="860" height="420" rx="20"/>
    </clipPath>

  </defs>

  <!-- === BACKGROUND === -->
  <rect width="860" height="420" rx="20" fill="url(#bg)" filter="url(#softShadow)"/>

  <!-- Grid lines (subtle) -->
  <g stroke="#ffffff" stroke-opacity="0.025" stroke-width="1">
    <line x1="0" y1="105" x2="860" y2="105"/>
    <line x1="0" y1="210" x2="860" y2="210"/>
    <line x1="0" y1="315" x2="860" y2="315"/>
    <line x1="215" y1="0" x2="215" y2="420"/>
    <line x1="430" y1="0" x2="430" y2="420"/>
    <line x1="645" y1="0" x2="645" y2="420"/>
  </g>

  <!-- Ambient glow orbs -->
  <ellipse cx="150" cy="80" rx="180" ry="120" fill="#06b6d4" fill-opacity="0.04"/>
  <ellipse cx="710" cy="340" rx="200" ry="140" fill="#7c3aed" fill-opacity="0.05"/>
  <ellipse cx="430" cy="210" rx="250" ry="160" fill="#0ea5e9" fill-opacity="0.02"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="860" height="2" rx="1" fill="url(#accentCyan)" opacity="0.9">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>
  </rect>

  <!-- === HEADER SECTION === -->
  <!-- Left: username + handle -->
  <g transform="translate(40, 38)">
    <!-- Tiny decorative bracket -->
    <text x="0" y="14" font-family="'Courier New', monospace" font-size="11" fill="#06b6d4" fill-opacity="0.7">&lt;/&gt;</text>

    <!-- Username -->
    <text x="28" y="16" font-family="'Courier New', monospace" font-size="22" font-weight="700" letter-spacing="3" fill="url(#titleGrad)" filter="url(#glowCyan)">
      ${username}
    </text>

    <!-- Subtitle -->
    <text x="28" y="34" font-family="'Courier New', monospace" font-size="10" letter-spacing="2" fill="#475569">
      GITHUB  CONTRIBUTION  STATS
    </text>
  </g>

  <!-- Right: rank badge + date range -->
  <g transform="translate(820, 20)" text-anchor="end">
    <!-- Rank badge pill -->
    <rect x="-66" y="0" width="66" height="22" rx="11" fill="${rankColor}" fill-opacity="0.15" stroke="${rankColor}" stroke-width="1" stroke-opacity="0.6"/>
    <text x="-33" y="15" text-anchor="middle" font-family="'Courier New', monospace" font-size="10" font-weight="700" letter-spacing="2" fill="${rankColor}">
      ${rank}
    </text>

    <!-- Date range -->
    <text x="0" y="44" font-family="'Courier New', monospace" font-size="9" fill="#334155" letter-spacing="1">
      ${firstDate} → ${lastDate}
    </text>
    <text x="0" y="57" font-family="'Courier New', monospace" font-size="9" fill="#1e3a5f">
      ${yearsOfData} YRS OF DATA
    </text>
  </g>

  <!-- Divider line under header -->
  <line x1="40" y1="70" x2="820" y2="70" stroke="#1e293b" stroke-width="1"/>
  <line x1="40" y1="70" x2="280" y2="70" stroke="url(#accentCyan)" stroke-width="1" stroke-opacity="0.4"/>

  <!-- === STAT CARDS === -->

  <!-- CARD 1: Current Streak -->
  <g transform="translate(40, 88)" filter="url(#cardGlow)">
    <rect width="245" height="130" rx="14" fill="url(#card1)" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.35"/>
    <!-- Top micro accent bar -->
    <rect x="0" y="0" width="80" height="2" rx="1" fill="url(#accentCyan)"/>

    <!-- Label -->
    <text x="60" y="32" font-family="'Courier New', monospace" font-size="9" letter-spacing="2" fill="#64748b">CURRENT STREAK</text>

    <!-- Value -->
    <text x="60" y="68" font-family="'Courier New', monospace" font-size="40" font-weight="700" fill="#e2e8f0" filter="url(#glowCyan)">
      ${current}
    </text>

    <!-- Unit -->
    <text x="60" y="88" font-family="'Courier New', monospace" font-size="10" letter-spacing="1" fill="#06b6d4">days</text>

    <!-- Animated pulse ring if current > 0 -->
    ${current > 0 ? `
    <circle cx="20" cy="112" r="4" fill="#06b6d4" fill-opacity="0.9">
      <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="fill-opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="34" y="116" font-family="'Courier New', monospace" font-size="9" fill="#06b6d4" fill-opacity="0.7">ACTIVE NOW</text>
    ` : `<text x="20" y="116" font-family="'Courier New', monospace" font-size="9" fill="#334155">NO STREAK</text>`}
  </g>

  <!-- CARD 2: Longest Streak -->
  <g transform="translate(307, 88)" filter="url(#cardGlow)">
    <rect width="245" height="130" rx="14" fill="url(#card2)" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.35"/>
    <rect x="0" y="0" width="80" height="2" rx="1" fill="url(#accentAmber)"/>

    <text x="60" y="32" font-family="'Courier New', monospace" font-size="9" letter-spacing="2" fill="#64748b">LONGEST STREAK</text>

    <text x="60" y="68" font-family="'Courier New', monospace" font-size="40" font-weight="700" fill="#e2e8f0" filter="url(#glowAmber)">
      ${longest}
    </text>

    <text x="60" y="88" font-family="'Courier New', monospace" font-size="10" letter-spacing="1" fill="#f59e0b">days all-time</text>

    <!-- Progress bar: current vs longest -->
    <text x="20" y="112" font-family="'Courier New', monospace" font-size="8" fill="#475569">CURRENT vs BEST</text>
    <rect x="20" y="116" width="200" height="4" rx="2" fill="#1e293b"/>
    <rect x="20" y="116" width="${longest > 0 ? Math.round((Math.min(current, longest) / longest) * 200) : 0}" height="4" rx="2" fill="url(#accentAmber)" opacity="0.8"/>
  </g>

  <!-- CARD 3: Total Contributions -->
  <g transform="translate(574, 88)" filter="url(#cardGlow)">
    <rect width="245" height="130" rx="14" fill="url(#card3)" stroke="#34d399" stroke-width="1" stroke-opacity="0.35"/>
    <rect x="0" y="0" width="80" height="2" rx="1" fill="url(#accentGreen)"/>

    <text x="20" y="44" font-family="monospace" font-size="28">⚡</text>

    <text x="60" y="32" font-family="'Courier New', monospace" font-size="9" letter-spacing="2" fill="#64748b">TOTAL COMMITS</text>

    <text x="60" y="68" font-family="'Courier New', monospace" font-size="${totalFormatted.length > 5 ? '32' : '40'}" font-weight="700" fill="#e2e8f0">
      ${totalFormatted}
    </text>

    <text x="60" y="88" font-family="'Courier New', monospace" font-size="10" letter-spacing="1" fill="#34d399">contributions</text>

    <!-- Consistency stat -->
    <text x="20" y="112" font-family="'Courier New', monospace" font-size="8" fill="#475569">${consistency}% CONSISTENCY · ${avgPerActiveDay}/ACTIVE DAY</text>
    <rect x="20" y="116" width="200" height="4" rx="2" fill="#1e293b"/>
    <rect x="20" y="116" width="${Math.round(parseFloat(consistency) * 2)}" height="4" rx="2" fill="url(#accentGreen)" opacity="0.8"/>
  </g>

  <!-- === MINI BAR CHART === -->
  <g transform="translate(40, 244)">
    <!-- Section label -->
    <text x="0" y="0" font-family="'Courier New', monospace" font-size="9" letter-spacing="2" fill="#334155">LAST 26 WEEKS  ·  WEEKLY ACTIVITY</text>

    <!-- Chart area -->
    <g transform="translate(${chartOffsetX - 40}, 12)">
      ${bars}
    </g>

    <!-- Horizontal baseline -->
    <line x1="0" y1="${chartH + 14}" x2="780" y2="${chartH + 14}" stroke="#1e293b" stroke-width="1"/>
  </g>

  <!-- === FOOTER METRICS ROW === -->
  <g transform="translate(40, 336)">
    <!-- Divider -->
    <line x1="0" y1="0" x2="780" y2="0" stroke="#1e293b" stroke-width="1"/>

    <!-- Metric pills -->
    <!-- Active Days -->
    <g transform="translate(0, 14)">
      <rect x="0" y="0" width="140" height="24" rx="12" fill="#0f172a" stroke="#1e3a5f" stroke-width="1"/>
      <text x="12" y="16" font-family="'Courier New', monospace" font-size="9" fill="#475569">ACTIVE DAYS</text>
      <text x="128" y="16" text-anchor="end" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="#22d3ee">${activeDays}</text>
    </g>

    <g transform="translate(154, 14)">
      <rect x="0" y="0" width="140" height="24" rx="12" fill="#0f172a" stroke="#1e3a5f" stroke-width="1"/>
      <text x="12" y="16" font-family="'Courier New', monospace" font-size="9" fill="#475569">TOTAL DAYS</text>
      <text x="128" y="16" text-anchor="end" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="#94a3b8">${totalDays}</text>
    </g>

    <g transform="translate(308, 14)">
      <rect x="0" y="0" width="140" height="24" rx="12" fill="#0f172a" stroke="#1e3a5f" stroke-width="1"/>
      <text x="12" y="16" font-family="'Courier New', monospace" font-size="9" fill="#475569">CONSISTENCY</text>
      <text x="128" y="16" text-anchor="end" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="#34d399">${consistency}%</text>
    </g>

    <g transform="translate(462, 14)">
      <rect x="0" y="0" width="140" height="24" rx="12" fill="#0f172a" stroke="#1e3a5f" stroke-width="1"/>
      <text x="12" y="16" font-family="'Courier New', monospace" font-size="9" fill="#475569">AVG / ACTIVE</text>
      <text x="128" y="16" text-anchor="end" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="#fbbf24">${avgPerActiveDay}</text>
    </g>

    <g transform="translate(616, 14)">
      <rect x="0" y="0" width="164" height="24" rx="12" fill="#0f172a" stroke="#1e3a5f" stroke-width="1"/>
      <text x="12" y="16" font-family="'Courier New', monospace" font-size="9" fill="#475569">YEARS OF DATA</text>
      <text x="152" y="16" text-anchor="end" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="#a78bfa">${yearsOfData} yrs</text>
    </g>
  </g>

  <!-- === FOOTER === -->
  <g transform="translate(40, 392)">
    <text font-family="'Courier New', monospace" font-size="9" fill="#1e3a5f" letter-spacing="1">
      github.com/${username}
    </text>
    <text x="780" text-anchor="end" font-family="'Courier New', monospace" font-size="9" fill="#1e3a5f" letter-spacing="1">
      UPDATED DAILY  ·  ALL-TIME STATS
    </text>
  </g>

  <!-- Bottom accent line -->
  <rect x="0" y="418" width="860" height="2" rx="1" fill="url(#accentPurple)" opacity="0.5"/>

  <!-- Corner accents -->
  <path d="M 0 20 L 0 0 L 20 0" stroke="#06b6d4" stroke-width="2" fill="none" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M 840 0 L 860 0 L 860 20" stroke="#06b6d4" stroke-width="2" fill="none" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M 0 400 L 0 420 L 20 420" stroke="#7c3aed" stroke-width="2" fill="none" stroke-opacity="0.4" stroke-linecap="round"/>
  <path d="M 840 420 L 860 420 L 860 400" stroke="#7c3aed" stroke-width="2" fill="none" stroke-opacity="0.4" stroke-linecap="round"/>

</svg>`;
}

(async () => {
  try {
    console.log("🚀 Starting GitHub stats generator...\n");

    const data = await getAllContributions();
    const { current, longest } = calculateStreak(data.days);

    const firstDate = data.days[0]?.date ?? "N/A";
    const lastDate = data.days[data.days.length - 1]?.date ?? "N/A";

    let yearsOfData = 0;
    if (data.days.length > 0) {
      const first = new Date(firstDate);
      const last = new Date(lastDate);
      yearsOfData = ((last - first) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
    }

    const activeDays = data.days.filter(d => d.contributionCount > 0).length;
    const totalDays = data.days.length;
    const consistency = totalDays > 0 ? ((activeDays / totalDays) * 100).toFixed(1) : "0.0";
    const avgPerActiveDay = activeDays > 0 ? Math.round(data.total / activeDays) : 0;

    console.log(`\n📊 Final Stats:`);
    console.log(`🔥 Current Streak : ${current} days`);
    console.log(`🏆 Longest Streak : ${longest} days`);
    console.log(`📈 Total          : ${data.total.toLocaleString()} contributions`);
    console.log(`📊 Consistency    : ${consistency}%`);

    const svg = generateSVG({
      username, current, longest,
      total: data.total,
      activeDays, totalDays,
      consistency, avgPerActiveDay,
      firstDate, lastDate, yearsOfData,
      days: data.days
    });

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);

    console.log("\n✅ SVG generated: output/streak.svg");

  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
})();
