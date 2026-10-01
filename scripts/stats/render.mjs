const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const C = {
  bg: "#0F0D17", panel: "#16131F", border: "#262037", text: "#F5F3FF",
  muted: "#A1A1AA", dim: "#71717A", accent: "#8B5CF6", accentSoft: "#A78BFA",
};
const LEVELS = ["#1A1726", "#3B2A6B", "#5B3FB0", "#8B5CF6", "#C4B5FD"];
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
  const H = 440;
  const PAD = 40;
  const GAP = 16;
  const tileW = (W - PAD * 2 - GAP * 3) / 4;

  const range = (s) => (s.days > 0 && s.start ? `${fmtDate(s.start)} – ${fmtDate(s.end)}` : "No active streak");
  const tiles = [
    { label: "ALL-TIME", value: fmt(data.allTime), sub: `contributions since ${data.sinceYear}` },
    { label: "LAST 12 MONTHS", value: fmt(data.lastYear), sub: data.bestDay.count ? `best day ${data.bestDay.count} on ${fmtDate(data.bestDay.date)}` : "contributions" },
    { label: "CURRENT STREAK", value: dayCount(data.currentStreak.days), sub: range(data.currentStreak) },
    { label: "LONGEST STREAK", value: dayCount(data.longestStreak.days), sub: range(data.longestStreak) },
  ];

  const tileSvg = tiles
    .map((t, i) => {
      const x = PAD + i * (tileW + GAP);
      const y = 96;
      return `<rect x="${x}" y="${y}" width="${tileW}" height="104" rx="14" fill="${C.panel}" stroke="${C.border}"/>
  <text x="${x + 20}" y="${y + 30}" font-size="11" font-weight="700" letter-spacing="2" fill="${C.dim}">${esc(t.label)}</text>
  <text x="${x + 20}" y="${y + 68}" font-size="32" font-weight="700" letter-spacing="-0.5" fill="${C.text}">${esc(t.value)}</text>
  <text x="${x + 20}" y="${y + 89}" font-size="12" fill="${C.muted}">${esc(t.sub)}</text>`;
    })
    .join("\n");

  const weeks = data.weeks.slice(-53);
  const max = Math.max(1, ...weeks.flat().map((d) => d.count));
  const CELL = 15;
  const STEP = 19;
  const gridW = weeks.length * STEP - (STEP - CELL);
  const x0 = Math.round((W - gridW) / 2);
  const y0 = 256;

  let lastMonth = -1;
  const monthLabels = [];
  const cells = weeks
    .map((week, wi) => {
      const first = week[0];
      if (first) {
        const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
        if (m !== lastMonth && wi < weeks.length - 2) {
          const label = { wi, text: `<text x="${x0 + wi * STEP}" y="${y0 - 10}" font-size="11" fill="${C.dim}">${MONTHS[m]}</text>` };
          const prev = monthLabels[monthLabels.length - 1];
          if (prev && wi - prev.wi < 3) monthLabels[monthLabels.length - 1] = label;
          else monthLabels.push(label);
          lastMonth = m;
        }
      }
      return week
        .map((d) => {
          const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
          return `<rect x="${x0 + wi * STEP}" y="${y0 + dow * STEP}" width="${CELL}" height="${CELL}" rx="3.5" fill="${LEVELS[level(d.count, max)]}"><title>${d.count} on ${fmtDate(d.date)}</title></rect>`;
        })
        .join("");
    })
    .join("\n");

  const legendX = W - PAD - 5 * 19 - 74;
  const legend = LEVELS.map((c, i) => `<rect x="${legendX + 38 + i * 19}" y="${H - 38}" width="15" height="15" rx="3.5" fill="${c}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}" role="img" aria-label="GitHub contribution activity: ${data.allTime} all-time contributions, ${data.lastYear} in the last 12 months">
<defs><clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>
<g clip-path="url(#clip)"><rect width="${W}" height="${H}" fill="${C.bg}"/></g>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="24" fill="none" stroke="${C.border}" stroke-width="1.5"/>

<rect x="${PAD}" y="38" width="3" height="34" rx="1.5" fill="${C.accent}"/>
<text x="${PAD + 16}" y="54" font-size="18" font-weight="700" fill="${C.text}">Contribution activity</text>
<text x="${PAD + 16}" y="72" font-size="12.5" fill="${C.dim}">Public and private work on GitHub</text>
<text x="${W - PAD}" y="60" text-anchor="end" font-size="12" fill="${C.dim}">Updated ${esc(data.updatedAt)}</text>
${tileSvg}
${monthLabels.map((l) => l.text).join("")}
${cells}
<text x="${PAD}" y="${H - 26}" font-size="12" fill="${C.dim}">Refreshes every 6 hours</text>
<text x="${legendX}" y="${H - 26}" font-size="12" fill="${C.dim}">Less</text>
${legend}
<text x="${legendX + 38 + 5 * 19 + 4}" y="${H - 26}" font-size="12" fill="${C.dim}">More</text>
</svg>
`;
}
