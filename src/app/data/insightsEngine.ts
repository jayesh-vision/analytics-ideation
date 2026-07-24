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

export type QuestionShape = "ranking-desc" | "ranking-asc" | "trend" | "total";

export interface ParsedQuestion {
  domain: InsightDomain;
  measure: InsightMeasure;
  dimension: InsightDimension | null;
  shape: QuestionShape;
  filter?: { dim: InsightDimension; value: string };
}

export interface AnswerResult {
  title: string;
  chartType: "bar" | "line" | "kpi";
  bars?: { label: string; value: number; color: string }[];
  series?: { name: string; color: string; values: number[] }[];
  labels?: string[];
  kpiValue?: string;
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
  // Imported files don't always have a time column — degrade a trend ask
  // to the nearest answerable shape instead of an empty chart.
  if (shape === "trend" && domain.timeOrder.length === 0) shape = dimension ? "ranking-desc" : "total";
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

export function answerQuestion(parsed: ParsedQuestion): AnswerResult {
  const { domain, measure, dimension, shape, filter } = parsed;
  const filterLabel = filter ? ` for ${filter.value}` : "";

  if (shape === "trend") {
    const map = groupSum(domain.rows, domain.timeDimensionKey, measure.key, filter);
    const values = domain.timeOrder.map((m) => map.get(m) ?? 0);
    return {
      title: `${measure.label} trend${filterLabel}`,
      chartType: "line",
      series: [{ name: measure.label, color: "var(--vw-color-blue-500)", values }],
      labels: domain.timeOrder,
    };
  }

  if (shape === "total") {
    const filtered = filter ? domain.rows.filter((r) => String(r[filter.dim.key]) === filter.value) : domain.rows;
    const total = filtered.reduce((sum, r) => sum + Number(r[measure.key]), 0);
    return { title: `Total ${measure.label.toLowerCase()}${filterLabel}`, chartType: "kpi", kpiValue: formatMeasureValue(total, measure) };
  }

  const groupDim = dimension ?? domain.dimensions[0];
  const map = groupSum(domain.rows, groupDim.key, measure.key, filter);
  const entries = Array.from(map, ([label, value]) => ({ label, value }));
  entries.sort((a, b) => (shape === "ranking-asc" ? a.value - b.value : b.value - a.value));
  const bars = entries.map((e, i) => ({ label: e.label, value: e.value, color: BAR_COLORS[i % BAR_COLORS.length] }));
  const verb = shape === "ranking-asc" ? "lowest first" : "highest first";
  return { title: `${groupDim.label} by ${measure.label.toLowerCase()}${filterLabel} (${verb})`, chartType: "bar", bars };
}
