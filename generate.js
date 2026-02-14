const fs = require("fs");

const username = "stha-sanket";
const token = process.env.GITHUB_TOKEN;

async function getData() {
  if (!token) {
    throw new Error("GITHUB_TOKEN is not defined");
  }

  const query = `
  {
    user(login: "${username}") {
      contributionsCollection {
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

  if (!json.data) {
    console.error(json);
    throw new Error("Failed to fetch contribution data");
  }

  return json.data.user.contributionsCollection.contributionCalendar;
}

function calculateStreak(days) {
  days.sort((a, b) => new Date(a.date) - new Date(b.date));

  let longest = 0;
  let temp = 0;

  for (let day of days) {
    if (day.contributionCount > 0) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}

function generateContributionGraph(days) {
  const last52Weeks = [];
  const weeks = [];
  
  // Group days into weeks
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  // Take last 26 weeks (6 months) for better spacing
  const recentWeeks = weeks.slice(-26);
  
  const maxContributions = Math.max(...days.map(d => d.contributionCount));
  
  let graphHtml = '';
  recentWeeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day) return;
      
      const intensity = maxContributions > 0 ? day.contributionCount / maxContributions : 0;
      let color;
      
      if (day.contributionCount === 0) {
        color = "#2d2d2d";
      } else if (intensity < 0.25) {
        color = "#0e4429";
      } else if (intensity < 0.5) {
        color = "#006d32";
      } else if (intensity < 0.75) {
        color = "#26a641";
      } else {
        color = "#39d353";
      }
      
      const x = 50 + (weekIndex * 18);
      const y = 200 + (dayIndex * 18);
      
      graphHtml += `
        <rect 
          x="${x}" y="${y}" 
          width="14" height="14" 
          rx="4" ry="4"
          fill="${color}"
          filter="url(#glowSmall)"
        >
          <title>${day.date}: ${day.contributionCount} contributions</title>
        </rect>
      `;
    });
  });
  
  return graphHtml;
}

(async () => {
  try {
    const calendar = await getData();

    const total = calendar.totalContributions;
    const days = calendar.weeks.flatMap(w => w.contributionDays);
    const { current, longest } = calculateStreak(days);
    const contributionGraph = generateContributionGraph(days);

    const progress = Math.min((current / (longest || 1)) * 100, 100);
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (progress / 100) * circumference;

    const svg = `
<svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- Clean gradient background -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>

    <!-- Accent gradients -->
    <linearGradient id="neonBlue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#58a6ff"/>
      <stop offset="100%" stop-color="#79c0ff"/>
    </linearGradient>
    
    <linearGradient id="neonPink" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f778ba"/>
      <stop offset="100%" stop-color="#ff9bce"/>
    </linearGradient>

    <linearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3fb950"/>
      <stop offset="100%" stop-color="#56d364"/>
    </linearGradient>

    <!-- Subtle glow filter -->
    <filter id="glowSmall">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="glowMedium">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background with subtle border -->
  <rect width="100%" height="100%" rx="25" fill="url(#bg)" />
  <rect width="100%" height="100%" rx="25" fill="none" stroke="#30363d" stroke-width="1"/>

  <!-- Header Section with proper spacing -->
  <g transform="translate(50, 35)">
    <text font-size="28" font-family="'Segoe UI', 'Verdana', sans-serif" font-weight="600" fill="#f0f6fc">
      ${username}
    </text>
    <text x="2" y="30" font-size="16" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">
      GitHub Streak Dashboard
    </text>
  </g>

  <!-- Main Stats Section - Properly spaced -->
  <g transform="translate(50, 120)">
    <!-- Current Streak Card -->
    <rect x="0" y="0" width="200" height="120" rx="12" fill="#21262d" fill-opacity="0.5" stroke="#30363d" stroke-width="1"/>
    <text x="100" y="25" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">CURRENT STREAK</text>
    <text x="100" y="65" text-anchor="middle" font-size="42" font-weight="600" font-family="'Segoe UI', 'Verdana', sans-serif" fill="url(#neonGreen)" filter="url(#glowMedium)">${current}</text>
    <text x="100" y="95" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">days</text>

    <!-- Longest Streak Card -->
    <g transform="translate(230, 0)">
      <rect x="0" y="0" width="200" height="120" rx="12" fill="#21262d" fill-opacity="0.5" stroke="#30363d" stroke-width="1"/>
      <text x="100" y="25" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">LONGEST STREAK</text>
      <text x="100" y="65" text-anchor="middle" font-size="42" font-weight="600" font-family="'Segoe UI', 'Verdana', sans-serif" fill="url(#neonPink)" filter="url(#glowMedium)">${longest}</text>
      <text x="100" y="95" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">days</text>
    </g>

    <!-- Total Contributions Card -->
    <g transform="translate(460, 0)">
      <rect x="0" y="0" width="200" height="120" rx="12" fill="#21262d" fill-opacity="0.5" stroke="#30363d" stroke-width="1"/>
      <text x="100" y="25" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">TOTAL CONTRIBUTIONS</text>
      <text x="100" y="65" text-anchor="middle" font-size="42" font-weight="600" font-family="'Segoe UI', 'Verdana', sans-serif" fill="url(#neonBlue)" filter="url(#glowMedium)">${total}</text>
      <text x="100" y="95" text-anchor="middle" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">all time</text>
    </g>
  </g>

  <!-- Progress Circle Section - With proper spacing -->
  <g transform="translate(50, 280)">
    <text font-size="16" font-family="'Segoe UI', 'Verdana', sans-serif" font-weight="500" fill="#f0f6fc">Streak Progress</text>
    <text y="25" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">${Math.round(progress)}% of longest streak</text>
    
    <!-- Progress bar background -->
    <rect x="0" y="55" width="700" height="8" rx="4" fill="#30363d"/>
    
    <!-- Progress bar fill -->
    <rect x="0" y="55" width="${Math.min(700, (progress/100) * 700)}" height="8" rx="4" fill="url(#neonGreen)">
      <animate attributeName="width" from="0" to="${Math.min(700, (progress/100) * 700)}" dur="1.5s" fill="freeze"/>
    </rect>
  </g>

  <!-- Contribution Graph Section - Properly spaced and readable -->
  <g transform="translate(50, 370)">
    <text font-size="16" font-family="'Segoe UI', 'Verdana', sans-serif" font-weight="500" fill="#f0f6fc">Recent Activity</text>
    <text y="25" font-size="14" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">Last 6 months · Each box = 1 day</text>
    
    <!-- Contribution grid with proper spacing -->
    <g transform="translate(0, 45)">
      <!-- Day labels -->
      <g transform="translate(-20, 0)">
        <text y="12" font-size="10" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">Mon</text>
        <text y="30" font-size="10" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">Wed</text>
        <text y="48" font-size="10" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">Fri</text>
      </g>
      
      <!-- Contribution boxes -->
      <g>
        ${contributionGraph}
      </g>
      
      <!-- Legend -->
      <g transform="translate(500, 0)">
        <text x="0" y="10" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">Less</text>
        <rect x="35" y="0" width="14" height="14" rx="4" fill="#2d2d2d"/>
        <rect x="55" y="0" width="14" height="14" rx="4" fill="#0e4429"/>
        <rect x="75" y="0" width="14" height="14" rx="4" fill="#006d32"/>
        <rect x="95" y="0" width="14" height="14" rx="4" fill="#26a641"/>
        <rect x="115" y="0" width="14" height="14" rx="4" fill="#39d353"/>
        <text x="135" y="10" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">More</text>
      </g>
    </g>
  </g>

  <!-- Footer with subtle styling -->
  <text x="50" y="435" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e">
    Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
  </text>
  
  <text x="730" y="435" font-size="12" font-family="'Segoe UI', 'Verdana', sans-serif" fill="#8b949e" text-anchor="end">
    github.com/${username}
  </text>

</svg>
`;

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);
    console.log("📊 Stats - Current:", current, "| Longest:", longest, "| Total:", total);
    console.log("📁 Saved to: output/streak.svg");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
