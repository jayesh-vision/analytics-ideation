import type { LucideIcon } from "../icons";
import {
  BarChart2, Table2, LayoutGrid, FileText, Sparkles,
  Lightbulb, TrendingUp, Sigma, AlertTriangle,
} from "../icons";

// Which real surface an agent opens. Each build interface is a first-class surface.
export type SurfaceKind = "stub" | "biTasks" | "biExplainer";
export type Tone = "blue" | "teal" | "purple" | "amber" | "pink";

export const TONE: Record<Tone, [string, string]> = {
  blue:   ["#3B9EF6", "#2563EB"],
  teal:   ["#4FD1C5", "#0D9488"],
  purple: ["#A78BFA", "#7C3AED"],
  amber:  ["#FBBF24", "#D97706"],
  pink:   ["#F472B6", "#DB2777"],
};

export interface Agent {
  name: string;
  desc: string;
  cta: string;
  icon: LucideIcon;
  tone: Tone;
  surface: SurfaceKind;
  agentKey?: string;   // selects the BI task kind (dataset/widget/dashboard/report) for BiTasksAgent
}

export interface Persona {
  id: string;
  label: string;
  role: string;
  initials: string;
  icon: LucideIcon;
  headline: string;
  tagline: string;
  agents: Agent[];
}

export const PERSONAS: Persona[] = [
  {
    id: "bi", label: "BI", role: "BI Analyst", initials: "BI", icon: BarChart2,
    headline: "Your business intelligence team",
    tagline: "The agents turn governed datasets into widgets, dashboards, and reports — describe what you need and approve the build.",
    agents: [
      { name: "Dataset Creator", tone: "blue", icon: Table2, surface: "biTasks", agentKey: "dataset", cta: "Build a dataset",
        desc: "Creates governed datasets from the catalog — joined, shaped, and ready to power any widget or dashboard." },
      { name: "Widget Builder", tone: "teal", icon: BarChart2, surface: "biTasks", agentKey: "widget", cta: "Create a widget",
        desc: "Turns a dataset into a chart, KPI, or table widget from a plain-language description — configure once, reuse everywhere." },
      { name: "Dashboard Composer", tone: "purple", icon: LayoutGrid, surface: "biTasks", agentKey: "dashboard", cta: "Build a dashboard",
        desc: "Arranges widgets into a gridded, shareable dashboard and keeps it wired to live data." },
      { name: "Report Generator", tone: "amber", icon: FileText, surface: "biTasks", agentKey: "report", cta: "Generate a report",
        desc: "Compiles dashboards into a scheduled, narrative report — ready to export or send." },
      { name: "Explainer", tone: "pink", icon: Sparkles, surface: "biExplainer", cta: "Explain anything",
        desc: "Explains any dataset, widget, report, or dashboard — the underlying data and query, with runtime filters, layout, and theme you can change on the fly." },
      { name: "Insight Digest", tone: "blue", icon: Lightbulb, surface: "stub", cta: "Read today's digest",
        desc: "Scans every dashboard each morning and writes a plain-language summary of what changed and why — delivered before you open the tab." },
      { name: "Forecast Agent", tone: "teal", icon: TrendingUp, surface: "stub", cta: "Run a forecast",
        desc: "Projects revenue, churn, and capacity forward from historical trends — with confidence bands and a plain-language read on what's driving the number." },
      { name: "Metric Governance Agent", tone: "purple", icon: Sigma, surface: "stub", cta: "Define a metric",
        desc: "Defines shared KPI formulas once — so every widget and dashboard that references “Revenue” or “Churn” calculates it exactly the same way." },
      { name: "Anomaly Watch Agent", tone: "amber", icon: AlertTriangle, surface: "stub", cta: "Review anomalies",
        desc: "Watches every KPI for unusual movement and flags what drifted outside its normal range — before it ever shows up in a report." },
    ],
  },
];

