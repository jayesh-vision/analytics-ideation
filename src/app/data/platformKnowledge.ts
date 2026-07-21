import raw from "./platformKnowledge.json";

// A safe, structural-only extract of 4 real dashboard exports from the user's
// production platform (credentials/connection details were stripped during
// extraction — see the project memory for provenance). Used so the AI
// Creation Studio can recognize a request that matches something that
// already exists on the real platform ("Problem by severity", "PO issued
// with pending delivery", …) and pre-fill from its real definition, instead
// of only ever inventing a generic one from the mock application catalog.

export interface KnownWidget {
  name: string;
  chartType: string | null;
  chartTypeLabel: string;
  widgetType: string | null;
  description: string;
  datasetName: string | null;
}
export interface KnownDataset {
  name: string;
  description: string;
  sourceType: string | null;
  applicationName: string | null;
  query: string;
}
export interface KnownDatasource {
  name: string | null;
  type: string | null;
  category: string | null;
  applicationName: string | null;
}
export interface KnownDashboard {
  key: string;
  name: string;
  title: string;
  description: string;
  module: string;
  datasources: KnownDatasource[];
  widgets: KnownWidget[];
  datasets: KnownDataset[];
}

export const PLATFORM_DASHBOARDS: KnownDashboard[] = (raw as { dashboards: KnownDashboard[] }).dashboards;

export interface WidgetMatch { widget: KnownWidget; dashboard: KnownDashboard; score: number }
export interface DatasetMatch { dataset: KnownDataset; dashboard: KnownDashboard; score: number }
export interface DashboardMatch { dashboard: KnownDashboard; score: number }

// Command words that would otherwise dilute matching against real names —
// "create a widget for X" should match on X, not get partial credit for
// "widget" appearing in a real widget's own name.
const STOPWORDS = new Set([
  "a", "an", "the", "for", "to", "of", "and", "or", "in", "on", "with", "from",
  "create", "build", "make", "add", "new", "generate", "compose",
  "widget", "widgets", "dashboard", "dashboards", "report", "reports", "dataset", "datasets", "chart",
  "i", "want", "need", "please", "me", "this", "that", "by", "some", "get", "show",
]);

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
}

// Exact/substring match scores highest (handles "create a widget for Problem
// by severity" containing the real name "Problem by severity" verbatim);
// falls back to significant-word overlap for paraphrased asks (e.g. "Purchase
// by category or type" doesn't literally match the widget name "Purchases",
// but does overlap heavily with its dataset name "Purchase by type and
// category procurement").
function score(query: string, candidate: string | null | undefined): number {
  if (!candidate) return 0;
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (q.includes(c) || c.includes(q)) return 80;
  const qw = new Set(words(query));
  const cw = words(candidate);
  if (qw.size === 0 || cw.length === 0) return 0;
  let overlap = 0;
  for (const w of cw) if (qw.has(w)) overlap++;
  return Math.round((overlap / cw.length) * 60);
}

const MATCH_THRESHOLD = 30;

export function searchWidgets(query: string, limit = 3): WidgetMatch[] {
  const results: WidgetMatch[] = [];
  for (const dashboard of PLATFORM_DASHBOARDS) {
    for (const widget of dashboard.widgets) {
      const s = Math.max(
        score(query, widget.name),
        score(query, widget.datasetName) * 0.8,
        score(query, widget.description) * 0.5,
      );
      if (s >= MATCH_THRESHOLD) results.push({ widget, dashboard, score: s });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function searchDatasets(query: string, limit = 3): DatasetMatch[] {
  const results: DatasetMatch[] = [];
  for (const dashboard of PLATFORM_DASHBOARDS) {
    for (const dataset of dashboard.datasets) {
      const s = Math.max(score(query, dataset.name), score(query, dataset.description) * 0.6);
      if (s >= MATCH_THRESHOLD) results.push({ dataset, dashboard, score: s });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function searchDashboards(query: string, limit = 3): DashboardMatch[] {
  const results: DashboardMatch[] = [];
  for (const dashboard of PLATFORM_DASHBOARDS) {
    const s = Math.max(
      score(query, dashboard.name),
      score(query, dashboard.title),
      score(query, dashboard.description) * 0.5,
    );
    if (s >= MATCH_THRESHOLD) results.push({ dashboard, score: s });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
