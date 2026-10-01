import { mkdir, writeFile } from "node:fs/promises";
import { renderStatsCard } from "./render.mjs";

const login = process.env.GH_LOGIN;
const token = process.env.GITHUB_TOKEN;
const outFile = process.env.OUT_FILE ?? "dist/stats.svg";

if (!login || !token) {
  console.error("GH_LOGIN and GITHUB_TOKEN are required");
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-stats" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

const CALENDAR = "contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }";

const base = await gql(
  `query($login: String!) { user(login: $login) { contributionsCollection { contributionYears ${CALENDAR} } } }`,
  { login },
);
const collection = base.user.contributionsCollection;
const years = [...collection.contributionYears].sort();

const yearAliases = years
  .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { ${CALENDAR} }`)
  .join("\n");
const perYear = (await gql(`query($login: String!) { user(login: $login) { ${yearAliases} } }`, { login })).user;

const todayIst = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const days = new Map();
let allTime = 0;
for (const y of years) {
  const cal = perYear[`y${y}`].contributionCalendar;
  allTime += cal.totalContributions;
  for (const w of cal.weeks) for (const d of w.contributionDays) if (d.date <= todayIst) days.set(d.date, d.contributionCount);
}
const sorted = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));

let longest = { days: 0 };
let run = { days: 0 };
for (const [date, count] of sorted) {
  if (count > 0) {
    run = run.days ? { ...run, days: run.days + 1, end: date } : { days: 1, start: date, end: date };
    if (run.days > longest.days) longest = { ...run };
  } else {
    run = { days: 0 };
  }
}

let current = { days: 0 };
let i = sorted.length - 1;
if (i >= 0 && sorted[i][1] === 0) i -= 1;
for (; i >= 0 && sorted[i][1] > 0; i -= 1) {
  current = { days: current.days + 1, start: sorted[i][0], end: current.end ?? sorted[i][0] };
}

const weeks = collection.contributionCalendar.weeks.map((w) =>
  w.contributionDays.filter((d) => d.date <= todayIst).map((d) => ({ date: d.date, count: d.contributionCount })),
);
const bestDay = weeks.flat().reduce((best, d) => (d.count > best.count ? d : best), { count: 0 });

const updatedAt = new Date().toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const svg = renderStatsCard({
  allTime,
  lastYear: collection.contributionCalendar.totalContributions,
  sinceYear: years[0] ?? new Date().getFullYear(),
  currentStreak: current,
  longestStreak: longest,
  bestDay,
  weeks,
  updatedAt: `${updatedAt} IST`,
});

await mkdir(outFile.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await writeFile(outFile, svg);
console.log(`Wrote ${outFile}: allTime=${allTime} lastYear=${collection.contributionCalendar.totalContributions} streak=${current.days} longest=${longest.days}`);
