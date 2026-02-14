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
  const last52Days = days.slice(-364); // Last year of contributions
  const weeks = [];
  
  for (let i = 0; i < last52Days.length; i += 7) {
    weeks.push(last52Days.slice(i, i + 7));
  }

  const maxContributions = Math.max(...last52Days.map(d => d.contributionCount));
  
  return weeks.map((week, weekIndex) => {
    return week.map((day, dayIndex) => {
      if (!day) return '';
      
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
      
      const x = 40 + (weekIndex * 16);
      const y = 170 + (dayIndex * 16);
      
      return `
        <rect 
          x="${x}" y="${y}" 
          width="14" height="14" 
          rx="3" ry="3"
          fill="${color}"
          opacity="0.8"
          filter="url(#glowSmall)"
        >
          <title>${day.date}: ${day.contributionCount} contributions</title>
        </rect>
      `;
    }).join('');
  }).join('');
}

(async () => {
  try {
    const calendar = await getData();

    const total = calendar.totalContributions;
    const days = calendar.weeks.flatMap(w => w.contributionDays);
    const { current, longest } = calculateStreak(days);
    const contributionGraph = generateContributionGraph(days);

    const progress = Math.min((current / (longest || 1)) * 100, 100);
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (progress / 100) * circumference;

    const svg = `
<svg width="720" height="360" viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- Animated gradient background -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1929">
        <animate attributeName="stop-color" values="#0a1929;#1a2f4f;#0f2027;#0a1929" dur="12s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#1a2f4f">
        <animate attributeName="stop-color" values="#1a2f4f;#0f2027;#0a1929;#1a2f4f" dur="12s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>

    <!-- Neon text gradient -->
    <linearGradient id="neonText" x1="0%" y1="0%" x2="200%" y2="0%">
      <stop offset="0%" stop-color="#00ffff">
        <animate attributeName="stop-color" values="#00ffff;#ff00ff;#00ffff" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#ff00ff">
        <animate attributeName="stop-color" values="#ff00ff;#00ffff;#ff00ff" dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#00ffff">
        <animate attributeName="stop-color" values="#00ffff;#ff00ff;#00ffff" dur="4s" repeatCount="indefinite"/>
      </stop>
      <animateTransform attributeName="gradientTransform" type="translate" from="-1" to="1" dur="3s" repeatCount="indefinite"/>
    </linearGradient>

    <!-- Glow filters -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="glowSmall">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Pulse animation for streak counter -->
    <filter id="pulse">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Animated radial gradient for circle -->
    <radialGradient id="circleGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ffff" stop-opacity="0.8">
        <animate attributeName="stop-color" values="#00ffff;#ff00ff;#00ffff" dur="3s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#ff00ff" stop-opacity="0.2"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" rx="25" fill="url(#bg)" />

  <!-- Animated particles -->
  <circle cx="100" cy="80" r="2" fill="#00ffff" opacity="0.3">
    <animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="600" cy="300" r="3" fill="#ff00ff" opacity="0.3">
    <animate attributeName="r" values="3;6;3" dur="4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="500" cy="50" r="2" fill="#00ffff" opacity="0.3">
    <animate attributeName="r" values="2;5;2" dur="5s" repeatCount="indefinite"/>
  </circle>

  <!-- Header -->
  <text x="50%" y="35"
        text-anchor="middle"
        font-size="24"
        font-family="'Segoe UI', 'Verdana', sans-serif"
        font-weight="bold"
        fill="url(#neonText)"
        filter="url(#glow)">
        ⚡ ${username.toUpperCase()} · STREAK DASHBOARD ⚡
  </text>

  <!-- Main stats container -->
  <g transform="translate(20, 50)">
    <!-- Streak Circle -->
    <g transform="translate(130, 80)">
      <!-- Background circle -->
      <circle cx="0" cy="0" r="60"
              stroke="#ffffff20"
              stroke-width="10"
              fill="none"/>
      
      <!-- Progress circle -->
      <circle cx="0" cy="0" r="60"
              stroke="url(#neonText)"
              stroke-width="10"
              fill="none"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}">
          <animate attributeName="stroke-dashoffset"
                   from="${circumference}"
                   to="${offset}"
                   dur="1.5s"
                   fill="freeze"
                   calcMode="spline"
                   keySplines="0.4 0 0.2 1"/>
      </circle>
      
      <!-- Glow effect -->
      <circle cx="0" cy="0" r="65"
              stroke="url(#circleGlow)"
              stroke-width="2"
              fill="none"
              opacity="0.5">
        <animate attributeName="r" values="65;70;65" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      <!-- Streak number -->
      <text x="0" y="5"
            text-anchor="middle"
            font-size="36"
            font-weight="bold"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#ffffff"
            filter="url(#pulse)">
            ${current}
      </text>
      
      <text x="0" y="30"
            text-anchor="middle"
            font-size="14"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#cccccc"
            filter="url(#glowSmall)">
            CURRENT STREAK
      </text>
    </g>

    <!-- Stats -->
    <g transform="translate(320, 65)">
      <text x="0" y="0"
            font-size="16"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#00ffff"
            filter="url(#glowSmall)">
            TOTAL CONTRIBUTIONS
      </text>
      
      <text x="0" y="25"
            font-size="32"
            font-weight="bold"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#ffffff">
            ${total.toLocaleString()}
      </text>
      
      <text x="0" y="60"
            font-size="16"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#ff00ff"
            filter="url(#glowSmall)">
            LONGEST STREAK
      </text>
      
      <text x="0" y="85"
            font-size="28"
            font-weight="bold"
            font-family="'Segoe UI', 'Verdana', sans-serif"
            fill="#ffffff">
            ${longest} days
      </text>
    </g>
  </g>

  <!-- Contribution Graph -->
  <text x="40" y="155"
        font-size="12"
        font-family="'Segoe UI', 'Verdana', sans-serif"
        fill="#00ffff"
        opacity="0.8"
        filter="url(#glowSmall)">
        CONTRIBUTION ACTIVITY (LAST YEAR)
  </text>
  
  <g transform="translate(0, 0)">
    ${contributionGraph}
  </g>

  <!-- Day labels -->
  <g transform="translate(20, 170)">
    <text x="0" y="0" fill="#ffffff40" font-size="10">Mon</text>
    <text x="0" y="48" fill="#ffffff40" font-size="10">Wed</text>
    <text x="0" y="96" fill="#ffffff40" font-size="10">Fri</text>
  </g>

  <!-- Footer -->
  <text x="50%" y="340"
        text-anchor="middle"
        font-size="12"
        font-family="'Segoe UI', 'Verdana', sans-serif"
        fill="#ffffff60"
        filter="url(#glowSmall)">
        ✦  code every day · build the future  ✦
  </text>

  <!-- Decorative elements -->
  <path d="M 100 310 L 620 310" stroke="#ffffff20" stroke-width="1" stroke-dasharray="5,5"/>
  
</svg>
`;

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);
    console.log(`📊 Stats - Current: ${current} | Longest: ${longest} | Total: ${total}`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
