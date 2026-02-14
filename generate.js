const fs = require("fs");
const fetch = require("node-fetch");

const username = "YOUR_USERNAME";
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

  return res.json();
}

function calculateStreak(days) {
  let current = 0;
  let longest = 0;
  let temp = 0;

  for (let day of days.reverse()) {
    if (day.contributionCount > 0) {
      temp++;
      current = temp;
    } else {
      longest = Math.max(longest, temp);
      temp = 0;
    }
  }

  longest = Math.max(longest, temp);
  return { current, longest };
}

(async () => {
  const data = await getData();
  const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;
  const days = weeks.flatMap(w => w.contributionDays);

  const total = data.data.user.contributionsCollection.contributionCalendar.totalContributions;
  const { current, longest } = calculateStreak(days);

  const svg = `
  <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
    <style>
      .text { fill: white; font-family: Arial; font-size: 18px; }
    </style>
    <rect width="100%" height="100%" fill="#0d1117"/>
    <text x="20" y="40" class="text">Total: ${total}</text>
    <text x="20" y="70" class="text">Current Streak: ${current}</text>
    <text x="20" y="100" class="text">Longest Streak: ${longest}</text>
  </svg>
  `;

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/streak.svg", svg);
})();

