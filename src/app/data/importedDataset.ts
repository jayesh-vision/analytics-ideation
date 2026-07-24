// In-browser CSV import + schema inference for the Dashboard Composer's
// "Ask Insights" mode — the user picks a report file, we work out which
// columns are categories (dimensions), which are numeric measures, and
// which one is time, then produce a runtime InsightDomain the existing
// insightsEngine can answer questions against. The file never leaves the
// browser: no upload, no server, no persistence.
//
// Importing a second file with the same column signature APPENDS its rows
// to the existing imported domain (e.g. next month's report extends the
// trend); re-importing the same file name replaces that domain's rows.

import type { InsightDomain, InsightDimension, InsightMeasure } from "./insightDomains";

export interface ImportReport {
  fileName: string;
  appended: boolean;
  addedRows: number;
  totalRows: number;
  dimensions: string[];
  measures: string[];
  timeColumn: string | null;
  timeRange: string | null;
  skippedColumns: string[];
}

export interface ImportOutcome {
  domain: InsightDomain;
  report: ImportReport;
}

// --- CSV parsing -----------------------------------------------------------

/** Minimal RFC-4180-style parser: quoted fields, escaped quotes, CR/LF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// --- value classification --------------------------------------------------

const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const FULL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Sortable key for a time-ish value (month names, "Feb 2026", quarters, ISO dates) — null if not time-like. */
function timeKeyOf(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const month = t.match(/^([a-z]{3,9})[\s'.-]*(\d{2,4})?$/);
  if (month) {
    const idx = MONTH_INDEX[month[1].slice(0, 3)];
    if (idx !== undefined && (month[1].length === 3 || FULL_MONTHS.includes(month[1]))) {
      const year = month[2] ? (month[2].length === 2 ? 2000 + Number(month[2]) : Number(month[2])) : 0;
      return year * 12 + idx;
    }
    return null;
  }
  const quarter = t.match(/^q([1-4])[\s'-]*(\d{2,4})?$/);
  if (quarter) {
    const year = quarter[2] ? (quarter[2].length === 2 ? 2000 + Number(quarter[2]) : Number(quarter[2])) : 0;
    return year * 4 + Number(quarter[1]);
  }
  if (/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$/.test(t)) {
    const ts = Date.parse(t.replace(/\//g, "-"));
    if (Number.isFinite(ts)) return ts / 86400000;
  }
  return null;
}

/** Parses "1,240", "$85,000", "(120)", "12%" — null if not a number. */
function parseNumeric(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const negative = /^\(.*\)$/.test(t);
  const cleaned = t.replace(/^\(|\)$/g, "").replace(/[$€£₹,\s]/g, "").replace(/%$/, "");
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

// --- naming helpers --------------------------------------------------------

const ALIAS_STOPWORDS = new Set(["the", "a", "an", "of", "by", "and", "or", "for", "with", "per", "csv"]);

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "column";
}

function labelWords(label: string): string[] {
  return label.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !ALIAS_STOPWORDS.has(w));
}

/** Aliases for matching a column in a question: the label, its words, and simple singular/plural variants. */
function columnAliases(label: string): string[] {
  const out = new Set<string>([label.toLowerCase()]);
  for (const w of labelWords(label)) {
    out.add(w);
    out.add(w.endsWith("s") ? w.slice(0, -1) : `${w}s`);
  }
  return Array.from(out).filter(Boolean);
}

function prettyFileLabel(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base
    .split(" ")
    .map((w) => (w === w.toUpperCase() && w.length <= 4 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ") || "Imported data";
}

function sortTimeValues(values: string[]): string[] {
  return [...values].sort((a, b) => (timeKeyOf(a) ?? Number.MAX_SAFE_INTEGER) - (timeKeyOf(b) ?? Number.MAX_SAFE_INTEGER));
}

/** Column-structure fingerprint — two files with the same signature hold the same kind of rows. */
function signatureOf(domain: InsightDomain): string {
  return [
    ...domain.dimensions.map((d) => `d:${d.key}`),
    ...domain.measures.map((m) => `m:${m.key}`),
    `t:${domain.timeDimensionKey}`,
  ].sort().join("|");
}

// --- schema inference ------------------------------------------------------

interface ClassifiedColumn {
  header: string;
  key: string;
  kind: "dimension" | "measure" | "time" | "skipped";
  skipReason?: string;
  currency?: boolean;
  timeMatchRatio?: number;
}

function classifyColumns(headers: string[], dataRows: string[][]): ClassifiedColumn[] {
  const usedKeys = new Set<string>();
  const cols: ClassifiedColumn[] = headers.map((rawHeader, i) => {
    const header = rawHeader.trim() || `Column ${i + 1}`;
    let key = slug(header);
    while (usedKeys.has(key)) key = `${key}-2`;
    usedKeys.add(key);

    const values = dataRows.map((r) => (r[i] ?? "").trim());
    const nonEmpty = values.filter(Boolean);
    if (!nonEmpty.length) return { header, key, kind: "skipped" as const, skipReason: "empty" };
    const unique = new Set(nonEmpty);

    // A column with one distinct value still keeps its kind (time/dimension):
    // a "March report" has the same month in every row, a "North region
    // report" the same region — appending the next file is exactly when
    // those columns start to vary, so skipping them would break the merge.
    const timeMatches = nonEmpty.filter((v) => timeKeyOf(v) !== null).length;
    const timeMatchRatio = timeMatches / nonEmpty.length;
    if (timeMatchRatio >= 0.8) return { header, key, kind: "time" as const, timeMatchRatio };

    const numericCount = nonEmpty.filter((v) => parseNumeric(v) !== null).length;
    const looksLikeYear = /\byear\b|\byr\b/i.test(header) || Array.from(unique).every((v) => /^(19|20)\d{2}$/.test(v));
    if (numericCount / nonEmpty.length >= 0.9 && unique.size > 1 && !looksLikeYear) {
      const currency = /revenue|sales|spend|cost|amount|price|value|budget|profit/i.test(header) || nonEmpty.some((v) => /[$€£₹]/.test(v));
      return { header, key, kind: "measure" as const, currency };
    }

    if (unique.size === nonEmpty.length && nonEmpty.length > 20) return { header, key, kind: "skipped" as const, skipReason: "looks like an ID" };
    if (unique.size > 40) return { header, key, kind: "skipped" as const, skipReason: "too many distinct values" };
    return { header, key, kind: "dimension" as const };
  });

  // Keep the single best time column; extra time-like columns become dimensions.
  const timeCols = cols.filter((c) => c.kind === "time");
  if (timeCols.length > 1) {
    const best = timeCols.reduce((a, b) => ((b.timeMatchRatio ?? 0) > (a.timeMatchRatio ?? 0) ? b : a));
    for (const c of timeCols) if (c !== best) c.kind = "dimension";
  }
  return cols;
}

// --- main entry ------------------------------------------------------------

export function buildImportedDomain(fileName: string, csvText: string, existing: InsightDomain[]): ImportOutcome {
  const parsed = parseCsv(csvText);
  if (parsed.length < 2) throw new Error("the file needs a header row plus at least one data row");
  const headers = parsed[0];
  const dataRows = parsed.slice(1);

  const cols = classifyColumns(headers, dataRows);
  const measureCols = cols.filter((c) => c.kind === "measure");
  if (!measureCols.length) throw new Error("I couldn't find a numeric column to measure (like Revenue or Units)");
  const dimensionCols = cols.filter((c) => c.kind === "dimension");
  const timeCol = cols.find((c) => c.kind === "time") ?? null;

  const rows: Record<string, string | number>[] = dataRows.map((r) => {
    const row: Record<string, string | number> = {};
    cols.forEach((c, i) => {
      if (c.kind === "skipped") return;
      const raw = (r[i] ?? "").trim();
      row[c.key] = c.kind === "measure" ? parseNumeric(raw) ?? 0 : raw || "(blank)";
    });
    return row;
  });

  const dimensions: InsightDimension[] = dimensionCols.map((c) => ({ key: c.key, label: c.header, aliases: columnAliases(c.header) }));
  const measures: InsightMeasure[] = measureCols.map((c) => ({
    key: c.key, label: c.header, aliases: columnAliases(c.header), format: c.currency ? "currency" : "number",
  }));

  const label = prettyFileLabel(fileName);
  const key = `imported-${slug(label)}`;
  // A "Remarks"/"Reason"-style column powers root-cause + recommendation
  // answers (see insightsEngine.ts's diagnostic shapes).
  const reasonCol = dimensionCols.find((c) => /remark|reason|issue|cause|comment|note/i.test(c.header));
  const domain: InsightDomain = {
    key,
    label,
    aliases: Array.from(new Set([...labelWords(label), ...cols.filter((c) => c.kind !== "skipped").flatMap((c) => labelWords(c.header))])),
    rows,
    dimensions,
    measures,
    timeDimensionKey: timeCol?.key ?? "",
    timeOrder: timeCol ? sortTimeValues(Array.from(new Set(rows.map((r) => String(r[timeCol.key]))))) : [],
    reasonDimensionKey: reasonCol?.key,
  };

  const skippedColumns = cols.filter((c) => c.kind === "skipped").map((c) => `${c.header} (${c.skipReason})`);
  const signature = signatureOf(domain);

  // Same file name → replace that domain's rows. Same columns under a new
  // name (next region / next month's report) → append to the existing domain.
  const sameName = existing.find((d) => d.key === key);
  const sameShape = sameName ? null : existing.find((d) => d.key.startsWith("imported-") && signatureOf(d) === signature);

  if (sameShape) {
    const mergedRows = [...sameShape.rows, ...rows];
    // "Sales Report - North" + "Sales Report - South" consolidate under the
    // files' common name prefix: "Sales Report".
    const wordsA = sameShape.label.split(" ");
    const wordsB = label.split(" ");
    const common: string[] = [];
    for (let i = 0; i < Math.min(wordsA.length, wordsB.length); i++) {
      if (wordsA[i].toLowerCase() === wordsB[i].toLowerCase()) common.push(wordsA[i]);
      else break;
    }
    const merged: InsightDomain = {
      ...sameShape,
      label: common.length ? common.join(" ") : sameShape.label,
      rows: mergedRows,
      timeOrder: timeCol ? sortTimeValues(Array.from(new Set(mergedRows.map((r) => String(r[timeCol.key]))))) : sameShape.timeOrder,
    };
    return {
      domain: merged,
      report: {
        fileName, appended: true, addedRows: rows.length, totalRows: mergedRows.length,
        dimensions: dimensions.map((d) => d.label), measures: measures.map((m) => m.label),
        timeColumn: timeCol?.header ?? null,
        timeRange: merged.timeOrder.length ? `${merged.timeOrder[0]} – ${merged.timeOrder[merged.timeOrder.length - 1]}` : null,
        skippedColumns,
      },
    };
  }

  return {
    domain,
    report: {
      fileName, appended: false, addedRows: rows.length, totalRows: rows.length,
      dimensions: dimensions.map((d) => d.label), measures: measures.map((m) => m.label),
      timeColumn: timeCol?.header ?? null,
      timeRange: domain.timeOrder.length ? `${domain.timeOrder[0]} – ${domain.timeOrder[domain.timeOrder.length - 1]}` : null,
      skippedColumns,
    },
  };
}

/** Starter-question chips generated from the imported file's own columns —
 *  visible proof the schema was actually understood. When the data carries a
 *  Remarks-style column, the chips steer into the diagnostic chain
 *  (why → how to overcome → forecast). */
export function suggestedQuestions(domain: InsightDomain): string[] {
  const out: string[] = [];
  const dim0 = domain.dimensions.find((d) => d.key !== domain.reasonDimensionKey);
  const dim1 = domain.dimensions.find((d) => d.key !== domain.reasonDimensionKey && d.key !== dim0?.key);
  const m0 = domain.measures[0];
  const m1 = domain.measures[1] ?? m0;
  if (dim0 && m0) out.push(`Which ${dim0.label.toLowerCase()} has the highest ${m0.label.toLowerCase()}?`);
  if (domain.reasonDimensionKey && dim0 && m0) {
    // Worst performer of the primary dimension — the "why is X down" chip.
    const totals = new Map<string, number>();
    for (const r of domain.rows) {
      const k = String(r[dim0.key]);
      totals.set(k, (totals.get(k) ?? 0) + Number(r[m0.key]));
    }
    let worst: string | null = null; let min = Infinity;
    for (const [value, total] of totals) if (total < min) { min = total; worst = value; }
    if (worst) out.push(`Why is ${worst} down?`);
    out.push(`What is the ${m0.label.toLowerCase()} forecast for next quarter?`);
    return out.slice(0, 3);
  }
  if (domain.timeOrder.length >= 2) out.push(`Show the ${m1.label.toLowerCase()} trend`);
  else if (dim1 && m0) out.push(`Which ${dim1.label.toLowerCase()} has the highest ${m0.label.toLowerCase()}?`);
  if (dim0 && dim1 && m0) {
    const sampleValue = String(domain.rows[0]?.[dim1.key] ?? "");
    if (sampleValue && sampleValue !== "(blank)") out.push(`Which ${dim0.label.toLowerCase()} has the highest ${m0.label.toLowerCase()} for ${sampleValue}?`);
  }
  if (out.length < 3 && m0) out.push(`What is the total ${m0.label.toLowerCase()}?`);
  return out.slice(0, 3);
}
