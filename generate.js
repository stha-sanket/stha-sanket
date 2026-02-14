const fs = require("fs");

const username = "stha-sanket";
const token = process.env.GITHUB_TOKEN;

async function getAllContributions() {
  if (!token) {
    throw new Error("GITHUB_TOKEN is not defined");
  }

  const currentYear = new Date().getFullYear();
  const startYear = 2015; // Start from when GitHub started (or user joined)
  
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
        totalContributions += calendar.totalContributions;
        const days = calendar.weeks.flatMap(w => w.contributionDays);
        allDays = [...allDays, ...days];
        console.log(`     ✓ ${calendar.totalContributions} contributions in ${year}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`     ⚠ Error fetching ${year}, skipping...`);
    }
  }

  // Remove duplicates (just in case)
  const uniqueDays = Array.from(
    new Map(allDays.map(day => [day.date, day])).values()
  );

  console.log(`\n✅ Total across all years: ${totalContributions} contributions`);
  console.log(`📊 Days with data: ${uniqueDays.length}`);

  return {
    totalContributions,
    days: uniqueDays.sort((a, b) => new Date(a.date) - new Date(b.date))
  };
}

function calculateStreak(days) {
  if (days.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort days chronologically
  days.sort((a, b) => new Date(a.date) - new Date(b.date));

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
    
    const { total, days } = await getAllContributions();
    const { current, longest } = calculateStreak(days);

    // Calculate statistics
    const firstDate = days.length > 0 ? days[0].date : 'N/A';
    const lastDate = days.length > 0 ? days[days.length - 1].date : 'N/A';
    
    let yearsOfData = 0;
    if (days.length > 0) {
      const first = new Date(firstDate);
      const last = new Date(lastDate);
      yearsOfData = ((last - first) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
    }

    const activeDays = days.filter(d => d.contributionCount > 0).length;
    const consistency = days.length > 0 ? ((activeDays / days.length) * 100).toFixed(1) : 0;

    console.log(`\n📊 Final Stats for ${username}:`);
    console.log(`📅 Period: ${firstDate} to ${lastDate} (${yearsOfData} years)`);
    console.log(`🔥 Current Streak: ${current} days`);
    console.log(`🏆 Longest Streak: ${longest} days`);
    console.log(`📈 Total Contributions: ${total.toLocaleString()}`);
    console.log(`📊 Active Days: ${activeDays} out of ${days.length} (${consistency}%)`);

    const svg = `
<svg width="950" height="450" viewBox="0 0 950 450" xmlns="http://www.w3.org/2000/svg">

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

    <!-- Floating particles -->
    <circle id="particle1" cx="0" cy="0" r="3" fill="#ff6b6b" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle id="particle2" cx="0" cy="0" r="4" fill="#4ecdc4" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite"/>
    </circle>
    <circle id="particle3" cx="0" cy="0" r="2" fill="#ffd93d" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.4;0.2" dur="5s" repeatCount="indefinite"/>
    </circle>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" rx="30" fill="url(#bgGradient)" />
  
  <!-- Animated particles -->
  <use href="#particle1" x="100" y="80">
    <animate attributeName="x" values="100;120;80;100" dur="8s" repeatCount="indefinite"/>
    <animate attributeName="y" values="80;100;60;80" dur="8s" repeatCount="indefinite"/>
  </use>
  <use href="#particle2" x="800" y="350">
    <animate attributeName="x" values="800;830;770;800" dur="10s" repeatCount="indefinite"/>
    <animate attributeName="y" values="350;370;330;350" dur="10s" repeatCount="indefinite"/>
  </use>
  <use href="#particle3" x="500" y="150">
    <animate attributeName="x" values="500;520;480;500" dur="7s" repeatCount="indefinite"/>
    <animate attributeName="y" values="150;170;130;150" dur="7s" repeatCount="indefinite"/>
  </use>

  <!-- Header -->
  <g transform="translate(475, 45)">
    <text text-anchor="middle" font-size="34" font-family="'Segoe UI', 'Poppins', 'Verdana', sans-serif" font-weight="700" fill="url(#textGradient)" filter="url(#glow)">
      ${username.toUpperCase()}
    </text>
    <text x="0" y="35" text-anchor="middle" font-size="16" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#a0a0a0" letter-spacing="3">
      ALL-TIME GITHUB JOURNEY
    </text>
    <text x="0" y="55" text-anchor="middle" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#808080">
      ${firstDate} — ${lastDate} · ${yearsOfData} years of coding
    </text>
  </g>

  <!-- Stats Cards -->
  <g transform="translate(125, 135)">
    
    <!-- Current Streak Card -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="200" height="200" rx="25" fill="url(#cardCurrent)" stroke="#ff6b6b" stroke-width="2" stroke-opacity="0.5">
        <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
      </rect>
      
      <g transform="translate(100, 60)">
        <circle cx="0" cy="0" r="30" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-dasharray="5,5">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite"/>
        </circle>
        <text x="0" y="10" text-anchor="middle" font-size="24" fill="#ff6b6b" filter="url(#glowSmall)">🔥</text>
      </g>
      
      <text x="100" y="120" text-anchor="middle" font-size="14" fill="#b0b0b0">CURRENT STREAK</text>
      <text x="100" y="165" text-anchor="middle" font-size="48" font-weight="bold" fill="#ffffff">
        <animate attributeName="y" values="180;165;165" dur="0.5s" fill="freeze"/>
        ${current}
      </text>
      <text x="100" y="190" text-anchor="middle" font-size="14" fill="#ff6b6b" filter="url(#glowSmall)">days</text>
    </g>

    <!-- Longest Streak Card -->
    <g transform="translate(260, 0)">
      <rect x="0" y="0" width="200" height="200" rx="25" fill="url(#cardLongest)" stroke="#6c5ce7" stroke-width="2" stroke-opacity="0.5">
        <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="0.5s"/>
      </rect>
      
      <g transform="translate(100, 60)">
        <circle cx="0" cy="0" r="30" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-dasharray="5,5">
          <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="20s" repeatCount="indefinite"/>
        </circle>
        <text x="0" y="10" text-anchor="middle" font-size="24" fill="#6c5ce7" filter="url(#glowSmall)">🏆</text>
      </g>
      
      <text x="100" y="120" text-anchor="middle" font-size="14" fill="#b0b0b0">LONGEST STREAK</text>
      <text x="100" y="165" text-anchor="middle" font-size="48" font-weight="bold" fill="#ffffff">
        <animate attributeName="y" values="180;165;165" dur="0.5s" fill="freeze" begin="0.2s"/>
        ${longest}
      </text>
      <text x="100" y="190" text-anchor="middle" font-size="14" fill="#6c5ce7" filter="url(#glowSmall)">days</text>
    </g>

    <!-- Total Contributions Card -->
    <g transform="translate(520, 0)">
      <rect x="0" y="0" width="200" height="200" rx="25" fill="url(#cardTotal)" stroke="#00b894" stroke-width="2" stroke-opacity="0.5">
        <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="1s"/>
      </rect>
      
      <g transform="translate(100, 60)">
        <circle cx="0" cy="0" r="30" fill="none" stroke="#00b894" stroke-width="2" stroke-dasharray="5,5">
          <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="20s" repeatCount="indefinite"/>
        </circle>
        <text x="0" y="10" text-anchor="middle" font-size="24" fill="#00b894" filter="url(#glowSmall)">📊</text>
      </g>
      
      <text x="100" y="120" text-anchor="middle" font-size="14" fill="#b0b0b0">TOTAL CONTRIBUTIONS</text>
      <text x="100" y="165" text-anchor="middle" font-size="48" font-weight="bold" fill="#ffffff">
        <animate attributeName="y" values="180;165;165" dur="0.5s" fill="freeze" begin="0.4s"/>
        ${total.toLocaleString()}
      </text>
      <text x="100" y="190" text-anchor="middle" font-size="14" fill="#00b894" filter="url(#glowSmall)">all-time</text>
    </g>
  </g>

  <!-- Stats Summary -->
  <g transform="translate(475, 370)">
    <text text-anchor="middle" font-size="13" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#808080">
      ⚡ ${activeDays.toLocaleString()} active days · ${consistency}% consistency
    </text>
    <text x="0" y="25" text-anchor="middle" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#606060">
      ✦ average ${Math.round(total/days.length)} contributions per active day ✦
    </text>
  </g>

  <!-- Footer -->
  <g transform="translate(475, 425)">
    <line x1="-350" y1="0" x2="350" y2="0" stroke="url(#textGradient)" stroke-width="2" stroke-dasharray="5,5">
      <animate attributeName="stroke-dashoffset" values="20;0;20" dur="3s" repeatCount="indefinite"/>
    </line>
    <text x="0" y="20" text-anchor="middle" font-size="11" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#606060">
      github.com/${username} · every contribution tells a story
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
