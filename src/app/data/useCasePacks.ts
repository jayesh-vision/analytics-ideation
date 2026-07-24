// Board-demo "use-case packs" — two fully-staged demo storylines (Solstice
// Energy EV charging, Vertex Telecom fiber) driven by the user's own demo
// scripts. Each pack seeds one consolidated dashboard (KPIs + zone heatmap +
// overview charts) and a chain of scripted board questions; the dashboard's
// AI Assistant chat answers each question with a "Matched from your
// platform" panel, a chart, and a grounded narrative — chaining CRM → STM/
// OMS → Field Ops, exactly per the scripts.
//
// Solstice data is verbatim from CRM_EV.md / STM_EV.md / FFM_EV.md.
// Vertex data is reconstructed from telecom-bi-demo-script-v2.md's own
// "Data pulled" lines (the CRM.md/OMS.md/FFM.md source files were not
// provided) — values flagged for user review.

export interface PackKpi {
  label: string;
  value: string;
  sub?: string;
  subTone?: "is-positive" | "is-negative";
}

export interface PackHeatCell { region: string; value: string; tone: "good" | "bad" }

export type PackChart =
  | { kind: "bar" | "barh"; bars: { label: string; value: number; color: string }[] }
  | { kind: "donut"; segments: { label: string; value: number; color: string }[] }
  | { kind: "line"; series: { name: string; color: string; values: (number | null)[]; dashed?: boolean }[]; labels: string[] };

export interface PackStep {
  id: string;
  question: string;             // canonical phrasing — doubles as the suggestion chip
  patterns: RegExp[];           // tolerant paraphrase matching
  matched: { widget: string; type: string; dataset: string; source: string; preview?: boolean };
  chart: PackChart;
  narrative: string;            // the scripted AI response, verbatim
}

export interface UseCasePack {
  key: string;
  company: string;
  dashboardName: string;        // must equal the DASHBOARD_LIST row name
  dashboardSubtitle: string;
  alert: { sev: "Critical"; area: string; title: string };
  kpis: PackKpi[];
  heatmap: { title: string; subtitle: string; cells: PackHeatCell[] };
  overviewCharts: { title: string; subtitle: string; chart: PackChart }[];
  steps: PackStep[];
}

const BLUE = "var(--vw-color-blue-500)";
const GREEN = "var(--vw-color-emerald-500)";
const AMBER = "var(--vw-color-amber-500)";
const PURPLE = "var(--vw-color-purple-500)";
const RED = "var(--vw-color-red-500)";

// --- Solstice Energy (EV charging & solar O&M) -----------------------------

const SOLSTICE: UseCasePack = {
  key: "solstice-ev",
  company: "Solstice Energy",
  dashboardName: "Solstice Energy network performance",
  dashboardSubtitle: "Consolidated EV charging network performance · Q2 FY25-26",
  alert: { sev: "Critical", area: "Dashboard", title: "West Zone charging utilization dropped to 74% (target 96%)" },
  kpis: [
    { label: "Charging utilization", value: "89%", sub: "West 74% · target 96%", subTone: "is-negative" },
    { label: "Subscriber churn", value: "1.8%", sub: "2 churn events · West Zone", subTone: "is-negative" },
    { label: "Station uptime", value: "97.2%", sub: "+0.4% vs Q1", subTone: "is-positive" },
    { label: "Active subscribers", value: "12,840", sub: "+320 this quarter", subTone: "is-positive" },
  ],
  heatmap: {
    title: "Zone health",
    subtitle: "Charging utilization by zone — Q2 FY25-26",
    cells: [
      { region: "North", value: "96%", tone: "good" },
      { region: "South", value: "97%", tone: "good" },
      { region: "East", value: "95%", tone: "good" },
      { region: "West", value: "74%", tone: "bad" },
      { region: "Central", value: "96%", tone: "good" },
    ],
  },
  overviewCharts: [
    {
      title: "Utilization by zone",
      subtitle: "Charging utilization % · Q2 FY25-26",
      chart: { kind: "bar", bars: [
        { label: "North", value: 96, color: GREEN },
        { label: "South", value: 97, color: GREEN },
        { label: "East", value: 95, color: GREEN },
        { label: "West", value: 74, color: RED },
        { label: "Central", value: 96, color: GREEN },
      ] },
    },
    {
      title: "Average NPS by zone",
      subtitle: "Subscriber NPS from CRM · Q2 FY25-26",
      chart: { kind: "bar", bars: [
        { label: "North", value: 7, color: BLUE },
        { label: "South", value: 8, color: BLUE },
        { label: "East", value: 8.5, color: BLUE },
        { label: "West", value: 4.8, color: RED },
        { label: "Central", value: 7, color: BLUE },
      ] },
    },
  ],
  steps: [
    {
      id: "churn",
      question: "Why did West Zone drop this quarter?",
      patterns: [/why.*west/i, /west.*(drop|down|fell|decline)/i, /(drop|decline|dip).*(west|zone)/i],
      matched: {
        widget: "West Zone — Churn & NPS",
        type: "Bar chart",
        dataset: "CRM_EV.md — Region=West, Quarter=Q2 FY25-26",
        source: "Consolidated dashboard",
      },
      chart: { kind: "bar", bars: [
        { label: "SUB-WES-021", value: 3, color: RED },
        { label: "SUB-WES-024", value: 2, color: RED },
        { label: "SUB-WES-027", value: 6, color: AMBER },
        { label: "SUB-WES-029", value: 8, color: GREEN },
      ] },
      narrative:
        "West Zone recorded 2 subscriber churn events in Q2, both linked to charging downtime complaints. One additional complaint (billing) is unrelated and did not result in churn.",
    },
    {
      id: "downtime",
      question: "What's driving that downtime?",
      patterns: [/downtime/i, /driv.*(that|the|this)/i, /(what|why).*(behind|causing)/i],
      matched: {
        widget: "West Zone — Ticket SLA breach",
        type: "Bar chart (horizontal)",
        dataset: "STM_EV.md — SLA_Status=Breached, joined on Subscriber_ID",
        source: "Service Ticket Management",
      },
      chart: { kind: "barh", bars: [
        { label: "TKT-WES-3305", value: 11, color: RED },
        { label: "TKT-WES-3301", value: 9, color: RED },
        { label: "Other zones (norm)", value: 2, color: GREEN },
      ] },
      narrative:
        "Both churned subscribers had SLA-breached repair tickets — 9 to 11 day resolution delays against a 1–2 day norm elsewhere.",
    },
    {
      id: "rootcause",
      question: "Why were these repairs delayed?",
      patterns: [/why.*(repair|delay)/i, /root\s*cause/i, /repairs?\s+delayed/i],
      matched: {
        widget: "Root cause — West Zone",
        type: "Donut chart",
        dataset: "FFM_EV.md — joined via Ticket_ID",
        source: "Field Ops",
      },
      chart: { kind: "donut", segments: [
        { label: "Connector Spare Part Stock-Out", value: 1, color: AMBER },
        { label: "Grid Outage – DISCOM Dependency", value: 1, color: PURPLE },
      ] },
      narrative:
        "Root cause splits evenly: one repair delayed by a spare connector part stock-out, one by a DISCOM grid outage outside our direct control. Neither is a field execution failure.",
    },
    {
      id: "pattern",
      question: "Is this zone-specific, or a broader pattern?",
      patterns: [/(zone|region).*(specific|only)/i, /broader|pattern|systemic/i, /other zones/i],
      matched: {
        widget: "Utilization by zone",
        type: "Bar chart",
        dataset: "STM_EV.md — all zones, Q2 FY25-26",
        source: "Service Ticket Management",
      },
      chart: { kind: "bar", bars: [
        { label: "North", value: 96, color: GREEN },
        { label: "South", value: 97, color: GREEN },
        { label: "East", value: 95, color: GREEN },
        { label: "West", value: 74, color: RED },
        { label: "Central", value: 96, color: GREEN },
      ] },
      narrative: "West is the only zone with SLA breaches this quarter. Isolated, not systemic.",
    },
    {
      id: "outlook",
      question: "What's the recovery outlook?",
      patterns: [/outlook|forecast|recovery/i, /next quarter/i, /\bq3\b/i],
      matched: {
        widget: "West Zone — Recovery outlook",
        type: "Line chart (projection)",
        dataset: "Forecast model — no live dataset",
        source: "Forecast agent",
        preview: true,
      },
      chart: {
        kind: "line",
        labels: ["Q1", "Q2", "Q3 (proj)", "Q4 (proj)"],
        series: [
          { name: "Actual", color: BLUE, values: [95, 74, null, null] },
          { name: "Projected", color: AMBER, values: [null, 74, 88, 95], dashed: true },
        ],
      },
      narrative:
        "Projected recovery pending Q3 spare-parts restock and grid stability. [Preview — model not yet in production]",
    },
  ],
};

// --- Vertex Telecom (EV/Fiber sales) ---------------------------------------
// Rows reconstructed from telecom-bi-demo-script-v2.md — review before recording.

const VERTEX: UseCasePack = {
  key: "vertex-telecom",
  company: "Vertex Telecom",
  dashboardName: "Vertex Telecom consolidated performance",
  dashboardSubtitle: "EV/Fiber consolidated performance · Q2 FY25-26",
  alert: { sev: "Critical", area: "Dashboard", title: "North Circle SLA compliance dropped to 72% (target 97%)" },
  kpis: [
    { label: "Net adds (FTTH)", value: "1,284", sub: "+8.2% vs Q1", subTone: "is-positive" },
    { label: "Churn", value: "2.1%", sub: "3 churn events · North Circle", subTone: "is-negative" },
    { label: "SLA compliance", value: "92%", sub: "North 72% · target 97%", subTone: "is-negative" },
    { label: "Active connections", value: "48,300", sub: "+1,284 this quarter", subTone: "is-positive" },
  ],
  heatmap: {
    title: "Circle health",
    subtitle: "SLA compliance by circle — Q2 FY25-26",
    cells: [
      { region: "North", value: "72%", tone: "bad" },
      { region: "South", value: "97%", tone: "good" },
      { region: "East", value: "98%", tone: "good" },
      { region: "West", value: "97%", tone: "good" },
      { region: "Central", value: "98%", tone: "good" },
    ],
  },
  overviewCharts: [
    {
      title: "SLA compliance by circle",
      subtitle: "Provisioning SLA % · Q2 FY25-26",
      chart: { kind: "bar", bars: [
        { label: "North", value: 72, color: RED },
        { label: "South", value: 97, color: GREEN },
        { label: "East", value: 98, color: GREEN },
        { label: "West", value: 97, color: GREEN },
        { label: "Central", value: 98, color: GREEN },
      ] },
    },
    {
      title: "Net adds by circle",
      subtitle: "New FTTH connections · Q2 FY25-26",
      chart: { kind: "bar", bars: [
        { label: "North", value: 210, color: BLUE },
        { label: "South", value: 290, color: BLUE },
        { label: "East", value: 265, color: BLUE },
        { label: "West", value: 305, color: BLUE },
        { label: "Central", value: 214, color: BLUE },
      ] },
    },
  ],
  steps: [
    {
      id: "churn",
      question: "Why did North Circle's numbers drop this quarter?",
      patterns: [/why.*north/i, /north.*(drop|down|numbers|decline)/i, /(drop|decline|dip).*(north|circle)/i],
      matched: {
        widget: "North Circle — Churn & NPS",
        type: "Bar chart",
        dataset: "CRM.md — Region=North, Quarter=Q2 FY25-26",
        source: "Consolidated dashboard",
      },
      chart: { kind: "bar", bars: [
        { label: "CUST-NOR-011", value: 2, color: RED },
        { label: "CUST-NOR-014", value: 4, color: RED },
        { label: "CUST-NOR-022", value: 3, color: RED },
        { label: "CUST-NOR-019", value: 8, color: GREEN },
      ] },
      narrative:
        "North Circle recorded 3 churn events in Q2, all linked to service or installation delay complaints.",
    },
    {
      id: "delay",
      question: "What's driving that delay?",
      patterns: [/driv.*(delay|that|the)/i, /(what|why).*(behind|causing)/i, /sla.*breach/i],
      matched: {
        widget: "North Circle — SLA breach",
        type: "Bar chart (horizontal)",
        dataset: "OMS.md — SLA_Status=Breached, joined on Customer_ID",
        source: "Order Management",
      },
      chart: { kind: "barh", bars: [
        { label: "ORD-NOR-1042", value: 18, color: RED },
        { label: "ORD-NOR-1038", value: 16, color: RED },
        { label: "ORD-NOR-1047", value: 12, color: RED },
        { label: "Other circles (norm)", value: 2, color: GREEN },
      ] },
      narrative:
        "All three churned customers had SLA-breached orders — 12 to 18 day provisioning delays against a 1–3 day norm elsewhere.",
    },
    {
      id: "rootcause",
      question: "Why were these installations delayed?",
      patterns: [/why.*(install|delay)/i, /root\s*cause/i, /installations?\s+delayed/i],
      matched: {
        widget: "Root cause — North Circle",
        type: "Donut chart",
        dataset: "FFM.md — joined via Order_ID",
        source: "Field Force",
      },
      chart: { kind: "donut", segments: [
        { label: "ONU Stock-Out", value: 2, color: AMBER },
        { label: "Technician Shortage", value: 1, color: PURPLE },
      ] },
      narrative:
        "Root cause: ONU stock-out on 2 of 3 orders, technician shortage on the third — an upstream supply issue, not a field execution failure.",
    },
    {
      id: "pattern",
      question: "Is this a North-only issue, or a broader pattern?",
      patterns: [/(north|circle).*(only|specific)/i, /broader|pattern|systemic/i, /other circles/i],
      matched: {
        widget: "SLA compliance by circle",
        type: "Bar chart",
        dataset: "OMS.md — all circles, Q2 FY25-26",
        source: "Order Management",
      },
      chart: { kind: "bar", bars: [
        { label: "North", value: 72, color: RED },
        { label: "South", value: 97, color: GREEN },
        { label: "East", value: 98, color: GREEN },
        { label: "West", value: 97, color: GREEN },
        { label: "Central", value: 98, color: GREEN },
      ] },
      narrative: "North is the only circle with SLA breaches this quarter. Isolated, not systemic.",
    },
    {
      id: "outlook",
      question: "What's the outlook for next quarter?",
      patterns: [/outlook|forecast|recovery/i, /next quarter/i, /\bq3\b/i],
      matched: {
        widget: "North Circle — Recovery outlook",
        type: "Line chart (projection)",
        dataset: "Forecast model — no live dataset",
        source: "Forecast agent",
        preview: true,
      },
      chart: {
        kind: "line",
        labels: ["Q1", "Q2", "Q3 (proj)", "Q4 (proj)"],
        series: [
          { name: "Actual", color: BLUE, values: [96, 72, null, null] },
          { name: "Projected", color: AMBER, values: [null, 72, 88, 95], dashed: true },
        ],
      },
      narrative: "Projected recovery pending Q3 actuals. [Preview — model not yet in production]",
    },
  ],
};

export const USE_CASE_PACKS: UseCasePack[] = [SOLSTICE, VERTEX];

export function findPackByDashboard(name: string): UseCasePack | null {
  return USE_CASE_PACKS.find((p) => p.dashboardName === name) ?? null;
}

// Matches the message against the pack's steps — unanswered steps first (in
// script order) so repeated similar phrasings advance the chain, answered
// steps still re-matchable afterwards.
export function answerBoardQuestion(pack: UseCasePack, text: string, answeredIds: string[]): PackStep | null {
  const unanswered = pack.steps.filter((s) => !answeredIds.includes(s.id));
  const answered = pack.steps.filter((s) => answeredIds.includes(s.id));
  for (const step of [...unanswered, ...answered]) {
    if (step.patterns.some((p) => p.test(text))) return step;
  }
  return null;
}

export function nextBoardQuestion(pack: UseCasePack, answeredIds: string[]): string | null {
  const next = pack.steps.find((s) => !answeredIds.includes(s.id));
  return next ? next.question : null;
}
