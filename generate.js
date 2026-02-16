const fs = require("fs");

const username = "stha-sanket";
const token = process.env.GITHUB_TOKEN;

async function getAllContributions() {
  if (!token) {
    throw new Error("GITHUB_TOKEN is not defined");
  }

  const currentYear = new Date().getFullYear();
  const startYear = 2015;
  
  let allDays = [];
  let totalContributions = 0;

  console.log(`Fetching contributions year by year for ${username}...`);

  // Fetch data year by year
  for (let year = currentYear; year >= startYear; year--) {
    try {
      const fromDate = `${year}-01-01T00:00:00Z`;
      const toDate = year === currentYear 
        ? new Date().toISOString() 
        : `${year}-12-31T23:59:59Z`;

      console.log(`  📅 Fetching ${year}...`);

      const query = `
      {
        user(login: "${username}") {
          contributionsCollection(from: "${fromDate}", to: "${toDate}") {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
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

      if (json.data && json.data.user) {
        const calendar = json.data.user.contributionsCollection.contributionCalendar;
        const yearTotal = calendar.totalContributions || 0;
        totalContributions += yearTotal;
        
        const days = calendar.weeks?.flatMap(w => w.contributionDays) || [];
        allDays = [...allDays, ...days];
        
        console.log(`     ✓ ${yearTotal} contributions in ${year}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`     ⚠ Error fetching ${year}, skipping...`);
    }
  }

  // Remove duplicates and sort
  const uniqueDays = Array.from(
    new Map(allDays.map(day => [day.date, day])).values()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\n✅ Total across all years: ${totalContributions} contributions`);
  console.log(`📊 Days with data: ${uniqueDays.length}`);

  return {
    total: totalContributions,
    days: uniqueDays
  };
}

function calculateStreak(days) {
  if (!days || days.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let temp = 0;
  let current = 0;

  // Calculate longest streak
  for (let day of days) {
    if (day.contributionCount > 0) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 0;
    }
  }

  // Calculate current streak (from most recent day backwards)
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}

(async () => {
  try {
    console.log("🚀 Starting GitHub stats generator...\n");
    
    const data = await getAllContributions();
    const { current, longest } = calculateStreak(data.days);

    // Calculate statistics with safe defaults
    const firstDate = data.days.length > 0 ? data.days[0].date : 'N/A';
    const lastDate = data.days.length > 0 ? data.days[data.days.length - 1].date : 'N/A';
    
    let yearsOfData = 0;
    if (data.days.length > 0) {
      const first = new Date(firstDate);
      const last = new Date(lastDate);
      yearsOfData = ((last - first) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
    }

    const activeDays = data.days.filter(d => d.contributionCount > 0).length;
    const totalDays = data.days.length;
    const consistency = totalDays > 0 ? ((activeDays / totalDays) * 100).toFixed(1) : 0;
    const avgPerActiveDay = activeDays > 0 ? Math.round(data.total / activeDays) : 0;

    console.log(`\n📊 Final Stats for ${username}:`);
    console.log(`📅 Period: ${firstDate} to ${lastDate} (${yearsOfData} years)`);
    console.log(`🔥 Current Streak: ${current} days`);
    console.log(`🏆 Longest Streak: ${longest} days`);
    console.log(`📈 Total Contributions: ${data.total.toLocaleString()}`);
    console.log(`📊 Active Days: ${activeDays} out of ${totalDays} (${consistency}%)`);

    const svg = `
<svg width="900" height="400" viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- Animated gradient background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c10">
        <animate attributeName="stop-color" values="#0a0c10;#1a1f2b;#0f1219;#0a0c10" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#1a1f2b">
        <animate attributeName="stop-color" values="#1a1f2b;#0f1219;#0a0c10;#1a1f2b" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#0f1219">
        <animate attributeName="stop-color" values="#0f1219;#0a0c10;#1a1f2b;#0f1219" dur="10s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>

    <!-- Animated gradient for text -->
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="200%" y2="0%">
      <stop offset="0%" stop-color="#ff6b6b">
        <animate attributeName="stop-color" values="#ff6b6b;#4ecdc4;#ffd93d;#ff6b6b" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="33%" stop-color="#4ecdc4">
        <animate attributeName="stop-color" values="#4ecdc4;#ffd93d;#ff6b6b;#4ecdc4" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="66%" stop-color="#ffd93d">
        <animate attributeName="stop-color" values="#ffd93d;#ff6b6b;#4ecdc4;#ffd93d" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff6b6b">
        <animate attributeName="stop-color" values="#ff6b6b;#4ecdc4;#ffd93d;#ff6b6b" dur="5s" repeatCount="indefinite"/>
      </stop>
      <animateTransform attributeName="gradientTransform" type="translate" from="-1" to="1" dur="4s" repeatCount="indefinite"/>
    </linearGradient>

    <!-- Card gradients -->
    <linearGradient id="cardCurrent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff8c8c" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ff6b6b" stop-opacity="0.1"/>
    </linearGradient>
    
    <linearGradient id="cardLongest" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c5ce7" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#a463f5" stop-opacity="0.1"/>
    </linearGradient>
    
    <linearGradient id="cardTotal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00b894" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#00cec9" stop-opacity="0.1"/>
    </linearGradient>

    <!-- Glow filters -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="glowSmall" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" rx="30" fill="url(#bgGradient)" />

  <!-- Header -->
  <g transform="translate(450, 40)">
    <text text-anchor="middle" font-size="32" font-family="'Segoe UI', 'Verdana', sans-serif" font-weight="700" fill="url(#textGradient)" filter="url(#glow)">
      ${username.toUpperCase()}
    </text>
    <text x="0" y="30" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#a0a0a0">
      GITHUB STREAK · ALL TIME
    </text>
    <text x="0" y="50" text-anchor="middle" font-size="11" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#606060">
      ${firstDate} — ${lastDate} · ${yearsOfData} years
    </text>
  </g>

  <!-- Stats Cards -->
  <g transform="translate(150, 120)">
    
    <!-- Current Streak -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="180" height="180" rx="20" fill="url(#cardCurrent)" stroke="#ff6b6b" stroke-width="2"/>
      <circle cx="90" cy="55" r="25" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-dasharray="4,4">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="15s" repeatCount="indefinite" origin="90 55"/>
      </circle>
      <text x="90" y="65" text-anchor="middle" font-size="20" fill="#ff6b6b" filter="url(#glowSmall)">🔥</text>
      <text x="90" y="105" text-anchor="middle" font-size="12" fill="#b0b0b0">CURRENT</text>
      <text x="90" y="140" text-anchor="middle" font-size="42" font-weight="bold" fill="#ffffff">${current}</text>
      <text x="90" y="165" text-anchor="middle" font-size="12" fill="#ff6b6b">days</text>
    </g>

    <!-- Longest Streak -->
    <g transform="translate(220, 0)">
      <rect x="0" y="0" width="180" height="180" rx="20" fill="url(#cardLongest)" stroke="#6c5ce7" stroke-width="2"/>
      <circle cx="90" cy="55" r="25" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-dasharray="4,4">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="15s" repeatCount="indefinite" origin="90 55"/>
      </circle>
      <text x="90" y="65" text-anchor="middle" font-size="20" fill="#6c5ce7" filter="url(#glowSmall)">🏆</text>
      <text x="90" y="105" text-anchor="middle" font-size="12" fill="#b0b0b0">LONGEST</text>
      <text x="90" y="140" text-anchor="middle" font-size="42" font-weight="bold" fill="#ffffff">${longest}</text>
      <text x="90" y="165" text-anchor="middle" font-size="12" fill="#6c5ce7">days</text>
    </g>

    <!-- Total Contributions -->
    <g transform="translate(440, 0)">
      <rect x="0" y="0" width="180" height="180" rx="20" fill="url(#cardTotal)" stroke="#00b894" stroke-width="2"/>
      <circle cx="90" cy="55" r="25" fill="none" stroke="#00b894" stroke-width="2" stroke-dasharray="4,4">
        <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="15s" repeatCount="indefinite" origin="90 55"/>
      </circle>
      <text x="90" y="65" text-anchor="middle" font-size="20" fill="#00b894" filter="url(#glowSmall)">📊</text>
      <text x="90" y="105" text-anchor="middle" font-size="12" fill="#b0b0b0">TOTAL</text>
      <text x="90" y="140" text-anchor="middle" font-size="42" font-weight="bold" fill="#ffffff">${data.total}</text>
      <text x="90" y="165" text-anchor="middle" font-size="12" fill="#00b894">contributions</text>
    </g>
  </g>

  <!-- Footer Stats -->
  <g transform="translate(450, 340)">
    <text text-anchor="middle" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#808080">
      ⚡ ${activeDays} active days · ${consistency}% consistency · ✦ ${avgPerActiveDay} per active day
    </text>
  </g>

  <!-- Footer -->
  <g transform="translate(450, 380)">
    <line x1="-300" y1="0" x2="300" y2="0" stroke="url(#textGradient)" stroke-width="2" stroke-dasharray="4,4">
      <animate attributeName="stroke-dashoffset" values="20;0;20" dur="3s" repeatCount="indefinite"/>
    </line>
    <text x="0" y="18" text-anchor="middle" font-size="10" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#505050">
      github.com/${username} · updated daily
    </text>
  </g>

</svg>
`;

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);

    console.log("\n✅ All-time GitHub stats SVG generated successfully!");
    console.log(`📁 Saved to: output/streak.svg`);
    
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
})();
