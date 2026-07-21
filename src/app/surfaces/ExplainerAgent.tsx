import { useState } from "react";
import { Sparkles, Table2, BarChart2, LayoutGrid, FileText, Filter, SlidersHorizontal, Search, Send, X } from "../icons";
import { AgentHeader } from "./agentKit";

// ── The Explainer agent — pick any BI asset, see how it's built, and play ──
// with runtime filters, layout, and theme while the explanation keeps up.

type ItemKind = "dataset" | "widget" | "report" | "dashboard";
type Layout = "auto" | "table" | "bar" | "kpi";
type Theme = "light" | "dim" | "brand";

const KINDS: { key: ItemKind; label: string; icon: typeof Table2 }[] = [
  { key: "dataset", label: "Datasets", icon: Table2 },
  { key: "widget", label: "Widgets", icon: BarChart2 },
  { key: "report", label: "Reports", icon: FileText },
  { key: "dashboard", label: "Dashboards", icon: LayoutGrid },
];

const APPLICATIONS = ["All applications", "FIELD-FORCE-MGMT", "FIBERNEO", "ANALYTICS"];

type ItemStatus = "Approved" | "Draft" | "Running" | "Queued" | "Failed" | "Awaiting approval";
const STATUS_COLOR: Record<ItemStatus, { dot: string; bg: string; fg: string }> = {
  Approved: { dot: "#16A34A", bg: "#DCFCE7", fg: "#15803D" },
  Draft: { dot: "#94A3B8", bg: "#F1F5F9", fg: "#475569" },
  Running: { dot: "#2563EB", bg: "#DBEAFE", fg: "#1D4ED8" },
  Queued: { dot: "#D97706", bg: "#FEF3C7", fg: "#B45309" },
  Failed: { dot: "#DC2626", bg: "#FEE2E2", fg: "#B91C1C" },
  "Awaiting approval": { dot: "#EA580C", bg: "#FFEDD5", fg: "#C2410C" },
};

type ExplainItem = { name: string; desc: string; status: ItemStatus; app: string };
const ITEMS: Record<ItemKind, ExplainItem[]> = {
  dataset: [
    { name: "Customer 360 dataset", desc: "Unified customer profile joined from CRM and billing.", status: "Approved", app: "FIBERNEO" },
    { name: "Churn feature dataset", desc: "Engineered churn-risk features for the retention model.", status: "Running", app: "ANALYTICS" },
    { name: "Field crew roster dataset", desc: "Active crew assignments with shift and region.", status: "Queued", app: "FIELD-FORCE-MGMT" },
    { name: "Claims fraud dataset", desc: "Claims flagged by the fraud scoring pipeline.", status: "Failed", app: "ANALYTICS" },
  ],
  widget: [
    { name: "Revenue trend widget", desc: "Weekly revenue as a bar chart, split by segment.", status: "Draft", app: "ANALYTICS" },
    { name: "Network fault KPI widget", desc: "Open network faults as a single live KPI.", status: "Running", app: "FIBERNEO" },
    { name: "Field crew utilization widget", desc: "Crew utilization percentage by region.", status: "Queued", app: "FIELD-FORCE-MGMT" },
    { name: "Customer churn widget", desc: "Monthly churn rate with threshold alerts.", status: "Failed", app: "ANALYTICS" },
  ],
  report: [
    { name: "Monthly SLA compliance report", desc: "Narrative SLA compliance with a metric summary table.", status: "Approved", app: "ANALYTICS" },
    { name: "Monthly compliance report", desc: "Regulatory compliance evidence for the month.", status: "Running", app: "ANALYTICS" },
    { name: "Weekly incident report", desc: "Open problems by severity for the field force team.", status: "Failed", app: "ANALYTICS" },
  ],
  dashboard: [
    { name: "Network fault trends by region", desc: "Fault volume and trend tiles per region.", status: "Awaiting approval", app: "FIBERNEO" },
    { name: "Field crew utilization dashboard", desc: "Utilization, incidents, and coverage in one grid.", status: "Queued", app: "FIELD-FORCE-MGMT" },
  ],
};

const SEGMENTS = ["All segments", "Enterprise", "Mid-market", "SMB"];
const RANGES = ["Last 2 days", "Last 7 days", "Last 30 days"];
const LAYOUTS: { key: Layout; label: string }[] = [
  { key: "auto", label: "As designed" },
  { key: "table", label: "Table" },
  { key: "bar", label: "Bar chart" },
  { key: "kpi", label: "KPI" },
];
const THEMES: { key: Theme; label: string; swatch: string }[] = [
  { key: "light", label: "Light", swatch: "#FFFFFF" },
  { key: "dim", label: "Dim", swatch: "#0B1020" },
  { key: "brand", label: "Brand", swatch: "#2563EB" },
];

const ROWS = [
  { id: "10231", segment: "Enterprise", value: 48210, updated: "2026-07-15", age: 0 },
  { id: "10232", segment: "Mid-market", value: 12904, updated: "2026-07-15", age: 0 },
  { id: "10233", segment: "SMB", value: 3118, updated: "2026-07-14", age: 1 },
  { id: "10234", segment: "Enterprise", value: 61775, updated: "2026-07-14", age: 1 },
  { id: "10235", segment: "SMB", value: 5240, updated: "2026-07-10", age: 5 },
  { id: "10236", segment: "Mid-market", value: 18730, updated: "2026-06-28", age: 17 },
];

function tableFor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const KIND_NOUN: Record<ItemKind, string> = { dataset: "dataset", widget: "widget", report: "report", dashboard: "dashboard" };
const AUTO_LAYOUT: Record<ItemKind, Layout> = { dataset: "table", widget: "bar", report: "table", dashboard: "bar" };
// Default layout selection per kind: visuals open "As designed", tabular kinds open on "Table".
const DEFAULT_LAYOUT: Record<ItemKind, Layout> = { dataset: "table", widget: "auto", report: "table", dashboard: "auto" };

function OptionRow({ label, options, value, onChange, disabled }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className={`mb-3 ${disabled ? "opacity-40" : ""}`}>
      <div className="mb-1.5 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            disabled={disabled}
            onClick={() => onChange(o)}
            className={`rounded-full border px-2.5 py-1 transition-colors ${disabled ? "cursor-not-allowed border-border text-foreground" : o === value ? "border-primary/50 bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted/40"}`}
            style={{ fontSize: "11.5px", fontWeight: 600 }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExplainerAgent() {
  const [app, setApp] = useState(APPLICATIONS[0]);
  const [kind, setKind] = useState<ItemKind>("dataset");
  const [query2, setQuery2] = useState("");
  const [item, setItem] = useState(ITEMS.dataset[0].name);
  const [segment, setSegment] = useState(SEGMENTS[0]);
  const [range, setRange] = useState(RANGES[0]);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT.dataset);
  const [theme, setTheme] = useState<Theme>("light");
  const [customizeView, setCustomizeView] = useState(false);
  const toggleCustomize = (on: boolean) => {
    setCustomizeView(on);
    if (!on) { setLayout(DEFAULT_LAYOUT[kind]); setTheme("light"); }
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<{ id: number; role: "assistant" | "user"; text: string }[]>([]);

  const visibleItems = ITEMS[kind].filter(
    (i) =>
      (app === "All applications" || i.app === app) &&
      i.name.toLowerCase().includes(query2.trim().toLowerCase()),
  );
  const selected = visibleItems.find((i) => i.name === item) ?? visibleItems[0] ?? null;

  const pickKind = (k: ItemKind) => { setKind(k); setItem(ITEMS[k][0]?.name ?? ""); setQuery2(""); setLayout(DEFAULT_LAYOUT[k]); };
  const pickApp = (a: string) => { setApp(a); };

  const maxAge = range === "Last 2 days" ? 1 : range === "Last 7 days" ? 6 : 29;
  const rows = ROWS.filter((r) => (segment === "All segments" || r.segment === segment) && r.age <= maxAge);
  // A dashboard's designed layout is a grid of several widgets, not a single visual.
  const isDashGrid = kind === "dashboard" && layout === "auto";
  const effLayout: Layout = layout === "auto" ? AUTO_LAYOUT[kind] : layout;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const topRow = rows.slice().sort((a, b) => b.value - a.value)[0];
  const bySegment = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => { acc[r.segment] = (acc[r.segment] ?? 0) + r.value; return acc; }, {}),
  );
  const maxSegTotal = Math.max(1, ...bySegment.map(([, v]) => v));
  const maxRowValue = Math.max(1, ...rows.map((r) => r.value));

  const itemName = selected?.name ?? "";
  const query = [
    "SELECT id, segment, value, updated_at",
    `FROM ${tableFor(itemName || "no_selection")}`,
    `WHERE updated_at >= current_date - interval '${maxAge + 1} days'`,
    segment !== "All segments" ? `  AND segment = '${segment}'` : null,
    "ORDER BY value DESC",
  ].filter(Boolean).join("\n");

  // Theme-dependent preview styling
  const previewBg = theme === "dim" ? "#0B1020" : theme === "brand" ? "#EFF6FF" : "#FFFFFF";
  const previewFg = theme === "dim" ? "#E5EAF5" : "#111827";
  const previewMuted = theme === "dim" ? "#8B93A7" : "#6B7280";
  const barColor = theme === "dim" ? "#60A5FA" : theme === "brand" ? "#2563EB" : "#5B9CF8";
  const rowBorder = theme === "dim" ? "#1E2A45" : "#E5E7EB";

  const explanation = [
    `"${itemName}" is a governed ${KIND_NOUN[kind]} in ${selected?.app ?? "—"} (status: ${selected?.status ?? "—"}), built on the table ${tableFor(itemName || "no_selection")} in Warehouse (Snowflake).`,
    `Right now it shows ${rows.length} of ${ROWS.length} underlying rows — ${segment === "All segments" ? "every segment" : `only the ${segment} segment`}, restricted to the ${range.toLowerCase()}.`,
    rows.length > 0
      ? `The filtered slice totals ${total.toLocaleString()} in value${topRow ? `, led by record ${topRow.id} (${topRow.segment}) at ${topRow.value.toLocaleString()}` : ""}.`
      : `No rows survive the current filters — widen the date range or clear the segment filter to see data.`,
    `It is rendered as ${isDashGrid ? "a 4-widget dashboard grid (its designed layout)" : effLayout === "kpi" ? "a single KPI" : `a ${effLayout}${layout === "auto" ? " (its designed layout)" : ""}`} in the ${theme} theme. Every control here is a runtime view — the underlying ${KIND_NOUN[kind]} and its governed query are unchanged.`,
  ].join(" ");

  const openChat = () => {
    setChatOpen(true);
    setChat((c) => (c.length ? c : [{ id: 1, role: "assistant", text: `Hi! Let's dig into "${itemName}". ${explanation} What would you like to know?` }]));
  };
  const sendChat = () => {
    const q = chatInput.trim();
    if (!q) return;
    setChatInput("");
    setChat((c) => [...c, { id: c.length + 1, role: "user", text: q }]);
    const reply = `Looking at "${itemName}" (${segment.toLowerCase()}, ${range.toLowerCase()}): the current slice has ${rows.length} rows totalling ${total.toLocaleString()}${topRow ? `, led by record ${topRow.id} (${topRow.segment}) at ${topRow.value.toLocaleString()}` : ""}. Adjust a runtime filter, layout, or theme on the left and I'll re-explain what you see.`;
    setTimeout(() => setChat((c) => [...c, { id: c.length + 1, role: "assistant", text: reply }]), 600);
  };

  return (
    <div className="flex h-full flex-col">
      <AgentHeader
        icon={Sparkles}
        title="Explainer"
        subtitle="Understand any dataset, widget, report, or dashboard — data, filters, layout, and theme"
      />
      <div className="flex min-h-0 flex-1">
        {/* Left — collapses to a slim rail while the AI chat is open */}
        {chatOpen ? (
          <div className="flex w-11 flex-shrink-0 flex-col items-center border-r border-border bg-[#FCFCFD] py-3">
            <button
              onClick={() => setChatOpen(false)}
              title="Show controls"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        ) : (
        <div className="w-[300px] flex-shrink-0 overflow-y-auto border-r border-border bg-[#FCFCFD] px-4 py-4">
          <div className="mb-1.5 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Application</div>
          <select
            value={app}
            onChange={(e) => pickApp(e.target.value)}
            className="mb-3 w-full rounded-[9px] border border-border bg-card px-2.5 py-2 text-foreground outline-none"
            style={{ fontSize: "12px", fontWeight: 600 }}
          >
            {APPLICATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="mb-1.5 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Explain a…</div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {KINDS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => pickKind(key)}
                className={`flex items-center gap-1.5 rounded-[9px] border px-2.5 py-2 ${key === kind ? "border-primary/50 bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:bg-muted/40"}`}
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query2}
              onChange={(e) => setQuery2(e.target.value)}
              placeholder={`Search ${KIND_NOUN[kind]}s…`}
              className="w-full rounded-[9px] border border-border bg-card py-2 pl-8 pr-2.5 text-foreground outline-none placeholder:text-muted-foreground"
              style={{ fontSize: "12px" }}
            />
          </div>

          <div className="mb-4 space-y-1.5">
            {visibleItems.length === 0 ? (
              <p className="px-1 py-2 text-muted-foreground" style={{ fontSize: "11.5px" }}>
                No {KIND_NOUN[kind]}s match{app !== "All applications" ? ` in ${app}` : ""}{query2 ? ` for "${query2}"` : ""}.
              </p>
            ) : (
              visibleItems.map((t) => {
                const active = selected?.name === t.name;
                const sc = STATUS_COLOR[t.status];
                return (
                  <button
                    key={t.name}
                    onClick={() => setItem(t.name)}
                    className={`w-full rounded-[9px] border px-3 py-2 text-left ${active ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex min-w-0 items-center gap-1.5 ${active ? "text-primary" : "text-foreground"}`} style={{ fontSize: "12px", fontWeight: 600 }}>
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: sc.dot }} />
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="flex-shrink-0 rounded-full px-1.5 py-0.5" style={{ background: sc.bg, color: sc.fg, fontSize: "9.5px", fontWeight: 700 }}>{t.status}</span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mb-2 flex items-center gap-1.5 text-foreground" style={{ fontSize: "12.5px", fontWeight: 700 }}>
            <Filter className="h-3.5 w-3.5 text-primary" /> Runtime filters
          </div>
          <OptionRow label="Segment" options={SEGMENTS} value={segment} onChange={setSegment} />
          <OptionRow label="Date range" options={RANGES} value={range} onChange={setRange} />

          <div className="mb-2 mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-foreground" style={{ fontSize: "12.5px", fontWeight: 700 }}>
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Presentation
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground" style={{ fontSize: "11.5px", fontWeight: 600 }}>
              <input type="checkbox" checked={customizeView} onChange={(e) => toggleCustomize(e.target.checked)} />
              Customize
            </label>
          </div>
          {!customizeView && (
            <p className="mb-2 text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.45 }}>
              Shown as designed. Tick Customize to override the layout or theme for this view.
            </p>
          )}
          <OptionRow disabled={!customizeView} label="Layout" options={LAYOUTS.map((l) => l.label)} value={LAYOUTS.find((l) => l.key === layout)!.label} onChange={(v) => setLayout(LAYOUTS.find((l) => l.label === v)!.key)} />
          <div className={!customizeView ? "opacity-40" : ""}>
            <div className="mb-1.5 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Theme</div>
            <div className="flex gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  disabled={!customizeView}
                  onClick={() => setTheme(t.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${!customizeView ? "cursor-not-allowed border-border text-foreground" : t.key === theme ? "border-primary/50 bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted/40"}`}
                  style={{ fontSize: "11.5px", fontWeight: 600 }}
                >
                  <span className="h-3 w-3 rounded-full border border-border" style={{ background: t.swatch }} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Right — live preview + explanation */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-[760px]">
            <div className="overflow-hidden rounded-[12px] border border-border">
              <div className="border-b border-border bg-card px-4 py-3">
                <span className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>{itemName || "Select an item"}</span>
                {selected && (
                  <span className="ml-2 rounded-full px-1.5 py-0.5" style={{ background: STATUS_COLOR[selected.status].bg, color: STATUS_COLOR[selected.status].fg, fontSize: "9.5px", fontWeight: 700 }}>{selected.status}</span>
                )}
                <span className="ml-2 text-muted-foreground" style={{ fontSize: "11.5px" }}>
                  {rows.length} rows · {segment} · {range}
                </span>
              </div>
              <div className="p-5" style={{ background: previewBg }}>
                {rows.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed px-4 py-8 text-center" style={{ borderColor: rowBorder, color: previewMuted, fontSize: "12.5px" }}>
                    No rows match the current filters.
                  </div>
                ) : isDashGrid ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[10px] border p-3" style={{ borderColor: rowBorder }}>
                      <div className="mb-1" style={{ color: previewMuted, fontSize: "11px" }}>Total value</div>
                      <div style={{ color: previewFg, fontSize: "22px", fontWeight: 700 }}>{total.toLocaleString()}</div>
                      <div style={{ color: previewMuted, fontSize: "10.5px" }}>{rows.length} records · {range.toLowerCase()}</div>
                    </div>
                    <div className="rounded-[10px] border p-3" style={{ borderColor: rowBorder }}>
                      <div className="mb-2" style={{ color: previewMuted, fontSize: "11px" }}>By segment</div>
                      <div className="flex items-end gap-2">
                        {bySegment.map(([seg, v]) => (
                          <div key={seg} className="flex flex-1 flex-col justify-end gap-0.5 text-center">
                            <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(6, (v / maxSegTotal) * 42)}px`, background: barColor }} />
                            <span style={{ color: previewMuted, fontSize: "8.5px" }}>{seg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[10px] border p-3" style={{ borderColor: rowBorder }}>
                      <div className="mb-1" style={{ color: previewMuted, fontSize: "11px" }}>Top record</div>
                      <div style={{ color: previewFg, fontSize: "22px", fontWeight: 700 }}>{topRow ? topRow.value.toLocaleString() : "—"}</div>
                      <div style={{ color: previewMuted, fontSize: "10.5px" }}>{topRow ? `#${topRow.id} · ${topRow.segment}` : "no data"}</div>
                    </div>
                    <div className="rounded-[10px] border p-3" style={{ borderColor: rowBorder }}>
                      <div className="mb-2" style={{ color: previewMuted, fontSize: "11px" }}>Records by value</div>
                      <div className="flex items-end gap-1.5">
                        {rows.map((r) => (
                          <div key={r.id} className="flex flex-1 flex-col justify-end gap-0.5 text-center">
                            <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(6, (r.value / maxRowValue) * 42)}px`, background: barColor }} />
                            <span style={{ color: previewMuted, fontSize: "8.5px" }}>{r.id.slice(-2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : effLayout === "kpi" ? (
                  <div className="py-4 text-center">
                    <div style={{ color: previewMuted, fontSize: "12px" }}>Total value · {segment} · {range}</div>
                    <div style={{ color: previewFg, fontSize: "40px", fontWeight: 700 }}>{total.toLocaleString()}</div>
                    <div style={{ color: previewMuted, fontSize: "11.5px" }}>{rows.length} records</div>
                  </div>
                ) : effLayout === "bar" ? (
                  <div className="flex items-end gap-3" style={{ height: "150px" }}>
                    {rows.map((r) => (
                      <div key={r.id} className="flex flex-1 flex-col justify-end gap-1 text-center">
                        <span style={{ color: previewMuted, fontSize: "9.5px", fontWeight: 600 }}>{(r.value / 1000).toFixed(1)}k</span>
                        <div className="w-full rounded-t-[4px]" style={{ height: `${Math.max(8, (r.value / 61775) * 100)}%`, background: barColor }} />
                        <span style={{ color: previewMuted, fontSize: "9.5px" }}>{r.segment}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {["id", "segment", "value", "updated_at"].map((c) => (
                          <th key={c} className="px-3 py-2 text-left" style={{ color: previewMuted, fontSize: "11px", fontWeight: 600 }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} style={{ borderTop: `1px solid ${rowBorder}` }}>
                          <td className="px-3 py-2" style={{ color: previewFg, fontSize: "12.5px" }}>{r.id}</td>
                          <td className="px-3 py-2" style={{ color: previewFg, fontSize: "12.5px" }}>{r.segment}</td>
                          <td className="px-3 py-2" style={{ color: previewFg, fontSize: "12.5px" }}>{r.value.toLocaleString()}</td>
                          <td className="px-3 py-2" style={{ color: previewMuted, fontSize: "12.5px" }}>{r.updated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[12px] border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-foreground" style={{ fontSize: "13px", fontWeight: 700 }}>
                  <Sparkles className="h-4 w-4 text-primary" /> Explanation
                </div>
                {!chatOpen && (
                  <button
                    onClick={openChat}
                    className="inline-flex items-center gap-1.5 rounded-[9px] bg-primary px-3 py-1.5 text-white transition-opacity hover:opacity-90"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> AI Assistant
                  </button>
                )}
              </div>
              <p className="text-foreground" style={{ fontSize: "12.5px", lineHeight: 1.65 }}>{explanation}</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-[12px] border border-border">
              <div className="border-b border-border bg-card px-4 py-2.5 text-foreground" style={{ fontSize: "12px", fontWeight: 700 }}>Effective query</div>
              <div className="bg-[#0B1020] px-4 py-3">
                <pre className="overflow-x-auto text-[#93C5FD]" style={{ fontSize: "12px", lineHeight: 1.7, fontFamily: "ui-monospace,monospace" }}>{query}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* AI chat — opens on the right, left controls collapse while it's up */}
        {chatOpen && (
          <div className="flex w-[340px] flex-shrink-0 flex-col border-l border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-1.5 text-foreground" style={{ fontSize: "13px", fontWeight: 700 }}>
                <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
              </div>
              <button onClick={() => setChatOpen(false)} title="Close chat" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
              {chat.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[12px] px-3 py-2 ${m.role === "user" ? "bg-primary text-white" : "bg-muted/60 text-foreground"}`}
                    style={{ fontSize: "12px", lineHeight: 1.55 }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-[12px] border border-border bg-[#FAFBFD] px-3 py-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                  placeholder={`Ask about ${itemName || "this item"}…`}
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  style={{ fontSize: "12.5px" }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim()}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
