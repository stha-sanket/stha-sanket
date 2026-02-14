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
<svg width="500" height="160" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { fill: #58a6ff; font-size: 22px; font-family: Arial; }
    .text { fill: #c9d1d9; font-size: 18px; font-family: Arial; }
  </style>

  <rect width="100%" height="100%" fill="#0d1117" rx="15"/>

  <text x="20" y="40" class="title">GitHub Streak Stats</text>

  <text x="20" y="80" class="text">Total Contributions: ${total}</text>
  <text x="20" y="110" class="text">Current Streak: ${current} days</text>
  <text x="20" y="140" class="text">Longest Streak: ${longest} days</text>
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
