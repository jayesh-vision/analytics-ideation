import { INSIGHT_DOMAINS, type InsightDomain, type InsightDimension, type InsightMeasure } from "./insightDomains";

// Heuristic natural-language question parsing + aggregation for "Ask
// Insights" mode — no LLM, scoped to the vocabulary of the domains in
// play. Given a question like "which region has the highest units of
// Laptops sold?", this identifies the domain (Regional Sales), the measure
// (units), the dimension to group by (region), an optional filter (product
// = Laptops), and the answer "shape" (a descending ranking) — then
// aggregates the domain's real row data to produce the actual answer.
//
// The domain list is injectable: callers pass the user's imported datasets
// (see importedDataset.ts) to answer questions from their own file instead
// of the built-in sample domains — imports replace, not join, the built-ins
// so an answer can never silently come from sample data.

export type QuestionShape = "ranking-desc" | "ranking-asc" | "trend" | "total" | "root-cause" | "recommend" | "forecast";

export interface ParsedQuestion {
  domain: InsightDomain;
  measure: InsightMeasure;
  dimension: InsightDimension | null;
  shape: QuestionShape;
  filter?: { dim: InsightDimension; value: string };
}

export interface AnswerResult {
  title: string;
  chartType: "bar" | "line" | "kpi" | "donut" | "list";
  bars?: { label: string; value: number; color: string }[];
  series?: { name: string; color: string; values: (number | null)[]; dashed?: boolean }[];
  labels?: string[];
  kpiValue?: string;
  segments?: { label: string; value: number; color: string }[];
  items?: string[];
  /** One-line plain-English takeaway, shown alongside the widget in chat. */
  summary?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word.toLowerCase())}\\b`, "i").test(text);
}

// Distinct values per (domain, dimension) — memoized because imported files
// can hold thousands of rows and we rescan on every keystroke-sent message.
const VALUE_CACHE = new WeakMap<InsightDomain, Map<string, string[]>>();
function distinctValues(domain: InsightDomain, dimKey: string): string[] {
  let byDim = VALUE_CACHE.get(domain);
  if (!byDim) { byDim = new Map(); VALUE_CACHE.set(domain, byDim); }
  let values = byDim.get(dimKey);
  if (!values) {
    values = Array.from(new Set(domain.rows.map((r) => String(r[dimKey]))));
    byDim.set(dimKey, values);
  }
  return values;
}

function scoreDomain(text: string, domain: InsightDomain): number {
  const t = text.toLowerCase();
  let score = 0;
  if (hasWord(t, domain.label)) score += 40;
  for (const a of domain.aliases) if (hasWord(t, a)) score += 15;
  for (const d of domain.dimensions) {
    for (const a of d.aliases) if (hasWord(t, a)) score += 8;
    for (const v of distinctValues(domain, d.key)) if (hasWord(t, v)) score += 10;
  }
  for (const m of domain.measures) for (const a of m.aliases) if (hasWord(t, a)) score += 8;
  return score;
}

// Picks the best-matching domain for this message; when nothing in this
// specific message carries a strong signal, stays on the domain already in
// play (so a follow-up like "now break that down by category" doesn't need
// to repeat "procurement" every time).
function pickBestDomain(text: string, priorDomain?: InsightDomain, domains: InsightDomain[] = INSIGHT_DOMAINS): InsightDomain | null {
  const scored = domains.map((d) => ({ d, s: scoreDomain(text, d) })).sort((a, b) => b.s - a.s);
  const top = scored[0];
  if (!top || top.s < 8) return priorDomain ?? null;
  if (priorDomain) {
    const priorScore = scored.find((x) => x.d.key === priorDomain.key)?.s ?? 0;
    if (priorScore >= top.s - 5) return priorDomain;
  }
  return top.d;
}

function pickTargetDimension(text: string, domain: InsightDomain): InsightDimension | null {
  let best: InsightDimension | null = null;
  let bestScore = 0;
  for (const d of domain.dimensions) {
    let s = 0;
    if (hasWord(text, d.label)) s += 10;
    for (const a of d.aliases) if (hasWord(text, a)) s += 6;
    if (s > bestScore) { bestScore = s; best = d; }
  }
  return best;
}

// A filter is a dimension VALUE mentioned in the text (e.g. "Laptops") on a
// dimension OTHER than the one being ranked/grouped by.
function pickFilter(text: string, domain: InsightDomain, targetDim: InsightDimension | null): { dim: InsightDimension; value: string } | null {
  for (const d of domain.dimensions) {
    if (targetDim && d.key === targetDim.key) continue;
    for (const v of distinctValues(domain, d.key)) if (hasWord(text, v)) return { dim: d, value: v };
  }
  return null;
}

function pickMeasure(text: string, domain: InsightDomain): InsightMeasure {
  let best = domain.measures[0];
  let bestScore = 0;
  for (const m of domain.measures) {
    let s = 0;
    if (hasWord(text, m.label)) s += 10;
    for (const a of m.aliases) if (hasWord(text, a)) s += 6;
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

function pickShape(text: string, hasDimension: boolean): QuestionShape {
  const t = text.toLowerCase();
  // Diagnostic shapes first — "why is South down" must not fall into a
  // ranking just because it contains "down".
  if (/\b(overcome|recover|fix this|mitigate|improve this|recommend|action plan|what should we do|how do we|how to)\b/.test(t)) return "recommend";
  if (/\bwhy\b|\broot\s*cause\b|\breason\b|\bcause\b/.test(t)) return "root-cause";
  if (/\bforc?ast(ing)?\b|\bprojection\b|\bnext\s+(fiscal|quarter|year|month)\b|\boutlook\b/.test(t)) return "forecast";
  if (/\b(lowest|weakest|worst|least)\b/.test(t)) return "ranking-asc";
  if (/\b(strongest|highest|top|best|most)\b/.test(t)) return "ranking-desc";
  if (/\b(trend|over time|monthly|last\s+\d+\s+months?)\b/.test(t)) return "trend";
  if (/\b(total|how many|overall|sum of|what is the)\b/.test(t) && !hasDimension) return "total";
  return hasDimension ? "ranking-desc" : "total";
}

const COMMAND_LEAD = /^(build|create|generate|compose|make|add|give me|i want to (create|build|generate|compose|make))\b/i;
const QUESTION_LEAD = /^(what|which|who|how|where|when|why|show|tell me)\b/i;
const SHAPE_HINT = /\b(strongest|highest|top|best|most|lowest|weakest|worst|least|trend|total|overall)\b/i;

// Cheap intent classifier — must run before any create-command handling, and
// must never fire for command-shaped text ("build me a dashboard for X")
// even if it happens to share vocabulary with a domain.
export function isAnalyticalQuestion(text: string, priorDomain?: InsightDomain, domains?: InsightDomain[]): boolean {
  const t = text.trim();
  if (!t) return false;
  if (COMMAND_LEAD.test(t)) return false;
  if (t.endsWith("?")) return true;
  if (QUESTION_LEAD.test(t)) return true;
  if (SHAPE_HINT.test(t) && pickBestDomain(t, priorDomain, domains) !== null) return true;
  return false;
}

export function parseQuestion(text: string, priorDomain?: InsightDomain, domains?: InsightDomain[]): ParsedQuestion | null {
  const domain = pickBestDomain(text, priorDomain, domains);
  if (!domain) return null;
  const dimension = pickTargetDimension(text, domain);
  const filter = pickFilter(text, domain, dimension) ?? undefined;
  let shape = pickShape(text, !!dimension);
  // Imported files don't always have a time column — degrade a trend or
  // forecast ask to the nearest answerable shape instead of an empty chart.
  if ((shape === "trend" || shape === "forecast") && domain.timeOrder.length === 0) shape = dimension ? "ranking-desc" : "total";
  const measure = pickMeasure(text, domain);
  return { domain, measure, dimension, shape, filter };
}

function groupSum(rows: Record<string, string | number>[], groupKey: string, measureKey: string, filter?: { dim: InsightDimension; value: string }): Map<string, number> {
  const filtered = filter ? rows.filter((r) => String(r[filter.dim.key]) === filter.value) : rows;
  const map = new Map<string, number>();
  for (const r of filtered) {
    const k = String(r[groupKey]);
    map.set(k, (map.get(k) ?? 0) + Number(r[measureKey]));
  }
  return map;
}

const BAR_COLORS = ["var(--vw-color-blue-500)", "var(--vw-color-emerald-500)", "var(--vw-color-amber-500)", "var(--vw-color-purple-500)", "var(--vw-color-red-500)"];

function formatMeasureValue(value: number, measure: InsightMeasure): string {
  const compact = value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `${Math.round(value)}`;
  return measure.format === "currency" ? `$${compact}` : compact;
}

// --- diagnostic helpers (root cause / recommend / forecast) ----------------

const NON_REASONS = new Set(["", "—", "-", "na", "n/a", "none", "(blank)", "nil"]);

/** The segment a diagnostic question is about: the mentioned value if any,
 *  else the worst performer of the primary dimension. */
function pickSegment(parsed: ParsedQuestion): { dim: InsightDimension; value: string } | null {
  const { domain, measure, dimension, filter } = parsed;
  if (filter) return { dim: filter.dim, value: filter.value };
  const dim = dimension ?? domain.dimensions.find((d) => d.key !== domain.reasonDimensionKey) ?? domain.dimensions[0];
  if (!dim) return null;
  const totals = groupSum(domain.rows, dim.key, measure.key);
  let worst: string | null = null;
  let min = Infinity;
  for (const [value, total] of totals) {
    if (total < min) { min = total; worst = value; }
  }
  return worst ? { dim, value: worst } : null;
}

/** Counts of cited reasons inside a segment's rows, worst-first. */
function reasonBreakdown(domain: InsightDomain, seg: { dim: InsightDimension; value: string }): { label: string; count: number }[] {
  if (!domain.reasonDimensionKey) return [];
  const counts = new Map<string, number>();
  for (const r of domain.rows) {
    if (String(r[seg.dim.key]) !== seg.value) continue;
    const reason = String(r[domain.reasonDimensionKey] ?? "").trim();
    if (NON_REASONS.has(reason.toLowerCase())) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** How far the segment sits below the average of its peers, in percent. */
function pctBelowPeers(domain: InsightDomain, measure: InsightMeasure, seg: { dim: InsightDimension; value: string }): number {
  const totals = groupSum(domain.rows, seg.dim.key, measure.key);
  const segTotal = totals.get(seg.value) ?? 0;
  const others = Array.from(totals.entries()).filter(([v]) => v !== seg.value).map(([, t]) => t);
  if (!others.length) return 0;
  const avg = others.reduce((s, t) => s + t, 0) / others.length;
  return avg > 0 ? Math.max(0, Math.round((1 - segTotal / avg) * 100)) : 0;
}

const MONTH_CYCLE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Continues a month-labeled axis ("Mar" → Apr, May, Jun); falls back to +1/+2/+3. */
function nextPeriodLabels(lastLabel: string, count: number): string[] {
  const idx = MONTH_CYCLE.findIndex((m) => lastLabel.toLowerCase().startsWith(m.toLowerCase()));
  return Array.from({ length: count }, (_, i) =>
    idx >= 0 ? `${MONTH_CYCLE[(idx + 1 + i) % 12]} (proj)` : `+${i + 1} (proj)`
  );
}

/** Reason → recovery-action template, for "how do we overcome this". */
function actionForReason(reason: string, segment: string, count: number): string {
  const r = reason.toLowerCase();
  if (/distributor|dealer|partner|channel/.test(r)) return `Re-sign or replace the exited distributor in ${segment} — bridge the coverage gap with direct fulfilment until a new partner is live.`;
  if (/stock|inventory|supply|shortage/.test(r)) return `Expedite replenishment and raise safety-stock levels for ${segment} — ${count} order line${count === 1 ? "" : "s"} cite availability.`;
  if (/logistic|delivery|transport|shipment/.test(r)) return `Re-route ${segment} orders through an alternate carrier until lead times normalise.`;
  if (/price|pricing|discount|competitor/.test(r)) return `Run a pricing review for ${segment} against competitor benchmarks before next quarter.`;
  if (/staff|attrition|team|resource/.test(r)) return `Backfill the ${segment} field team and shift regional coverage in the interim.`;
  return `Address "${reason}" — cited on ${count} order line${count === 1 ? "" : "s"} in ${segment}.`;
}

export function answerQuestion(parsed: ParsedQuestion): AnswerResult {
  const { domain, measure, dimension, shape, filter } = parsed;
  const filterLabel = filter ? ` for ${filter.value}` : "";

  if (shape === "trend") {
    const map = groupSum(domain.rows, domain.timeDimensionKey, measure.key, filter);
    const values = domain.timeOrder.map((m) => map.get(m) ?? 0);
    const delta = values.length >= 2 && values[0] > 0 ? Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100) : 0;
    return {
      title: `${measure.label} trend${filterLabel}`,
      chartType: "line",
      series: [{ name: measure.label, color: "var(--vw-color-blue-500)", values }],
      labels: domain.timeOrder,
      summary: `${measure.label}${filterLabel} is ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)}% from ${domain.timeOrder[0]} to ${domain.timeOrder[domain.timeOrder.length - 1]}.`,
    };
  }

  if (shape === "total") {
    const filtered = filter ? domain.rows.filter((r) => String(r[filter.dim.key]) === filter.value) : domain.rows;
    const total = filtered.reduce((sum, r) => sum + Number(r[measure.key]), 0);
    const kpiValue = formatMeasureValue(total, measure);
    return { title: `Total ${measure.label.toLowerCase()}${filterLabel}`, chartType: "kpi", kpiValue, summary: `Total ${measure.label.toLowerCase()}${filterLabel} across ${filtered.length} rows is ${kpiValue}.` };
  }

  if (shape === "root-cause") {
    const seg = pickSegment(parsed);
    if (seg) {
      const reasons = reasonBreakdown(domain, seg);
      if (reasons.length) {
        const totalCited = reasons.reduce((s, r) => s + r.count, 0);
        return {
          title: `Root cause — ${seg.value} (${pctBelowPeers(domain, measure, seg)}% below the other ${seg.dim.label.toLowerCase()}s)`,
          chartType: "donut",
          segments: reasons.slice(0, 4).map((r, i) => ({ label: r.label, value: r.count, color: BAR_COLORS[(i + 2) % BAR_COLORS.length] })),
          summary: `${seg.value} sits ${pctBelowPeers(domain, measure, seg)}% below its peers — top cited reason: "${reasons[0].label}" on ${reasons[0].count} of ${totalCited} flagged lines.`,
        };
      }
      // No remarks column in the data — show the segment's decline instead.
      if (domain.timeOrder.length) {
        const map = groupSum(domain.rows, domain.timeDimensionKey, measure.key, { dim: seg.dim, value: seg.value });
        return {
          title: `${seg.value} — ${measure.label.toLowerCase()} by ${domain.timeOrder.length} periods (no remarks column to explain why)`,
          chartType: "line",
          series: [{ name: seg.value, color: "var(--vw-color-red-500)", values: domain.timeOrder.map((m) => map.get(m) ?? 0) }],
          labels: domain.timeOrder,
        };
      }
    }
  }

  if (shape === "recommend") {
    const seg = pickSegment(parsed);
    const items: string[] = [];
    if (seg) {
      for (const r of reasonBreakdown(domain, seg).slice(0, 3)) items.push(actionForReason(r.label, seg.value, r.count));
      const totals = groupSum(domain.rows, seg.dim.key, measure.key);
      let best: string | null = null; let max = -Infinity;
      for (const [value, total] of totals) if (value !== seg.value && total > max) { max = total; best = value; }
      if (best) items.push(`Replicate ${best}'s playbook — it leads with ${formatMeasureValue(max, measure)} ${measure.label.toLowerCase()} this period.`);
      items.push(`Set a weekly ${measure.label.toLowerCase()} watch on ${seg.value} until it recovers to the ${seg.dim.label.toLowerCase()} average.`);
      return {
        title: `Recovery actions — ${seg.value}`, chartType: "list", items,
        summary: `${items.length} recovery actions drafted for ${seg.value} from the cited root causes.`,
      };
    }
  }

  if (shape === "forecast" && domain.timeOrder.length >= 2) {
    const map = groupSum(domain.rows, domain.timeDimensionKey, measure.key, filter);
    const actual = domain.timeOrder.map((m) => map.get(m) ?? 0);
    const diffs: number[] = [];
    for (let i = Math.max(1, actual.length - 3); i < actual.length; i++) diffs.push(actual[i] - actual[i - 1]);
    const step = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    const last = actual[actual.length - 1];
    const projected = [1, 2, 3].map((i) => Math.max(0, Math.round(last + step * i)));
    const projLabels = nextPeriodLabels(domain.timeOrder[domain.timeOrder.length - 1], 3);
    return {
      title: `${measure.label} forecast${filterLabel} — trend preview`,
      chartType: "line",
      labels: [...domain.timeOrder, ...projLabels],
      series: [
        { name: "Actual", color: "var(--vw-color-blue-500)", values: [...actual, null, null, null] },
        { name: "Projected", color: "var(--vw-color-amber-500)", values: [...actual.map((_, i) => (i === actual.length - 1 ? last : null)), ...projected], dashed: true },
      ],
      summary: `On the current trajectory, ${measure.label.toLowerCase()}${filterLabel} projects to ${formatMeasureValue(projected[2], measure)} by ${projLabels[2].replace(" (proj)", "")} — trend extrapolation, not a production model.`,
    };
  }

  const groupDim = dimension ?? domain.dimensions[0];
  if (!groupDim) {
    const total = domain.rows.reduce((sum, r) => sum + Number(r[measure.key]), 0);
    return { title: `Total ${measure.label.toLowerCase()}${filterLabel}`, chartType: "kpi", kpiValue: formatMeasureValue(total, measure) };
  }
  const map = groupSum(domain.rows, groupDim.key, measure.key, filter);
  const entries = Array.from(map, ([label, value]) => ({ label, value }));
  entries.sort((a, b) => (shape === "ranking-asc" ? a.value - b.value : b.value - a.value));
  const bars = entries.map((e, i) => ({ label: e.label, value: e.value, color: BAR_COLORS[i % BAR_COLORS.length] }));
  const verb = shape === "ranking-asc" ? "lowest first" : "highest first";
  const first = entries[0];
  const last = entries[entries.length - 1];
  const summary = first && last && first.label !== last.label
    ? (shape === "ranking-asc"
      ? `${first.label} is lowest at ${formatMeasureValue(first.value, measure)} ${measure.label.toLowerCase()}${filterLabel}; ${last.label} leads with ${formatMeasureValue(last.value, measure)}.`
      : `${first.label} leads with ${formatMeasureValue(first.value, measure)} ${measure.label.toLowerCase()}${filterLabel}; ${last.label} is lowest at ${formatMeasureValue(last.value, measure)}.`)
    : undefined;
  return { title: `${groupDim.label} by ${measure.label.toLowerCase()}${filterLabel} (${verb})`, chartType: "bar", bars, summary };
}
