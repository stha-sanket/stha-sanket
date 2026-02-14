const fs = require("fs");

const username = "stha-sanket"; // change if needed
const token = process.env.GITHUB_TOKEN;

async function getData() {
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
  return json.data.user.contributionsCollection.contributionCalendar;
}

function calculateStreak(days) {
  let current = 0;
  let longest = 0;
  let temp = 0;

  // Sort ascending by date
  days.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate longest streak
  for (let day of days) {
    if (day.contributionCount > 0) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 0;
    }
  }

  // Calculate current streak (from today backwards)
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

const svg = `
<svg width="600" height="220" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2027">
        <animate attributeName="stop-color" values="#0f2027;#203a43;#2c5364;#0f2027" dur="8s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#2c5364">
        <animate attributeName="stop-color" values="#2c5364;#0f2027;#203a43;#2c5364" dur="8s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" rx="25" fill="url(#bgGradient)" />

  <text x="50%" y="50" text-anchor="middle"
        font-size="26"
        font-family="Verdana"
        fill="#ffffff"
        opacity="0">
        GitHub Streak
        <animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze"/>
  </text>

  <text x="50%" y="105" text-anchor="middle"
        font-size="40"
        font-weight="bold"
        font-family="Verdana"
        fill="#00f5ff"
        filter="url(#glow)">
        🔥 ${current} Day Streak
        <animate attributeName="opacity" from="0" to="1" dur="1.5s" fill="freeze"/>
  </text>

  <text x="50%" y="145" text-anchor="middle"
        font-size="18"
        font-family="Verdana"
        fill="#ffffff"
        opacity="0">
        Total Contributions: ${total}
        <animate attributeName="opacity" from="0" to="1" dur="2s" fill="freeze"/>
  </text>

  <text x="50%" y="175" text-anchor="middle"
        font-size="18"
        font-family="Verdana"
        fill="#ffffff"
        opacity="0">
        Longest Streak: ${longest} days
        <animate attributeName="opacity" from="0" to="1" dur="2.3s" fill="freeze"/>
  </text>
</svg>
`;


    fs.mkdirSync("output", { recursive: true });
    fs.writeFileSync("output/streak.svg", svg);

    console.log("SVG generated successfully!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
