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
      Authorization: \`Bearer \${token}\`,
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

(async () => {
  try {
    const calendar = await getData();

    const total = calendar.totalContributions;
    const days = calendar.weeks.flatMap(w => w.contributionDays);
    const { current, longest } = calculateStreak(days);

    const progress = Math.min((current / (longest || 1)) * 100, 100);
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (progress / 100) * circumference;

    const svg = `
<svg width="720" height="280" viewBox="0 0 720 280" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0c29">
        <animate attributeName="stop-color" values="#0f0c29;#302b63;#24243e;#0f0c29" dur="10s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#302b63">
        <animate attributeName="stop-color" values="#302b63;#0f0c29;#24243e;#302b63" dur="10s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>

    <linearGradient id="neonText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="50%" stop-color="#ff00ff"/>
      <stop offset="100%" stop-color="#00f5ff">
        <animate attributeName="offset" values="0;1;0" dur="6s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" rx="30" fill="url(#bg)" />

  <text x="50%" y="50"
        text-anchor="middle"
        font-size="26"
        font-family="Verdana"
        fill="url(#neonText)"
        filter="url(#glow)">
        ⚡ ${username.toUpperCase()} STREAK DASHBOARD ⚡
  </text>

  <circle cx="180" cy="150" r="60"
          stroke="#ffffff20"
          stroke-width="12"
          fill="none"/>

  <circle cx="180" cy="150" r="60"
          stroke="url(#neonText)"
          stroke-width="12"
          fill="none"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}">
      <animate attributeName="stroke-dashoffset"
               from="${circumference}"
               to="${offset}"
               dur="2s"
               fill="freeze"/>
  </circle>

  <text x="180" y="155"
        text-anchor="middle"
        font-size="28"
        font-weight="bold"
        font-family="Verdana"
        fill="#ffffff"
        filter="url(#glow)">
        ${current}🔥
  </text>

  <text x="180" y="185"
        text-anchor="middle"
        font-size="14"
        font-family="Verdana"
        fill="#cccccc">
        Current Streak
  </text>

  <text x="380" y="120"
        font-size="22"
        font-family="Verdana"
        fill="#00f5ff"
        filter="url(#glow)">
        Total Contributions
  </text>

  <text x="380" y="150"
        font-size="28"
        font-weight="bold"
        font-family="Verdana"
        fill="#ffffff">
        ${total}
  </text>

  <text x="380" y="190"
        font-size="20"
        font-family="Verdana"
        fill="#ff00ff"
        filter="url(#glow)">
        Longest Streak: ${longest} days
  </text>

</svg>
`;

    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);

    console.log("Nuclear streak SVG generated successfully 🚀");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
