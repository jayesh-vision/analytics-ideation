import { useState } from "react";
import type { LucideIcon } from "../icons";
import {
  Sparkles, FileText, Compass, BookOpen, X, Check, ArrowRight, AlertTriangle,
  ChevronDown, ListChecks, BarChart2, Eye, Table2, LayoutGrid, Scale,
} from "../icons";
import { type Tone } from "./personas";

// In-app Agent Guide — customer-facing documentation for the BI agents.
interface Doc {
  key: string; name: string; icon: LucideIcon; tone: Tone; verb: string; group: string;
  definition: string; does: string;
  whenToUse: string[];
  howTo: { step: string; desc: string }[];
  example: { ask: string; then: string[] };
  owns: string; notThis: string;
  stats: [string, string][]; alert: string;
  // Optional — for agents whose output needs decoding before it can be trusted.
  reading?: { label: string; desc: string }[];
  caveat?: { title: string; body: string };
}

const DOCS: Doc[] = [
  {
    key: "dataset", name: "Dataset Creator", icon: Table2, tone: "blue", verb: "Shape", group: "Ask",
    definition: "Turns catalog data into a governed, reusable dataset.",
    does: "Joins tables from the catalog, applies filters and calculated fields, and validates the result against governance rules — producing a dataset other agents and dashboards can build on.",
    whenToUse: [
      "You need a clean, reusable slice of data for a widget or report.",
      "Several dashboards need the same joined data — build it once.",
      "Raw catalog tables need filtering, renaming or calculated fields before use.",
    ],
    howTo: [
      { step: "Describe the data", desc: "Pick the application, datasource and dataset to start from." },
      { step: "It proposes a shape", desc: "Joins, filters and calculated fields, with a preview." },
      { step: "Review the result grid", desc: "Check the live sample rows before saving." },
      { step: "Submit for approval", desc: "Governed datasets go through approval before others can use them." },
    ],
    example: { ask: "Build a Customer 360 dataset from CRM and Core Banking.", then: [
      "Joins Accounts, Contacts and Support tickets on customer ID.",
      "Adds a calculated lifetime-value column and previews the result grid.",
      "Submits for approval so Widget Builder and Report Generator can reuse it.",
    ] },
    owns: "Creating and governing reusable datasets.", notThis: "It doesn't visualize the data (Widget Builder) or arrange it into a dashboard (Dashboard Composer).",
    stats: [["Datasets", "12"], ["Avg rows", "48K"], ["Approved", "83%"]], alert: "3 datasets awaiting approval",
  },
  {
    key: "widget", name: "Widget Builder", icon: BarChart2, tone: "teal", verb: "Visualize", group: "Ask",
    definition: "Turns a dataset and a plain-language description into a chart, KPI or table widget.",
    does: "Picks the right visualization for the question, binds it to a governed dataset, and configures axes, aggregation and formatting automatically.",
    whenToUse: [
      "You want a single chart, KPI tile or table without building a whole dashboard.",
      "A metric needs a specific visualization — bar, line, KPI or table.",
      "You're assembling widgets to later compose into a dashboard.",
    ],
    howTo: [
      { step: "Pick a dataset", desc: "Choose the governed dataset the widget reads from." },
      { step: "Describe the widget", desc: "\"Bar chart of revenue by region\" — in plain language." },
      { step: "It proposes a chart", desc: "Chooses type, axes and aggregation, with a live preview." },
      { step: "Submit for approval", desc: "Approved widgets become available to Dashboard Composer." },
    ],
    example: { ask: "Build a bar chart of monthly revenue by product line.", then: [
      "Binds to the Revenue dataset and groups by product line.",
      "Proposes a bar chart with a 6-month trailing window.",
      "Submits for approval so it can be added to a dashboard.",
    ] },
    owns: "Building a single visualization from a dataset.", notThis: "It doesn't create the underlying dataset (Dataset Creator) or arrange widgets into a page (Dashboard Composer).",
    stats: [["Widgets", "12"], ["Types", "4"], ["On dashboards", "9"]], alert: "2 widgets not yet used on any dashboard",
  },
  {
    key: "dashboard", name: "Dashboard Composer", icon: LayoutGrid, tone: "purple", verb: "Compose", group: "Ask",
    definition: "Arranges widgets into a gridded, shareable dashboard.",
    does: "Lays out existing widgets (or builds new ones inline) into a responsive grid, and manages access, scheduling and approval for the finished dashboard.",
    whenToUse: [
      "Several widgets need to live together on one page.",
      "You're standing up a new reporting view for a team or module.",
      "An existing dashboard needs new widgets added or rearranged.",
    ],
    howTo: [
      { step: "Pick application & data", desc: "Application → datasource → dataset drives what's available." },
      { step: "Describe the dashboard", desc: "What it should show, in plain language." },
      { step: "It composes the grid", desc: "Arranges KPI tiles and charts, with a live preview." },
      { step: "Submit for approval", desc: "Approved dashboards are shared and become sources for reports." },
    ],
    example: { ask: "Compose a network operations dashboard from device health and alarms.", then: [
      "Pulls in the widgets built on Device health and Alarm events.",
      "Arranges KPI tiles, a trend chart and an alarms table into a grid.",
      "Submits for approval so it can feed a scheduled report.",
    ] },
    owns: "Arranging widgets into a finished dashboard.", notThis: "It doesn't build the individual widgets (Widget Builder) or compile the narrative writeup (Report Generator).",
    stats: [["Dashboards", "12"], ["Avg widgets", "6"], ["Shared", "9"]], alert: "4 dashboards awaiting approval",
  },
  {
    key: "report", name: "Report Generator", icon: FileText, tone: "amber", verb: "Compile", group: "Ask",
    definition: "Compiles live dashboards into a scheduled, narrative report.",
    does: "Pulls current numbers from one or more dashboards, writes a plain-language summary alongside the supporting tables, and delivers it on a recurring schedule.",
    whenToUse: [
      "Stakeholders need a written summary, not a dashboard to explore.",
      "A report should go out on a recurring cadence (weekly, monthly, quarterly).",
      "Several dashboards need to be rolled up into one document.",
    ],
    howTo: [
      { step: "Pick source dashboards", desc: "One or more dashboards to compile from." },
      { step: "Describe the report", desc: "Audience and focus, in plain language." },
      { step: "It drafts the narrative", desc: "Summary text, sections and an SLA table, with a live preview." },
      { step: "Set the schedule & submit", desc: "Recurring delivery, then approval." },
    ],
    example: { ask: "Generate a weekly incident review from the network dashboards.", then: [
      "Pulls current numbers from the Network fault trends by region dashboard.",
      "Drafts a narrative summary plus an SLA compliance table.",
      "Schedules weekly delivery and submits for approval.",
    ] },
    owns: "Compiling dashboards into a scheduled narrative document.", notThis: "It doesn't build dashboards itself (Dashboard Composer) — it only reads from ones that already exist.",
    stats: [["Reports", "12"], ["Recurring", "8"], ["Source dashboards", "9"]], alert: "1 report overdue for delivery",
  },
];

// On-page synopsis: a dockable right-side panel (non-modal). The user hides it via Close.
export function AgentDocPanel({ agentKey, onClose }: { agentKey: string; onClose: () => void }) {
  const doc = DOCS.find((d) => d.key === agentKey);
  if (!doc) return null;
  return (
    <aside className="flex h-full w-full max-w-[420px] flex-shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-3">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>How to use</span>
        <span className="truncate text-muted-foreground" style={{ fontSize: "12px" }}>· {doc.name.replace(" Agent", "")}</span>
        <button onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded-[8px] border border-border text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6"><DocPane doc={doc} /></div>
    </aside>
  );
}

function DocPane({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ overview: true, when: true, how: true, reading: true, example: true, boundary: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const SEC = (key: string, SIcon: LucideIcon, title: string, subtitle: string, body: React.ReactNode) => (
    <div className="overflow-hidden rounded-[10px] border border-border bg-card">
      <button onClick={() => toggle(key)} className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/20">
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[7px] bg-primary/10"><SIcon className="h-3.5 w-3.5 text-primary" /></div>
        <div className="min-w-0 flex-1"><div className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>{title}</div><div className="text-muted-foreground" style={{ fontSize: "11.5px" }}>{subtitle}</div></div>
        <ChevronDown className={`mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${open[key] ? "rotate-180" : ""}`} />
      </button>
      {open[key] && <div className="border-t border-border px-3.5 py-3">{body}</div>}
    </div>
  );
  return (
    <div className="space-y-2.5">
      {SEC("overview", BookOpen, "Overview", "What this agent is", (
        <p className="text-foreground" style={{ fontSize: "12.5px", lineHeight: 1.55 }}>{doc.definition} {doc.does}</p>
      ))}
      {SEC("when", Compass, "When to use", "Where it fits", (
        <ul className="space-y-1.5">{doc.whenToUse.map((w) => (
          <li key={w} className="flex gap-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}><span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" /><span className="text-foreground">{w}</span></li>
        ))}</ul>
      ))}
      {SEC("how", ListChecks, "How to use", "Step by step", (
        <ol className="space-y-2">{doc.howTo.map((s, i) => (
          <li key={i} className="flex gap-2.5"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white" style={{ fontSize: "10.5px", fontWeight: 700 }}>{i + 1}</span><span style={{ fontSize: "12.5px", lineHeight: 1.5 }}><b className="text-foreground">{s.step}.</b> <span className="text-muted-foreground">{s.desc}</span></span></li>
        ))}</ol>
      ))}
      {doc.reading && SEC("reading", Eye, "Reading the result", "What each number means before you act on it", (
        <ul className="space-y-2.5">{doc.reading.map((r) => (
          <li key={r.label} style={{ fontSize: "12.5px", lineHeight: 1.55 }}>
            <div className="text-foreground" style={{ fontWeight: 600 }}>{r.label}</div>
            <div className="text-muted-foreground">{r.desc}</div>
          </li>
        ))}</ul>
      ))}
      {doc.caveat && (
        <div className="rounded-[10px] border border-[#FFEDD5] bg-[#FFEDD5]/40 px-3.5 py-3">
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C2410C]" />
            <div>
              <div className="text-foreground" style={{ fontSize: "12.5px", fontWeight: 600 }}>{doc.caveat.title}</div>
              <p className="mt-1 text-[#8a4a12]" style={{ fontSize: "12px", lineHeight: 1.55 }}>{doc.caveat.body}</p>
            </div>
          </div>
        </div>
      )}
      {SEC("example", Sparkles, "Example", "A worked run", (
        <div>
          <div className="mb-2 flex justify-end"><div className="max-w-[85%] rounded-[10px] bg-[#eef1f4] px-3 py-1.5 text-foreground" style={{ fontSize: "12.5px" }}>{doc.example.ask}</div></div>
          <div className="space-y-1.5">{doc.example.then.map((t, i) => (
            <div key={i} className="flex gap-2" style={{ fontSize: "12px", lineHeight: 1.5 }}><ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" /><span className="text-foreground">{t}</span></div>
          ))}</div>
        </div>
      ))}
      {SEC("boundary", Scale, "Boundary", "What it owns — and doesn't", (
        <div className="space-y-2">
          <div className="flex gap-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#047857]" /><span className="text-foreground"><b>Owns.</b> {doc.owns}</span></div>
          <div className="flex gap-2" style={{ fontSize: "12.5px", lineHeight: 1.5 }}><X className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B91C1C]" /><span className="text-foreground"><b>Not this.</b> {doc.notThis}</span></div>
        </div>
      ))}
    </div>
  );
}
