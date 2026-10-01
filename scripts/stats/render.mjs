const SANS = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
const COLORS = ["#161B22", "#3B2A6B", "#5B3FB0", "#7F5AF0", "#C4B5FD"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (n) => n.toLocaleString("en-IN");
const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const dayCount = (n) => `${n} ${n === 1 ? "day" : "days"}`;

function level(count, max) {
  if (count === 0) return 0;
  const r = count / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

/**
 * @param {{
 *   allTime: number, lastYear: number, sinceYear: number,
 *   currentStreak: { days: number, start?: string, end?: string },
 *   longestStreak: { days: number, start?: string, end?: string },
 *   bestDay: { date?: string, count: number },
 *   weeks: { date: string, count: number }[][],
 *   updatedAt: string,
 * }} data
 */
export function renderStatsCard(data) {
  const W = 1200;
  const H = 430;
  const PAD = 32;
  const GAP = 16;
  const tileW = (W - PAD * 2 - GAP * 3) / 4;

  const range = (s) => (s.days > 0 && s.start ? `${fmtDate(s.start)} → ${fmtDate(s.end)}` : "Start one today 💪");
  const tiles = [
    { label: "All-time contributions", value: fmt(data.allTime), sub: `Since ${data.sinceYear}`, icon: "🏆" },
    { label: "Last 12 months", value: fmt(data.lastYear), sub: data.bestDay.count ? `Best day: ${data.bestDay.count} on ${fmtDate(data.bestDay.date)}` : "Keep shipping 🚀", icon: "📈" },
    { label: "Current streak", value: dayCount(data.currentStreak.days), sub: range(data.currentStreak), icon: "🔥" },
    { label: "Longest streak", value: dayCount(data.longestStreak.days), sub: range(data.longestStreak), icon: "⚡" },
  ];

  const tileSvg = tiles
    .map((t, i) => {
      const x = PAD + i * (tileW + GAP);
      const y = 84;
      return `<g class="fade" style="animation-delay:${(0.1 + i * 0.12).toFixed(2)}s">
  <rect x="${x}" y="${y}" width="${tileW}" height="112" rx="16" fill="#FFFFFF" fill-opacity="0.035" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <text x="${x + 20}" y="${y + 32}" font-size="13" font-weight="600" fill="#94A3B8">${esc(t.icon)}  ${esc(t.label)}</text>
  <text x="${x + 20}" y="${y + 74}" font-size="34" font-weight="800" fill="url(#brand)">${esc(t.value)}</text>
  <text x="${x + 20}" y="${y + 97}" font-size="12" fill="#64748B">${esc(t.sub)}</text>
</g>`;
    })
    .join("\n");

  const weeks = data.weeks.slice(-53);
  const max = Math.max(1, ...weeks.flat().map((d) => d.count));
  const CELL = 15;
  const STEP = 19;
  const gridW = weeks.length * STEP - (STEP - CELL);
  const x0 = Math.round((W - gridW) / 2);
  const y0 = 252;

  let lastMonth = -1;
  const monthLabels = [];
  const cells = weeks
    .map((week, wi) => {
      const first = week[0];
      if (first) {
        const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
        if (m !== lastMonth && wi < weeks.length - 2) {
          const label = { wi, text: `<text x="${x0 + wi * STEP}" y="${y0 - 10}" font-size="11" fill="#64748B">${MONTHS[m]}</text>` };
          const prev = monthLabels[monthLabels.length - 1];
          if (prev && wi - prev.wi < 3) monthLabels[monthLabels.length - 1] = label;
          else monthLabels.push(label);
          lastMonth = m;
        }
      }
      const rects = week
        .map((d) => {
          const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
          const lvl = level(d.count, max);
          return `<rect x="${x0 + wi * STEP}" y="${y0 + dow * STEP}" width="${CELL}" height="${CELL}" rx="3.5" fill="${COLORS[lvl]}"><title>${d.count} on ${fmtDate(d.date)}</title></rect>`;
        })
        .join("");
      return `<g class="cell" style="animation-delay:${(0.5 + wi * 0.018).toFixed(3)}s">${rects}</g>`;
    })
    .join("\n");

  const legendX = W - PAD - 5 * 19 - 74;
  const legend = COLORS.map((c, i) => `<rect x="${legendX + 38 + i * 19}" y="${H - 34}" width="15" height="15" rx="3.5" fill="${c}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}" role="img" aria-label="GitHub contribution dashboard: ${data.allTime} all-time contributions, ${data.lastYear} in the last 12 months">
<defs>
  <linearGradient id="brand" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
    <stop offset="0" stop-color="#C4B5FD"/><stop offset="0.5" stop-color="#2CB67D"/><stop offset="1" stop-color="#38BDF8"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="0 0;300 0;0 0" dur="7s" repeatCount="indefinite"/>
  </linearGradient>
  <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7F5AF0" stop-opacity="0.8"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="1" stop-color="#0EA5E9" stop-opacity="0.7"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
  <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
</defs>
<style>
  .fade{animation:fade .7s ease-out both}
  @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .cell{animation:pop .5s ease-out both}
  @keyframes pop{from{opacity:0}to{opacity:1}}
</style>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="#0B0F19"/>
  <circle cx="120" cy="30" r="150" fill="#7F5AF0" opacity="0.28" filter="url(#blur)"/>
  <circle cx="1100" cy="420" r="160" fill="#0EA5E9" opacity="0.2" filter="url(#blur)"/>
</g>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="24" fill="none" stroke="url(#stroke)" stroke-width="1.5"/>

<text class="fade" x="${PAD}" y="52" font-size="22" font-weight="800" fill="#F8FAFC">📊 Contribution dashboard</text>
<text class="fade" x="${W - PAD}" y="52" text-anchor="end" font-size="13" fill="#64748B">Updated ${esc(data.updatedAt)}</text>
${tileSvg}
${monthLabels.map((l) => l.text).join("")}
${cells}
<text x="${PAD}" y="${H - 22}" font-size="12" fill="#64748B">Includes private work contributions (Medh &amp; eSampark) · auto-updated every 6 hours</text>
<text x="${legendX}" y="${H - 22}" font-size="12" fill="#64748B">Less</text>
${legend}
<text x="${legendX + 38 + 5 * 19 + 4}" y="${H - 22}" font-size="12" fill="#64748B">More</text>
</svg>
`;
}
