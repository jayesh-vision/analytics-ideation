import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Table2, BarChart2, LayoutGrid, FileText, Eye, Trash2, RotateCcw, XCircle, Sparkles,
  CheckCircle2, Clock, Loader, AlertCircle, MoreVertical, Send,
  Play, Download, RefreshCw, Edit, Check, X, ArrowUp, Info, ChevronDown, List, Search, Filter,
  Upload, Settings, Kanban, Database, UserCircle, BookOpen, Maximize2,
} from "../icons";
import { AgentDocPanel } from "../shell/AgentDocs";
import { useCurrentUser } from "../shell/CurrentUser";
import applicationCatalog from "../data/applicationCatalog.json";

export type BiTaskKind = "dataset" | "widget" | "dashboard" | "report";

type Stage = "Completed" | "Running" | "Queued" | "Failed";
type ApprovalStatus = "Draft" | "Awaiting approval" | "Approved" | "Rejected";
interface BiTask {
  id: string; stage: Stage; title: string; app: string; requestedBy: string; createdOn: string; recurring?: string;
  approval?: ApprovalStatus; // only set once stage is Completed
}

const KIND_META: Record<BiTaskKind, { label: string; icon: typeof Table2; subtitle: string }> = {
  dataset: { label: "Dataset Creator", icon: Table2, subtitle: "Governed datasets created from the catalog, joined and shaped for reuse" },
  widget: { label: "Widget Builder", icon: BarChart2, subtitle: "Charts, KPIs, and table widgets built from a plain-language description" },
  dashboard: { label: "Dashboard Composer", icon: LayoutGrid, subtitle: "Widgets arranged into gridded, shareable dashboards" },
  report: { label: "Report Generator", icon: FileText, subtitle: "Scheduled, narrative reports compiled from live dashboards" },
};

const TASKS_BY_KIND: Record<BiTaskKind, BiTask[]> = {
  dataset: [
    { id: "ds1", stage: "Completed", approval: "Approved", title: "Customer 360 dataset", app: "FIBERNEO", requestedBy: "Ayus Kumar", createdOn: "10-Jul-2026 10:15" },
    { id: "ds2", stage: "Running", title: "Churn feature dataset", app: "ANALYTICS", requestedBy: "Priya Nair", createdOn: "15-Jul-2026 09:02" },
    { id: "ds3", stage: "Queued", title: "Field crew roster dataset", app: "FIELD-FORCE-MGMT", requestedBy: "Karan Shah", createdOn: "15-Jul-2026 08:40" },
    { id: "ds4", stage: "Failed", title: "Claims fraud dataset", app: "ANALYTICS", requestedBy: "Ayus Kumar", createdOn: "12-Jul-2026 14:10" },
  ],
  widget: [
    { id: "w1", stage: "Completed", approval: "Draft", title: "Revenue trend widget", app: "ANALYTICS", requestedBy: "Priya Nair", createdOn: "11-Jul-2026 09:30" },
    { id: "w2", stage: "Running", title: "Network fault KPI widget", app: "FIBERNEO", requestedBy: "Ayus Kumar", createdOn: "15-Jul-2026 08:55" },
    { id: "w3", stage: "Queued", title: "Field crew utilization widget", app: "FIELD-FORCE-MGMT", requestedBy: "Karan Shah", createdOn: "15-Jul-2026 08:10" },
    { id: "w4", stage: "Failed", title: "Customer churn widget", app: "ANALYTICS", requestedBy: "Priya Nair", createdOn: "13-Jul-2026 15:45" },
  ],
  dashboard: [
    { id: "db1", stage: "Completed", approval: "Awaiting approval", title: "Network fault trends by region", app: "FIBERNEO", requestedBy: "Ayus Kumar", createdOn: "14-Jul-2026 09:12" },
    { id: "db2", stage: "Queued", title: "Field crew utilization dashboard", app: "FIELD-FORCE-MGMT", requestedBy: "Karan Shah", createdOn: "15-Jul-2026 08:05" },
  ],
  report: [
    { id: "r1", stage: "Running", title: "Monthly compliance report", app: "ANALYTICS", requestedBy: "Priya Nair", createdOn: "15-Jul-2026 07:40" },
    { id: "r2", stage: "Failed", title: "Customer churn report", app: "ANALYTICS", requestedBy: "Ayus Kumar", createdOn: "13-Jul-2026 16:20" },
    { id: "r3", stage: "Completed", approval: "Approved", title: "Monthly SLA compliance report", app: "ANALYTICS", requestedBy: "Priya Nair", createdOn: "12-Jul-2026 11:30", recurring: "Monthly" },
    { id: "r4", stage: "Completed", approval: "Rejected", title: "Weekly incident report", app: "ANALYTICS", requestedBy: "Karan Shah", createdOn: "11-Jul-2026 17:05" },
  ],
};

const STAGE_STYLE: Record<Stage, { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
  Completed: { bg: "#E3F6E4", fg: "#1E7B34", icon: CheckCircle2 },
  Running: { bg: "#E7F0FE", fg: "#1D4EB8", icon: Loader },
  Queued: { bg: "#EEF1F4", fg: "#5F6B7A", icon: Clock },
  Failed: { bg: "#FEE2E2", fg: "#B91C1C", icon: AlertCircle },
};

const APPROVAL_STYLE: Record<ApprovalStatus, { bg: string; fg: string }> = {
  Draft: { bg: "#EEF1F4", fg: "#5F6B7A" },
  "Awaiting approval": { bg: "#FFEDD5", fg: "#C2410C" },
  Approved: { bg: "#E3F6E4", fg: "#1E7B34" },
  Rejected: { bg: "#FEE2E2", fg: "#B91C1C" },
};

// ── Dashboards list — Dashboard Composer's navigation screen, modeled on the
// production Design Studio "Dashboards" list (status, name, package/module, access,
// schedule, creator, last activity) rather than the generic task-request queue below. ──
type DashboardStatus = ApprovalStatus;
interface DashboardRow {
  id: string; status: DashboardStatus; name: string; displayName: string;
  packageName: string; moduleName: string; accessLevel: "Private" | "Public";
  scheduled: boolean; creatorName: string; lastActivityAgo: string; lastActivityBy: string;
}

// Chip variants from the NST registry (vw-chips.css) — see COMPONENTS.md Layer 2.
const STATUS_CHIP: Record<DashboardStatus, string> = {
  Draft: "vw-chip--neutral",
  "Awaiting approval": "vw-chip--warning",
  Approved: "vw-chip--success",
  Rejected: "vw-chip--error",
};
const ACCESS_CHIP: Record<"Private" | "Public", string> = {
  Private: "vw-chip--purple",
  Public: "vw-chip--info",
};

const DASHBOARD_LIST: DashboardRow[] = [
  { id: "dl1", status: "Approved", name: "Network fault trends by region", displayName: "Network fault trends", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Private", scheduled: true, creatorName: "Ayus Kumar", lastActivityAgo: "17 Hrs ago", lastActivityBy: "Ayus Kumar" },
  { id: "dl2", status: "Approved", name: "Field crew utilization dashboard", displayName: "Field crew utilization", packageName: "FIELD-FORCE-MGMT", moduleName: "Field operations", accessLevel: "Private", scheduled: false, creatorName: "Karan Shah", lastActivityAgo: "1 Day ago", lastActivityBy: "Karan Shah" },
  { id: "dl3", status: "Awaiting approval", name: "Customer 360 overview", displayName: "Customer 360 overview", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Private", scheduled: true, creatorName: "Priya Nair", lastActivityAgo: "2 Days ago", lastActivityBy: "Priya Nair" },
  { id: "dl4", status: "Approved", name: "Churn & retention dashboard", displayName: "Churn & retention", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Public", scheduled: true, creatorName: "Priya Nair", lastActivityAgo: "4 Days ago", lastActivityBy: "Priya Nair" },
  { id: "dl5", status: "Approved", name: "SLA compliance dashboard", displayName: "SLA compliance", packageName: "ANALYTICS", moduleName: "Operations analytics", accessLevel: "Private", scheduled: true, creatorName: "Ayus Kumar", lastActivityAgo: "5 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "dl6", status: "Draft", name: "Claims fraud monitor", displayName: "Claims fraud monitor", packageName: "ANALYTICS", moduleName: "Risk & fraud", accessLevel: "Private", scheduled: false, creatorName: "Priya Nair", lastActivityAgo: "6 Days ago", lastActivityBy: "Priya Nair" },
  { id: "dl7", status: "Approved", name: "Revenue trend dashboard", displayName: "Revenue trend", packageName: "ANALYTICS", moduleName: "Finance analytics", accessLevel: "Private", scheduled: true, creatorName: "Ayus Kumar", lastActivityAgo: "6 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "dl8", status: "Approved", name: "Vendor performance dashboard", displayName: "Vendor performance", packageName: "FIELD-FORCE-MGMT", moduleName: "Vendor management", accessLevel: "Private", scheduled: false, creatorName: "Karan Shah", lastActivityAgo: "9 Days ago", lastActivityBy: "Karan Shah" },
  { id: "dl9", status: "Rejected", name: "Executive board pack", displayName: "Executive board pack", packageName: "ANALYTICS", moduleName: "Executive reporting", accessLevel: "Private", scheduled: false, creatorName: "Priya Nair", lastActivityAgo: "11 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "dl10", status: "Approved", name: "Incident response dashboard", displayName: "Incident response", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Public", scheduled: true, creatorName: "Karan Shah", lastActivityAgo: "13 Days ago", lastActivityBy: "Karan Shah" },
  { id: "dl11", status: "Approved", name: "Cost & capacity dashboard", displayName: "Cost & capacity", packageName: "FIBERNEO", moduleName: "FinOps", accessLevel: "Private", scheduled: false, creatorName: "Ayus Kumar", lastActivityAgo: "21 Days ago", lastActivityBy: "Priya Nair" },
  { id: "dl12", status: "Approved", name: "Onboarding funnel dashboard", displayName: "Onboarding funnel", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Private", scheduled: false, creatorName: "Priya Nair", lastActivityAgo: "28 Days ago", lastActivityBy: "Priya Nair" },
];

function dashboardRowToTask(r: DashboardRow): BiTask {
  return { id: r.id, stage: "Completed", approval: r.status, title: r.name, app: r.packageName, requestedBy: r.creatorName, createdOn: r.lastActivityAgo };
}

// Maps an applicationCatalog.json application name to this table's package/module
// naming, for AI-created rows (the two catalogs use different naming schemes).
const APP_TO_PACKAGE: Record<string, { packageName: string; moduleName: string }> = {
  "Field Force Management": { packageName: "FIELD-FORCE-MGMT", moduleName: "Field operations" },
  "CRM": { packageName: "ANALYTICS", moduleName: "Customer intelligence" },
  "Network Discovery": { packageName: "FIBERNEO", moduleName: "Network operations" },
  "Inventory": { packageName: "ANALYTICS", moduleName: "Operations analytics" },
  "SCM": { packageName: "ANALYTICS", moduleName: "Vendor management" },
  "ITSM": { packageName: "ANALYTICS", moduleName: "Operations analytics" },
};

const MODULE_OPTIONS = ["All modules", "Network operations", "Field operations", "Customer intelligence", "Operations analytics", "Risk & fraud", "Finance analytics", "Vendor management", "Executive reporting", "FinOps"];
const STATUS_OPTIONS: string[] = ["All statuses", "Approved", "Awaiting approval", "Draft", "Rejected"];

// NST Layer 2 (components.css — Inter, per COMPONENTS.md's "form + table page"
// rule) below: .nst-table / .nst-table-toolbar / .nst-icon-btn / .nst-table-kebab
// + .nst-table-menu / .nst-action-menu / .nst-btn / .nst-input-shell / vw-chip.

// Row-level actions (per dashboard): Open · Duplicate · Delete.
function EntityRowMenu({ open, onToggle, onClose, onOpen, onDuplicate, onDelete }: {
  open: boolean; onToggle: () => void; onClose: () => void; onOpen: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={onToggle} className="nst-table-kebab" title="Actions" aria-label="Actions">
        <MoreVertical style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="nst-table-menu">
            <div className="nst-table-menu-item" onClick={() => { onOpen(); onClose(); }}>
              <Eye style={{ width: 14, height: 14 }} /> Open
            </div>
            <div className="nst-table-menu-item" onClick={() => { onDuplicate(); onClose(); }}>
              <Table2 style={{ width: 14, height: 14 }} /> Duplicate
            </div>
            <div className="nst-table-menu-item nst-table-menu-item--danger" onClick={() => { onDelete(); onClose(); }}>
              <Trash2 style={{ width: 14, height: 14 }} /> Delete
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Toolbar dropdown trigger (Status / Module / Environment) — .nst-btn outline +
// .nst-action-menu panel; no exact "labeled select" component exists in the
// registry, so this pairs .nst-btn (the closest atomic trigger) with the
// generic .nst-action-menu panel rather than inventing a new class.
function FilterDropdown({ label, value, options, open, onToggle, onClose, onPick, alwaysShowValue }: {
  label: string; value: string; options: string[]; open: boolean; onToggle: () => void; onClose: () => void; onPick: (v: string) => void; alwaysShowValue?: boolean;
}) {
  const isSet = value !== options[0];
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={onToggle} className={`nst-btn nst-btn--sm${isSet || open ? " is-active" : ""}`}>
        {alwaysShowValue || isSet ? value : label}
        <ChevronDown style={{ width: 14, height: 14, transform: open ? "rotate(180deg)" : undefined, transition: "transform 120ms" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="nst-action-menu" style={{ left: 0, top: 40, minWidth: 190, maxHeight: 260, overflowY: "auto" }}>
            {options.map((o) => (
              <div
                key={o}
                className="nst-action-menu-item"
                onClick={() => onPick(o)}
                style={{ justifyContent: "space-between", color: o === value ? "var(--vw-color-accent-500)" : undefined }}
              >
                <span>{o}</span>{o === value && <span style={{ fontSize: 12 }}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Toolbar overflow menu (the "⋮" trigger next to the environment selector) —
// mirrors preview/table.html's Create/Import/Refresh + view-toggle + Table
// options grouping. Only Create is wired to real behavior in this demo.
function ToolbarActionMenu({ open, onToggle, onClose, onFlash }: {
  open: boolean; onToggle: () => void; onClose: () => void; onFlash: (msg: string) => void;
}) {
  const act = (label: string, fn?: () => void) => () => { (fn ?? (() => onFlash(`${label} — coming soon`)))(); onClose(); };
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={onToggle} className={`nst-icon-btn${open ? " is-active" : ""}`} title="More" aria-label="More">
        <MoreVertical style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="nst-action-menu" style={{ right: 0, top: 44, minWidth: 180 }}>
            <div className="nst-action-menu-item" onClick={act("Import")}>
              <span className="nst-action-menu-icon"><Upload style={{ width: 16, height: 16 }} /></span> Import
            </div>
            <div className="nst-action-menu-item" onClick={act("Refresh")}>
              <span className="nst-action-menu-icon"><RefreshCw style={{ width: 16, height: 16 }} /></span> Refresh
            </div>
            <div className="nst-action-menu-divider" />
            <div className="nst-action-menu-item" onClick={act("Tile view")}>
              <span className="nst-action-menu-icon"><LayoutGrid style={{ width: 16, height: 16 }} /></span> Tile view
            </div>
            <div className="nst-action-menu-item" onClick={act("Kanban view")}>
              <span className="nst-action-menu-icon"><Kanban style={{ width: 16, height: 16 }} /></span> Kanban view
            </div>
            <div className="nst-action-menu-divider" />
            <div className="nst-action-menu-item" onClick={act("Table options")}>
              <span className="nst-action-menu-icon"><Settings style={{ width: 16, height: 16 }} /></span> Table options
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type ToolbarMenu = "status" | "module" | "more" | null;

function DashboardsListView({ onOpen, onCreate, onFlash }: { onOpen: (row: DashboardRow) => void; onCreate: () => void; onFlash: (msg: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [moduleName, setModuleName] = useState(MODULE_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const toggleMenu = (m: ToolbarMenu) => setOpenMenu((cur) => (cur === m ? null : m));

  const rows = DASHBOARD_LIST.filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === STATUS_OPTIONS[0] || r.status === status) &&
    (moduleName === MODULE_OPTIONS[0] || r.moduleName === moduleName)
  );
  const hasFilters = search.trim() || status !== STATUS_OPTIONS[0] || moduleName !== MODULE_OPTIONS[0];

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      {/* Toolbar — showing count, search, status/module filters, environment + overflow actions */}
      <div className="nst-table-toolbar" style={{ padding: "0 0 12px" }}>
        <span style={{ fontSize: 12.5, color: "var(--vw-color-gray-500)", whiteSpace: "nowrap" }}>
          Showing {rows.length} of {DASHBOARD_LIST.length}
        </span>
        <div className="nst-input-shell" style={{ width: 200, flex: "0 0 auto" }}>
          <Search className="nst-input-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
        </div>
        <FilterDropdown
          label="Status" value={status} options={STATUS_OPTIONS}
          open={openMenu === "status"} onToggle={() => toggleMenu("status")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setStatus(v); setOpenMenu(null); }}
        />
        <FilterDropdown
          label="Module" value={moduleName} options={MODULE_OPTIONS}
          open={openMenu === "module"} onToggle={() => toggleMenu("module")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setModuleName(v); setOpenMenu(null); }}
        />
        <button
          type="button"
          onClick={() => { setSearch(""); setStatus(STATUS_OPTIONS[0]); setModuleName(MODULE_OPTIONS[0]); }}
          title={hasFilters ? "Clear filters" : "Filter"}
          className={`nst-icon-btn${hasFilters ? " is-active" : ""}`}
        >
          <Filter style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCreate} className="nst-btn nst-btn--filled nst-btn--sm">
          <Sparkles style={{ width: 14, height: 14 }} /> Create with AI
        </button>
        <ToolbarActionMenu
          open={openMenu === "more"} onToggle={() => toggleMenu("more")} onClose={() => setOpenMenu(null)}
          onFlash={onFlash}
        />
      </div>

      {/* Table — Status · Name/Display name · Package/Module name · Access level · Schedule · Creator · Last activity */}
      <table className="nst-table dashboard-list-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Display name</div></th>
            <th>Package<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Module name</div></th>
            <th>Access level</th>
            <th>Schedule</th>
            <th>Creator name</th>
            <th>Last activity</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="is-clickable">
              <td><span className={`vw-chip ${STATUS_CHIP[r.status]}`} style={{ fontSize: 11.5 }}>{r.status}</span></td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)", fontWeight: 500 }}>{r.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.displayName}</div>
              </td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)" }}>{r.packageName}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.moduleName}</div>
              </td>
              <td><span className={`vw-chip ${ACCESS_CHIP[r.accessLevel]}`} style={{ fontSize: 11 }}>{r.accessLevel}</span></td>
              <td>{r.scheduled ? "Yes" : "No"}</td>
              <td>{r.creatorName}</td>
              <td>
                <div style={{ fontWeight: 500, color: "var(--vw-color-gray-700)" }}>{r.status}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--vw-color-gray-500)" }}>{r.lastActivityAgo} BY {r.lastActivityBy}</div>
              </td>
              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                <EntityRowMenu
                  open={rowMenuId === r.id}
                  onToggle={() => setRowMenuId((id) => (id === r.id ? null : r.id))}
                  onClose={() => setRowMenuId(null)}
                  onOpen={() => onOpen(r)}
                  onDuplicate={() => onFlash(`"${r.name}" duplicated ✓`)}
                  onDelete={() => onFlash(`"${r.name}" deleted`)}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--vw-color-gray-500)", padding: "40px 12px" }}>No dashboards match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Widgets list — Widget Builder's navigation screen, same NST Layer 2
// treatment as the Dashboards list above, with "Schedule" swapped for "Type"
// (a widget's own build shape) since widgets don't carry their own schedule. ──
type WidgetType = "KPI tile" | "Bar chart" | "Line chart" | "Table";
interface WidgetRow {
  id: string; status: DashboardStatus; name: string; displayName: string;
  packageName: string; moduleName: string; accessLevel: "Private" | "Public";
  widgetType: WidgetType; datasetName: string; creatorName: string; lastActivityAgo: string; lastActivityBy: string;
}

const WIDGET_LIST: WidgetRow[] = [
  { id: "wl1", status: "Approved", name: "Revenue trend widget", displayName: "Revenue trend", packageName: "ANALYTICS", moduleName: "Finance analytics", accessLevel: "Private", widgetType: "Line chart", datasetName: "Revenue dataset", creatorName: "Ayus Kumar", lastActivityAgo: "9 Hrs ago", lastActivityBy: "Ayus Kumar" },
  { id: "wl2", status: "Approved", name: "Network fault KPI widget", displayName: "Network fault rate", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Private", widgetType: "KPI tile", datasetName: "Network devices", creatorName: "Karan Shah", lastActivityAgo: "1 Day ago", lastActivityBy: "Karan Shah" },
  { id: "wl3", status: "Awaiting approval", name: "Field crew utilization widget", displayName: "Crew utilization", packageName: "FIELD-FORCE-MGMT", moduleName: "Field operations", accessLevel: "Private", widgetType: "Bar chart", datasetName: "Crew schedule", creatorName: "Karan Shah", lastActivityAgo: "2 Days ago", lastActivityBy: "Karan Shah" },
  { id: "wl4", status: "Approved", name: "Customer churn widget", displayName: "Churn rate", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Public", widgetType: "KPI tile", datasetName: "Churn feature dataset", creatorName: "Priya Nair", lastActivityAgo: "3 Days ago", lastActivityBy: "Priya Nair" },
  { id: "wl5", status: "Approved", name: "Open tickets by severity", displayName: "Tickets by severity", packageName: "ITSM", moduleName: "Service desk", accessLevel: "Private", widgetType: "Bar chart", datasetName: "Tickets", creatorName: "Priya Nair", lastActivityAgo: "4 Days ago", lastActivityBy: "Priya Nair" },
  { id: "wl6", status: "Draft", name: "SLA compliance gauge", displayName: "SLA compliance", packageName: "ANALYTICS", moduleName: "Operations analytics", accessLevel: "Private", widgetType: "KPI tile", datasetName: "SLA compliance dataset", creatorName: "Ayus Kumar", lastActivityAgo: "5 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "wl7", status: "Approved", name: "Incident trend widget", displayName: "Incident trend", packageName: "ITSM", moduleName: "Service desk", accessLevel: "Public", widgetType: "Line chart", datasetName: "Incidents", creatorName: "Karan Shah", lastActivityAgo: "6 Days ago", lastActivityBy: "Karan Shah" },
  { id: "wl8", status: "Approved", name: "Top accounts by opportunity value", displayName: "Top accounts", packageName: "CRM", moduleName: "Sales intelligence", accessLevel: "Private", widgetType: "Table", datasetName: "Opportunities", creatorName: "Priya Nair", lastActivityAgo: "8 Days ago", lastActivityBy: "Priya Nair" },
  { id: "wl9", status: "Rejected", name: "Stock levels by warehouse", displayName: "Stock levels", packageName: "Inventory", moduleName: "Warehouse analytics", accessLevel: "Private", widgetType: "Bar chart", datasetName: "Stock levels", creatorName: "Ayus Kumar", lastActivityAgo: "10 Days ago", lastActivityBy: "Karan Shah" },
  { id: "wl10", status: "Approved", name: "Vendor performance score", displayName: "Vendor score", packageName: "SCM", moduleName: "Procurement analytics", accessLevel: "Private", widgetType: "KPI tile", datasetName: "Supplier performance", creatorName: "Karan Shah", lastActivityAgo: "14 Days ago", lastActivityBy: "Karan Shah" },
  { id: "wl11", status: "Approved", name: "Device health overview", displayName: "Device health", packageName: "Network Discovery", moduleName: "Network operations", accessLevel: "Public", widgetType: "Table", datasetName: "Device health metrics", creatorName: "Ayus Kumar", lastActivityAgo: "19 Days ago", lastActivityBy: "Priya Nair" },
  { id: "wl12", status: "Awaiting approval", name: "Shipment delivery SLA", displayName: "Delivery SLA", packageName: "SCM", moduleName: "Logistics analytics", accessLevel: "Private", widgetType: "Line chart", datasetName: "Delivery SLAs", creatorName: "Priya Nair", lastActivityAgo: "23 Days ago", lastActivityBy: "Priya Nair" },
];

function widgetRowToTask(r: WidgetRow): BiTask {
  return { id: r.id, stage: "Completed", approval: r.status, title: r.name, app: r.packageName, requestedBy: r.creatorName, createdOn: r.lastActivityAgo };
}

const WIDGET_MODULE_OPTIONS = ["All modules", "Finance analytics", "Network operations", "Field operations", "Customer intelligence", "Service desk", "Operations analytics", "Sales intelligence", "Warehouse analytics", "Procurement analytics", "Logistics analytics"];

function WidgetsListView({ onOpen, onCreate, onFlash }: { onOpen: (row: WidgetRow) => void; onCreate: () => void; onFlash: (msg: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [moduleName, setModuleName] = useState(WIDGET_MODULE_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const toggleMenu = (m: ToolbarMenu) => setOpenMenu((cur) => (cur === m ? null : m));

  const rows = WIDGET_LIST.filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === STATUS_OPTIONS[0] || r.status === status) &&
    (moduleName === WIDGET_MODULE_OPTIONS[0] || r.moduleName === moduleName)
  );
  const hasFilters = search.trim() || status !== STATUS_OPTIONS[0] || moduleName !== WIDGET_MODULE_OPTIONS[0];

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      {/* Toolbar — showing count, search, status/module filters, environment + overflow actions */}
      <div className="nst-table-toolbar" style={{ padding: "0 0 12px" }}>
        <span style={{ fontSize: 12.5, color: "var(--vw-color-gray-500)", whiteSpace: "nowrap" }}>
          Showing {rows.length} of {WIDGET_LIST.length}
        </span>
        <div className="nst-input-shell" style={{ width: 200, flex: "0 0 auto" }}>
          <Search className="nst-input-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
        </div>
        <FilterDropdown
          label="Status" value={status} options={STATUS_OPTIONS}
          open={openMenu === "status"} onToggle={() => toggleMenu("status")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setStatus(v); setOpenMenu(null); }}
        />
        <FilterDropdown
          label="Module" value={moduleName} options={WIDGET_MODULE_OPTIONS}
          open={openMenu === "module"} onToggle={() => toggleMenu("module")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setModuleName(v); setOpenMenu(null); }}
        />
        <button
          type="button"
          onClick={() => { setSearch(""); setStatus(STATUS_OPTIONS[0]); setModuleName(WIDGET_MODULE_OPTIONS[0]); }}
          title={hasFilters ? "Clear filters" : "Filter"}
          className={`nst-icon-btn${hasFilters ? " is-active" : ""}`}
        >
          <Filter style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCreate} className="nst-btn nst-btn--filled nst-btn--sm">
          <Sparkles style={{ width: 14, height: 14 }} /> Create with AI
        </button>
        <ToolbarActionMenu
          open={openMenu === "more"} onToggle={() => toggleMenu("more")} onClose={() => setOpenMenu(null)}
          onFlash={onFlash}
        />
      </div>

      {/* Table — Status · Name/Display name · Package/Module name · Access level · Type · Creator · Last activity */}
      <table className="nst-table dashboard-list-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Display name</div></th>
            <th>Package<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Module name</div></th>
            <th>Access level</th>
            <th>Type</th>
            <th>Creator name</th>
            <th>Last activity</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="is-clickable">
              <td><span className={`vw-chip ${STATUS_CHIP[r.status]}`} style={{ fontSize: 11.5 }}>{r.status}</span></td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)", fontWeight: 500 }}>{r.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.displayName}</div>
              </td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)" }}>{r.packageName}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.moduleName}</div>
              </td>
              <td><span className={`vw-chip ${ACCESS_CHIP[r.accessLevel]}`} style={{ fontSize: 11 }}>{r.accessLevel}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>{r.widgetType}</td>
              <td>{r.creatorName}</td>
              <td>
                <div style={{ fontWeight: 500, color: "var(--vw-color-gray-700)" }}>{r.status}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--vw-color-gray-500)" }}>{r.lastActivityAgo} BY {r.lastActivityBy}</div>
              </td>
              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                <EntityRowMenu
                  open={rowMenuId === r.id}
                  onToggle={() => setRowMenuId((id) => (id === r.id ? null : r.id))}
                  onClose={() => setRowMenuId(null)}
                  onOpen={() => onOpen(r)}
                  onDuplicate={() => onFlash(`"${r.name}" duplicated ✓`)}
                  onDelete={() => onFlash(`"${r.name}" deleted`)}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--vw-color-gray-500)", padding: "40px 12px" }}>No widgets match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Datasets list — Dataset Creator's navigation screen, same NST Layer 2
// treatment again, with "Rows" swapped in as the dataset-specific column.
// Names/package/module deliberately match WIDGET_LIST's datasetName fields
// 1:1, so the widget preview's "Dataset" card and this dataset's "Used by
// widgets" card cross-link to real rows instead of unrelated mock data. ──
interface DatasetRow {
  id: string; status: DashboardStatus; name: string; displayName: string;
  packageName: string; moduleName: string; accessLevel: "Private" | "Public";
  rowCount: number; sourceType: string; creatorName: string; lastActivityAgo: string; lastActivityBy: string;
}

const DATASET_LIST: DatasetRow[] = [
  { id: "ds1", status: "Approved", name: "Revenue dataset", displayName: "Revenue dataset", packageName: "ANALYTICS", moduleName: "Finance analytics", accessLevel: "Private", rowCount: 48210, sourceType: "Warehouse (Snowflake)", creatorName: "Ayus Kumar", lastActivityAgo: "10 Hrs ago", lastActivityBy: "Ayus Kumar" },
  { id: "ds2", status: "Approved", name: "Network devices", displayName: "Network devices", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Private", rowCount: 6420, sourceType: "Network Inventory (Oracle)", creatorName: "Karan Shah", lastActivityAgo: "1 Day ago", lastActivityBy: "Karan Shah" },
  { id: "ds3", status: "Awaiting approval", name: "Crew schedule", displayName: "Crew schedule", packageName: "FIELD-FORCE-MGMT", moduleName: "Field operations", accessLevel: "Private", rowCount: 1890, sourceType: "Field Ops (PostgreSQL)", creatorName: "Karan Shah", lastActivityAgo: "2 Days ago", lastActivityBy: "Karan Shah" },
  { id: "ds4", status: "Approved", name: "Churn feature dataset", displayName: "Churn features", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Public", rowCount: 22104, sourceType: "Warehouse (Snowflake)", creatorName: "Priya Nair", lastActivityAgo: "3 Days ago", lastActivityBy: "Priya Nair" },
  { id: "ds5", status: "Approved", name: "Tickets", displayName: "Support tickets", packageName: "ITSM", moduleName: "Service desk", accessLevel: "Private", rowCount: 15870, sourceType: "ServiceNow", creatorName: "Priya Nair", lastActivityAgo: "4 Days ago", lastActivityBy: "Priya Nair" },
  { id: "ds6", status: "Draft", name: "SLA compliance dataset", displayName: "SLA compliance", packageName: "ANALYTICS", moduleName: "Operations analytics", accessLevel: "Private", rowCount: 4310, sourceType: "Warehouse (Snowflake)", creatorName: "Ayus Kumar", lastActivityAgo: "5 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "ds7", status: "Approved", name: "Incidents", displayName: "Incidents", packageName: "ITSM", moduleName: "Service desk", accessLevel: "Public", rowCount: 9245, sourceType: "ServiceNow", creatorName: "Karan Shah", lastActivityAgo: "6 Days ago", lastActivityBy: "Karan Shah" },
  { id: "ds8", status: "Approved", name: "Opportunities", displayName: "Opportunities", packageName: "CRM", moduleName: "Sales intelligence", accessLevel: "Private", rowCount: 3612, sourceType: "Salesforce CRM", creatorName: "Priya Nair", lastActivityAgo: "8 Days ago", lastActivityBy: "Priya Nair" },
  { id: "ds9", status: "Rejected", name: "Stock levels", displayName: "Stock levels", packageName: "Inventory", moduleName: "Warehouse analytics", accessLevel: "Private", rowCount: 51830, sourceType: "Warehouse Management (SAP)", creatorName: "Ayus Kumar", lastActivityAgo: "10 Days ago", lastActivityBy: "Karan Shah" },
  { id: "ds10", status: "Approved", name: "Supplier performance", displayName: "Supplier performance", packageName: "SCM", moduleName: "Procurement analytics", accessLevel: "Private", rowCount: 2104, sourceType: "Procurement (Oracle SCM)", creatorName: "Karan Shah", lastActivityAgo: "14 Days ago", lastActivityBy: "Karan Shah" },
  { id: "ds11", status: "Approved", name: "Device health metrics", displayName: "Device health", packageName: "Network Discovery", moduleName: "Network operations", accessLevel: "Public", rowCount: 18760, sourceType: "SNMP Poller", creatorName: "Ayus Kumar", lastActivityAgo: "19 Days ago", lastActivityBy: "Priya Nair" },
  { id: "ds12", status: "Awaiting approval", name: "Delivery SLAs", displayName: "Delivery SLAs", packageName: "SCM", moduleName: "Logistics analytics", accessLevel: "Private", rowCount: 7395, sourceType: "Logistics (PostgreSQL)", creatorName: "Priya Nair", lastActivityAgo: "23 Days ago", lastActivityBy: "Priya Nair" },
];

function datasetRowToTask(r: DatasetRow): BiTask {
  return { id: r.id, stage: "Completed", approval: r.status, title: r.name, app: r.packageName, requestedBy: r.creatorName, createdOn: r.lastActivityAgo };
}

const DATASET_MODULE_OPTIONS = ["All modules", "Finance analytics", "Network operations", "Field operations", "Customer intelligence", "Service desk", "Operations analytics", "Sales intelligence", "Warehouse analytics", "Procurement analytics", "Logistics analytics"];

function DatasetsListView({ onOpen, onCreate, onFlash }: { onOpen: (row: DatasetRow) => void; onCreate: () => void; onFlash: (msg: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [moduleName, setModuleName] = useState(DATASET_MODULE_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const toggleMenu = (m: ToolbarMenu) => setOpenMenu((cur) => (cur === m ? null : m));

  const rows = DATASET_LIST.filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === STATUS_OPTIONS[0] || r.status === status) &&
    (moduleName === DATASET_MODULE_OPTIONS[0] || r.moduleName === moduleName)
  );
  const hasFilters = search.trim() || status !== STATUS_OPTIONS[0] || moduleName !== DATASET_MODULE_OPTIONS[0];

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      {/* Toolbar — showing count, search, status/module filters, environment + overflow actions */}
      <div className="nst-table-toolbar" style={{ padding: "0 0 12px" }}>
        <span style={{ fontSize: 12.5, color: "var(--vw-color-gray-500)", whiteSpace: "nowrap" }}>
          Showing {rows.length} of {DATASET_LIST.length}
        </span>
        <div className="nst-input-shell" style={{ width: 200, flex: "0 0 auto" }}>
          <Search className="nst-input-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
        </div>
        <FilterDropdown
          label="Status" value={status} options={STATUS_OPTIONS}
          open={openMenu === "status"} onToggle={() => toggleMenu("status")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setStatus(v); setOpenMenu(null); }}
        />
        <FilterDropdown
          label="Module" value={moduleName} options={DATASET_MODULE_OPTIONS}
          open={openMenu === "module"} onToggle={() => toggleMenu("module")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setModuleName(v); setOpenMenu(null); }}
        />
        <button
          type="button"
          onClick={() => { setSearch(""); setStatus(STATUS_OPTIONS[0]); setModuleName(DATASET_MODULE_OPTIONS[0]); }}
          title={hasFilters ? "Clear filters" : "Filter"}
          className={`nst-icon-btn${hasFilters ? " is-active" : ""}`}
        >
          <Filter style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCreate} className="nst-btn nst-btn--filled nst-btn--sm">
          <Sparkles style={{ width: 14, height: 14 }} /> Create with AI
        </button>
        <ToolbarActionMenu
          open={openMenu === "more"} onToggle={() => toggleMenu("more")} onClose={() => setOpenMenu(null)}
          onFlash={onFlash}
        />
      </div>

      {/* Table — Status · Name/Display name · Package/Module name · Access level · Rows · Creator · Last activity */}
      <table className="nst-table dashboard-list-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Display name</div></th>
            <th>Package<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Module name</div></th>
            <th>Access level</th>
            <th>Rows</th>
            <th>Creator name</th>
            <th>Last activity</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="is-clickable">
              <td><span className={`vw-chip ${STATUS_CHIP[r.status]}`} style={{ fontSize: 11.5 }}>{r.status}</span></td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)", fontWeight: 500 }}>{r.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.displayName}</div>
              </td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)" }}>{r.packageName}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.moduleName}</div>
              </td>
              <td><span className={`vw-chip ${ACCESS_CHIP[r.accessLevel]}`} style={{ fontSize: 11 }}>{r.accessLevel}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>{r.rowCount.toLocaleString()}</td>
              <td>{r.creatorName}</td>
              <td>
                <div style={{ fontWeight: 500, color: "var(--vw-color-gray-700)" }}>{r.status}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--vw-color-gray-500)" }}>{r.lastActivityAgo} BY {r.lastActivityBy}</div>
              </td>
              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                <EntityRowMenu
                  open={rowMenuId === r.id}
                  onToggle={() => setRowMenuId((id) => (id === r.id ? null : r.id))}
                  onClose={() => setRowMenuId(null)}
                  onOpen={() => onOpen(r)}
                  onDuplicate={() => onFlash(`"${r.name}" duplicated ✓`)}
                  onDelete={() => onFlash(`"${r.name}" deleted`)}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--vw-color-gray-500)", padding: "40px 12px" }}>No datasets match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Reports list — Report Generator's navigation screen, same NST Layer 2
// treatment again, with "Frequency" as the report-specific column. Each
// report's sourceDashboards match real DASHBOARD_LIST names, so the preview's
// "Source dashboards" card cross-links like widget↔dataset already does. ──
type ReportFrequency = "Weekly" | "Monthly" | "Quarterly" | "One-time";
interface ReportRow {
  id: string; status: DashboardStatus; name: string; displayName: string;
  packageName: string; moduleName: string; accessLevel: "Private" | "Public";
  frequency: ReportFrequency; sourceDashboards: string[]; creatorName: string; lastActivityAgo: string; lastActivityBy: string;
}

const REPORT_LIST: ReportRow[] = [
  { id: "rp1", status: "Approved", name: "Weekly network health report", displayName: "Network health", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Private", frequency: "Weekly", sourceDashboards: ["Network fault trends by region", "Incident response dashboard"], creatorName: "Ayus Kumar", lastActivityAgo: "8 Hrs ago", lastActivityBy: "Ayus Kumar" },
  { id: "rp2", status: "Approved", name: "Monthly field operations report", displayName: "Field operations", packageName: "FIELD-FORCE-MGMT", moduleName: "Field operations", accessLevel: "Private", frequency: "Monthly", sourceDashboards: ["Field crew utilization dashboard", "Vendor performance dashboard"], creatorName: "Karan Shah", lastActivityAgo: "1 Day ago", lastActivityBy: "Karan Shah" },
  { id: "rp3", status: "Awaiting approval", name: "Customer intelligence digest", displayName: "Customer digest", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Private", frequency: "Weekly", sourceDashboards: ["Customer 360 overview", "Churn & retention dashboard"], creatorName: "Priya Nair", lastActivityAgo: "2 Days ago", lastActivityBy: "Priya Nair" },
  { id: "rp4", status: "Approved", name: "Quarterly SLA compliance report", displayName: "SLA compliance", packageName: "ANALYTICS", moduleName: "Operations analytics", accessLevel: "Public", frequency: "Quarterly", sourceDashboards: ["SLA compliance dashboard"], creatorName: "Ayus Kumar", lastActivityAgo: "3 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "rp5", status: "Draft", name: "Fraud & risk summary", displayName: "Fraud & risk", packageName: "ANALYTICS", moduleName: "Risk & fraud", accessLevel: "Private", frequency: "Monthly", sourceDashboards: ["Claims fraud monitor"], creatorName: "Priya Nair", lastActivityAgo: "5 Days ago", lastActivityBy: "Priya Nair" },
  { id: "rp6", status: "Approved", name: "Monthly revenue report", displayName: "Revenue report", packageName: "ANALYTICS", moduleName: "Finance analytics", accessLevel: "Private", frequency: "Monthly", sourceDashboards: ["Revenue trend dashboard"], creatorName: "Ayus Kumar", lastActivityAgo: "6 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "rp7", status: "Approved", name: "Executive board pack (Q3)", displayName: "Board pack Q3", packageName: "ANALYTICS", moduleName: "Executive reporting", accessLevel: "Private", frequency: "Quarterly", sourceDashboards: ["Executive board pack"], creatorName: "Karan Shah", lastActivityAgo: "8 Days ago", lastActivityBy: "Karan Shah" },
  { id: "rp8", status: "Rejected", name: "Cost & capacity review", displayName: "Cost & capacity", packageName: "FIBERNEO", moduleName: "FinOps", accessLevel: "Private", frequency: "Monthly", sourceDashboards: ["Cost & capacity dashboard"], creatorName: "Priya Nair", lastActivityAgo: "10 Days ago", lastActivityBy: "Ayus Kumar" },
  { id: "rp9", status: "Approved", name: "Onboarding funnel report", displayName: "Onboarding funnel", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Public", frequency: "Weekly", sourceDashboards: ["Onboarding funnel dashboard"], creatorName: "Priya Nair", lastActivityAgo: "14 Days ago", lastActivityBy: "Priya Nair" },
  { id: "rp10", status: "Approved", name: "Weekly incident review", displayName: "Incident review", packageName: "FIBERNEO", moduleName: "Network operations", accessLevel: "Private", frequency: "Weekly", sourceDashboards: ["Incident response dashboard", "Network fault trends by region"], creatorName: "Karan Shah", lastActivityAgo: "19 Days ago", lastActivityBy: "Karan Shah" },
  { id: "rp11", status: "Awaiting approval", name: "Vendor performance report", displayName: "Vendor performance", packageName: "FIELD-FORCE-MGMT", moduleName: "Vendor management", accessLevel: "Private", frequency: "Monthly", sourceDashboards: ["Vendor performance dashboard"], creatorName: "Karan Shah", lastActivityAgo: "21 Days ago", lastActivityBy: "Karan Shah" },
  { id: "rp12", status: "Approved", name: "One-time churn deep-dive", displayName: "Churn deep-dive", packageName: "ANALYTICS", moduleName: "Customer intelligence", accessLevel: "Private", frequency: "One-time", sourceDashboards: ["Churn & retention dashboard", "Customer 360 overview"], creatorName: "Priya Nair", lastActivityAgo: "25 Days ago", lastActivityBy: "Priya Nair" },
];

function reportRowToTask(r: ReportRow): BiTask {
  return { id: r.id, stage: "Completed", approval: r.status, title: r.name, app: r.packageName, requestedBy: r.creatorName, createdOn: r.lastActivityAgo, recurring: r.frequency !== "One-time" ? r.frequency : undefined };
}

const REPORT_MODULE_OPTIONS = ["All modules", "Network operations", "Field operations", "Customer intelligence", "Operations analytics", "Risk & fraud", "Finance analytics", "Executive reporting", "FinOps", "Vendor management"];

function ReportsListView({ onOpen, onCreate, onFlash }: { onOpen: (row: ReportRow) => void; onCreate: () => void; onFlash: (msg: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [moduleName, setModuleName] = useState(REPORT_MODULE_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const toggleMenu = (m: ToolbarMenu) => setOpenMenu((cur) => (cur === m ? null : m));

  const rows = REPORT_LIST.filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === STATUS_OPTIONS[0] || r.status === status) &&
    (moduleName === REPORT_MODULE_OPTIONS[0] || r.moduleName === moduleName)
  );
  const hasFilters = search.trim() || status !== STATUS_OPTIONS[0] || moduleName !== REPORT_MODULE_OPTIONS[0];

  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
      {/* Toolbar — showing count, search, status/module filters, environment + overflow actions */}
      <div className="nst-table-toolbar" style={{ padding: "0 0 12px" }}>
        <span style={{ fontSize: 12.5, color: "var(--vw-color-gray-500)", whiteSpace: "nowrap" }}>
          Showing {rows.length} of {REPORT_LIST.length}
        </span>
        <div className="nst-input-shell" style={{ width: 200, flex: "0 0 auto" }}>
          <Search className="nst-input-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
        </div>
        <FilterDropdown
          label="Status" value={status} options={STATUS_OPTIONS}
          open={openMenu === "status"} onToggle={() => toggleMenu("status")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setStatus(v); setOpenMenu(null); }}
        />
        <FilterDropdown
          label="Module" value={moduleName} options={REPORT_MODULE_OPTIONS}
          open={openMenu === "module"} onToggle={() => toggleMenu("module")} onClose={() => setOpenMenu(null)}
          onPick={(v) => { setModuleName(v); setOpenMenu(null); }}
        />
        <button
          type="button"
          onClick={() => { setSearch(""); setStatus(STATUS_OPTIONS[0]); setModuleName(REPORT_MODULE_OPTIONS[0]); }}
          title={hasFilters ? "Clear filters" : "Filter"}
          className={`nst-icon-btn${hasFilters ? " is-active" : ""}`}
        >
          <Filter style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCreate} className="nst-btn nst-btn--filled nst-btn--sm">
          <Sparkles style={{ width: 14, height: 14 }} /> Create with AI
        </button>
        <ToolbarActionMenu
          open={openMenu === "more"} onToggle={() => toggleMenu("more")} onClose={() => setOpenMenu(null)}
          onFlash={onFlash}
        />
      </div>

      {/* Table — Status · Name/Display name · Package/Module name · Access level · Frequency · Creator · Last activity */}
      <table className="nst-table dashboard-list-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Display name</div></th>
            <th>Package<div style={{ marginTop: 2, fontSize: 11, fontWeight: 400, color: "var(--vw-color-gray-400)" }}>Module name</div></th>
            <th>Access level</th>
            <th>Frequency</th>
            <th>Creator name</th>
            <th>Last activity</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="is-clickable">
              <td><span className={`vw-chip ${STATUS_CHIP[r.status]}`} style={{ fontSize: 11.5 }}>{r.status}</span></td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)", fontWeight: 500 }}>{r.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.displayName}</div>
              </td>
              <td>
                <div style={{ color: "var(--vw-color-gray-900)" }}>{r.packageName}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: "var(--vw-color-gray-500)" }}>{r.moduleName}</div>
              </td>
              <td><span className={`vw-chip ${ACCESS_CHIP[r.accessLevel]}`} style={{ fontSize: 11 }}>{r.accessLevel}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>{r.frequency}</td>
              <td>{r.creatorName}</td>
              <td>
                <div style={{ fontWeight: 500, color: "var(--vw-color-gray-700)" }}>{r.status}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "var(--vw-color-gray-500)" }}>{r.lastActivityAgo} BY {r.lastActivityBy}</div>
              </td>
              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                <EntityRowMenu
                  open={rowMenuId === r.id}
                  onToggle={() => setRowMenuId((id) => (id === r.id ? null : r.id))}
                  onClose={() => setRowMenuId(null)}
                  onOpen={() => onOpen(r)}
                  onDuplicate={() => onFlash(`"${r.name}" duplicated ✓`)}
                  onDelete={() => onFlash(`"${r.name}" deleted`)}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--vw-color-gray-500)", padding: "40px 12px" }}>No reports match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Row action menu — three-dot trigger, actions depend on task status ─────
interface MenuAction { icon: typeof Eye; label: string; tone?: "muted" | "primary" | "destructive"; onClick: () => void }

function RowMenu({ task, open, onToggle, onClose, onPreview, onChat, onViewError }: {
  task: BiTask; open: boolean; onToggle: () => void; onClose: () => void;
  onPreview: () => void; onChat: () => void; onViewError: () => void;
}) {
  const actions: MenuAction[] = [{ icon: Sparkles, label: "Chat", onClick: onChat }];
  if (task.stage === "Completed") actions.push({ icon: Eye, label: "Preview", tone: "primary", onClick: onPreview });
  if (task.stage === "Running" || task.stage === "Queued") actions.push({ icon: XCircle, label: "Cancel", onClick: onClose });
  if (task.stage === "Failed") {
    actions.push({ icon: RotateCcw, label: "Retry", onClick: onClose });
    actions.push({ icon: AlertCircle, label: "View error", tone: "destructive", onClick: onViewError });
  }
  if (task.stage === "Completed" || task.stage === "Failed") actions.push({ icon: Trash2, label: "Delete", tone: "destructive", onClick: onClose });

  return (
    <div className="relative inline-block">
      <button
        onClick={onToggle}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        title="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 top-8 z-50 min-w-[150px] overflow-hidden rounded-[10px] border border-border bg-card py-1 shadow-lg">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => { a.onClick(); onClose(); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 ${
                  a.tone === "primary" ? "text-primary" : a.tone === "destructive" ? "text-destructive" : "text-foreground"
                }`}
                style={{ fontSize: "12.5px", fontWeight: 500 }}
              >
                <a.icon className="h-3.5 w-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Error details — shown from a failed task's "View error" action ─────────
const TASK_ERRORS: Record<BiTaskKind, { step: string; code: string; message: string; log: string; cause: string; fix: string }> = {
  dataset: {
    step: "Query execution",
    code: "SNOWFLAKE-002003",
    message: "Object 'CLAIMS_RAW.PUBLIC.CLAIMS_2026' does not exist or is not authorized.",
    log: `2026-07-13 15:45:02  INFO   Compiling governed query (4 joins, 2 filters)\n2026-07-13 15:45:04  INFO   Executing on WAREHOUSE (Snowflake) as role BI_AGENT\n2026-07-13 15:45:11  ERROR  SQL compilation error:\n                          Object 'CLAIMS_RAW.PUBLIC.CLAIMS_2026' does not exist\n                          or not authorized.\n2026-07-13 15:45:11  ERROR  Task aborted — no partial output written`,
    cause: "The source table was renamed or the agent's role lost read access after the last successful run.",
    fix: "Re-point the dataset at the current claims table (or restore the grant to role BI_AGENT), then retry the task.",
  },
  widget: {
    step: "Data binding",
    code: "BIND-404",
    message: "Column 'churn_rate' was not found in dataset 'Churn feature dataset'.",
    log: `2026-07-13 15:45:02  INFO   Loading dataset 'Churn feature dataset' (v14)\n2026-07-13 15:45:03  INFO   Binding series: x=month, y=churn_rate\n2026-07-13 15:45:03  ERROR  Column 'churn_rate' not present in schema v14\n                          (renamed to 'churn_pct' in upstream change #482)\n2026-07-13 15:45:03  ERROR  Widget build aborted`,
    cause: "An upstream schema change renamed the bound column after this widget was configured.",
    fix: "Rebind the y-axis to 'churn_pct' (ask the agent in chat: \"use churn_pct\"), then retry.",
  },
  report: {
    step: "Rendering & export",
    code: "RENDER-TIMEOUT",
    message: "The PDF renderer timed out after 120s while compiling the narrative sections.",
    log: `2026-07-13 16:20:01  INFO   Compiling 4 dashboard sections into narrative\n2026-07-13 16:20:44  INFO   Section 3/4 'Churn drivers' — waiting on widget refresh\n2026-07-13 16:22:01  ERROR  Renderer timed out after 120s\n                          (widget 'Customer churn widget' is itself in Failed state)\n2026-07-13 16:22:01  ERROR  Report export aborted`,
    cause: "A widget this report depends on is failing, so its section never finished rendering.",
    fix: "Fix or exclude the failing 'Customer churn widget' section, then retry the report.",
  },
  dashboard: {
    step: "Widget refresh",
    code: "DEP-FAILED",
    message: "2 of 4 widgets on this dashboard failed to refresh.",
    log: `2026-07-13 15:45:02  INFO   Refreshing 4 widgets in parallel\n2026-07-13 15:45:09  ERROR  'Customer churn widget' — BIND-404 (missing column)\n2026-07-13 15:45:11  ERROR  'Claims by region' — upstream dataset in Failed state\n2026-07-13 15:45:11  ERROR  Dashboard marked Failed (partial tiles withheld)`,
    cause: "Upstream widget and dataset failures cascaded into this dashboard's refresh.",
    fix: "Resolve the two upstream failures first — this dashboard will refresh cleanly on retry.",
  },
};

function ErrorModal({ task, kind, onClose, onRetry, onAskAgent }: {
  task: BiTask; kind: BiTaskKind; onClose: () => void; onRetry: () => void; onAskAgent: () => void;
}) {
  const err = TASK_ERRORS[kind];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[16px] border border-border bg-card p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: "#FEE2E2" }}>
              <AlertCircle className="h-5 w-5" style={{ color: "#B91C1C" }} />
            </div>
            <div>
              <div className="text-foreground" style={{ fontSize: "16px", fontWeight: 700 }}>Task failed</div>
              <div className="text-muted-foreground" style={{ fontSize: "12px" }}>{task.title} · {task.app} · {task.createdOn}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 rounded-[10px] border px-3.5 py-2.5" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
          <div style={{ color: "#B91C1C", fontSize: "12.5px", fontWeight: 600 }}>{err.message}</div>
        </div>

        <div className="mb-3 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5" style={{ fontSize: "12px" }}>
          <div className="text-muted-foreground">Failed step</div><div className="text-foreground" style={{ fontWeight: 500 }}>{err.step}</div>
          <div className="text-muted-foreground">Error code</div><div className="text-foreground" style={{ fontWeight: 500, fontFamily: "ui-monospace,monospace" }}>{err.code}</div>
          <div className="text-muted-foreground">Requested by</div><div className="text-foreground" style={{ fontWeight: 500 }}>{task.requestedBy}</div>
        </div>

        <div className="mb-3 overflow-hidden rounded-[10px] border border-border">
          <div className="border-b border-border bg-[#FCFCFD] px-3.5 py-2 text-foreground" style={{ fontSize: "11.5px", fontWeight: 700 }}>Run log</div>
          <div className="bg-[#0B1020] px-3.5 py-2.5">
            <pre className="overflow-x-auto" style={{ color: "#FCA5A5", fontSize: "11px", lineHeight: 1.65, fontFamily: "ui-monospace,monospace" }}>{err.log}</pre>
          </div>
        </div>

        <div className="mb-4 rounded-[10px] border border-border bg-[#FAFBFD] px-3.5 py-2.5" style={{ fontSize: "12px", lineHeight: 1.55 }}>
          <div className="mb-1"><span className="text-foreground" style={{ fontWeight: 700 }}>Probable cause: </span><span className="text-foreground">{err.cause}</span></div>
          <div><span className="text-foreground" style={{ fontWeight: 700 }}>Suggested fix: </span><span className="text-foreground">{err.fix}</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-[10px] bg-foreground px-3.5 py-2 text-background hover:opacity-90" style={{ fontSize: "12.5px", fontWeight: 600 }}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry task
          </button>
          <button onClick={onAskAgent} className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-foreground hover:bg-muted/40" style={{ fontSize: "12.5px", fontWeight: 600 }}>
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask the agent to fix it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mock preview renderer — a stand-in visual per kind ──────────────────────
function rotate<T>(base: T[], seed: number): T[] {
  return base.map((_, i) => base[(i + seed) % base.length]);
}

function seedFromId(id: string): number {
  const m = id.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function MiniBars({ values, compact }: { values: number[]; compact?: boolean }) {
  return (
    <div className={`flex items-stretch gap-2 ${compact ? "h-16" : "h-28"}`}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col justify-end gap-1">
          <span className="text-center text-muted-foreground" style={{ fontSize: "9.5px", fontWeight: 600 }}>{v}%</span>
          <div className="w-full rounded-t-[4px] bg-primary/70" style={{ height: `${v}%` }} />
        </div>
      ))}
    </div>
  );
}

function queryFor(title: string) {
  const table = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `SELECT id, segment, value, updated_at\nFROM ${table}\nWHERE updated_at >= current_date - interval '2 days'\nORDER BY value DESC\nLIMIT 100`;
}

function ItemPreviewBody({ kind, title, seed, hasRun }: { kind: BiTaskKind; title: string; seed: number; hasRun: boolean }) {
  if (kind === "dataset") {
    const cols = ["id", "segment", "value", "updated_at"];
    const baseRows = [
      ["10231", "Enterprise", "48,210", "2026-07-15"],
      ["10232", "Mid-market", "12,904", "2026-07-15"],
      ["10233", "SMB", "3,118", "2026-07-14"],
      ["10234", "Enterprise", "61,775", "2026-07-14"],
    ];
    const rows = rotate(baseRows, seed);
    return (
      <div>
        <div className="mb-3 text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>{title}</div>
        <div className="mb-4 overflow-hidden rounded-[10px] border border-border bg-[#0B1020] px-4 py-3">
          <pre className="overflow-x-auto text-[#93C5FD]" style={{ fontSize: "12px", lineHeight: 1.7, fontFamily: "ui-monospace,monospace" }}>{queryFor(title)}</pre>
        </div>
        {!hasRun ? (
          <div className="rounded-[10px] border border-dashed border-border px-4 py-6 text-center text-muted-foreground" style={{ fontSize: "12.5px" }}>
            Click Preview to run this query
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-border">
            <table className="w-full border-collapse">
              <thead className="bg-[#FCFCFD]"><tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left text-muted-foreground" style={{ fontSize: "11.5px", fontWeight: 600 }}>{c}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((v, j) => <td key={j} className="px-3 py-2 text-foreground" style={{ fontSize: "12.5px" }}>{v}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
  if (kind === "widget") {
    const bars = rotate([45, 70, 55, 90, 62, 78, 40], seed);
    const days = rotate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], seed);
    return (
      <div>
        <div className="mb-4 text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>{title}</div>
        <MiniBars values={bars} />
        <div className="mt-2 flex justify-between text-muted-foreground" style={{ fontSize: "10.5px" }}>
          {days.map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>
    );
  }
  if (kind === "dashboard") {
    const tiles = [
      { label: "Trend", bars: rotate([30, 55, 40, 65], seed) },
      { label: "By region", bars: rotate([70, 40, 85, 50], seed) },
    ];
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
          <LayoutGrid className="h-4 w-4 text-primary" /> {title}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-border p-3"><div className="mb-2 text-muted-foreground" style={{ fontSize: "11px" }}>Total volume</div><div className="text-foreground" style={{ fontSize: "20px", fontWeight: 600 }}>4,184</div></div>
          <div className="rounded-[10px] border border-border p-3"><div className="mb-2 text-muted-foreground" style={{ fontSize: "11px" }}>{tiles[0].label}</div><MiniBars values={tiles[0].bars} compact /></div>
          <div className="rounded-[10px] border border-border p-3"><div className="mb-2 text-muted-foreground" style={{ fontSize: "11px" }}>Approved</div><div className="text-foreground" style={{ fontSize: "20px", fontWeight: 600 }}>323</div></div>
          <div className="rounded-[10px] border border-border p-3"><div className="mb-2 text-muted-foreground" style={{ fontSize: "11px" }}>{tiles[1].label}</div><MiniBars values={tiles[1].bars} compact /></div>
        </div>
      </div>
    );
  }
  const compliance = rotate([50, 65, 45, 80, 60], seed);
  const reportRows = [
    { metric: "Incident response time", target: "95%" },
    { metric: "First-call resolution", target: "90%" },
    { metric: "Ticket backlog age", target: "85%" },
    { metric: "Uptime — core services", target: "99.9%" },
    { metric: "Change success rate", target: "92%" },
  ].map((r, i) => ({ ...r, actual: compliance[i], status: compliance[i] >= 60 ? "On track" : "At risk" }));
  return (
    <div>
      <div className="mb-1 text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>{title}</div>
      <div className="mb-4 text-muted-foreground" style={{ fontSize: "11.5px" }}>Generated 15-Jul-2026 · Distribution: Analytics leads</div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-[92%] rounded bg-muted" />
        <div className="h-2.5 w-[80%] rounded bg-muted" />
      </div>
      <div className="my-4 overflow-hidden rounded-[10px] border border-border">
        <table className="w-full border-collapse">
          <thead className="bg-[#FCFCFD]">
            <tr>
              {["SLA metric", "Target", "Actual", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-muted-foreground" style={{ fontSize: "11.5px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportRows.map((r) => (
              <tr key={r.metric} className="border-t border-border">
                <td className="px-3 py-2 text-foreground" style={{ fontSize: "12.5px", fontWeight: 500 }}>{r.metric}</td>
                <td className="px-3 py-2 text-muted-foreground" style={{ fontSize: "12.5px" }}>{r.target}</td>
                <td className="px-3 py-2 text-foreground" style={{ fontSize: "12.5px" }}>{r.actual}%</td>
                <td className="px-3 py-2">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5"
                    style={r.status === "On track" ? { background: "#DCFCE7", color: "#15803D", fontSize: "10.5px", fontWeight: 700 } : { background: "#FEE2E2", color: "#B91C1C", fontSize: "10.5px", fontWeight: 700 }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-[70%] rounded bg-muted" />
      </div>
    </div>
  );
}

// ── Toolbar — Live preview label + a kind-specific primary action ─────────
function ToolbarIconButton({ icon: Icon, title, onClick, active, spinning }: {
  icon: typeof Eye; title: string; onClick: () => void; active?: boolean; spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${active ? "bg-primary/10 text-primary" : "bg-muted/60 text-foreground hover:bg-muted"}`}
    >
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

const EXPORT_FORMATS: Record<BiTaskKind, string[]> = {
  dataset: ["CSV", "XLSX"],
  widget: ["PNG", "SVG"],
  dashboard: ["PDF", "PNG"],
  report: ["PDF", "DOCX"],
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground" style={{ fontWeight: 500 }}>{value}</div>
    </>
  );
}

function DetailsPanel({ kind, title }: { kind: BiTaskKind; title: string }) {
  if (kind === "dataset") {
    return (
      <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5" style={{ fontSize: "12px" }}>
        <DetailRow label="Datasource" value="Warehouse (Snowflake)" />
        <DetailRow label="Type" value="Cloud data warehouse" />
        <DetailRow label="Schema" value="ANALYTICS.CURATED" />
        <DetailRow label="Table" value={title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")} />
        <DetailRow label="Columns" value="id, segment, value, updated_at" />
        <DetailRow label="Refresh" value="Daily · 06:00 IST" />
        <DetailRow label="Owner" value="Data Platform team" />
      </div>
    );
  }
  if (kind === "widget" || kind === "report") {
    return (
      <div>
        <div className="mb-2 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5" style={{ fontSize: "12px" }}>
          <DetailRow label="Dataset" value="Customer 360 dataset" />
          <DetailRow label="Layout" value={kind === "widget" ? "Bar chart" : "Narrative document · summary table + sections"} />
          <DetailRow label="Selection" value="id, segment, value" />
          <DetailRow label="Filter" value="updated_at ≥ current_date − 2 days" />
          <DetailRow label="Grouped by" value="segment" />
          <DetailRow label="Colors" value="Primary blue · status pills green/red" />
        </div>
        <div className="overflow-hidden rounded-[8px] bg-[#0B1020] px-3 py-2">
          <pre className="overflow-x-auto text-[#93C5FD]" style={{ fontSize: "11px", lineHeight: 1.6, fontFamily: "ui-monospace,monospace" }}>{queryFor("Customer 360 dataset")}</pre>
        </div>
      </div>
    );
  }
  const widgets = [
    { name: "Total volume", desc: "KPI tile — count of records in scope" },
    { name: "Trend", desc: "Bar chart — volume over the last 4 periods" },
    { name: "Approved", desc: "KPI tile — approved items this period" },
    { name: "By region", desc: "Bar chart — volume split by region" },
  ];
  return (
    <div>
      <div className="mb-2 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5" style={{ fontSize: "12px" }}>
        <DetailRow label="Widgets" value={`${widgets.length} on this dashboard`} />
        <DetailRow label="Theme" value="Light · primary blue accents · 2-column grid" />
      </div>
      <div className="space-y-1.5">
        {widgets.map((w) => (
          <div key={w.name} className="rounded-[8px] border border-border bg-card px-3 py-2">
            <div className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>{w.name}</div>
            <div className="text-muted-foreground" style={{ fontSize: "11.5px" }}>{w.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EXPLAIN: Record<BiTaskKind, string> = {
  dataset: "This dataset runs a governed query over the catalog — joining and filtering the source tables, then ranking and limiting the result you see below.",
  widget: "This widget aggregates the underlying dataset into a daily series and renders it as a bar chart, refreshed on demand.",
  dashboard: "This dashboard arranges its widgets into a grid and refreshes them together, so every tile stays in sync with the same run.",
  report: "This report compiles the connected dashboards into a narrative document, with supporting charts and a distribution list.",
};

// ── Dashboard preview — Layer 1 (vw-card-*, Poppins) per COMPONENTS.md's
// "dashboard / KPI / card grid" rule, modeled on the production "Dashboard
// overview" screen: KPI row, a health/trend/status row, then chart rows.
// Chart SVG text stays Inter, matching preview/bar-chart.html + line-chart.html. ──
function pick<T>(arr: T[], seed: number): T { return arr[((seed % arr.length) + arr.length) % arr.length]; }

function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * mag;
}
function formatAxisValue(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${Math.round(v)}`;
}
function curvePath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  const t = 0.28;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cx1 = p1.x + (p2.x - p0.x) * t, cy1 = p1.y + (p2.y - p0.y) * t;
    const cx2 = p2.x - (p3.x - p1.x) * t, cy2 = p2.y - (p3.y - p1.y) * t;
    d += ` C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function SvgBarChart({ data, height = 220 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const W = 520, H = height;
  const m = { t: 10, r: 8, b: 32, l: 38 };
  const cW = W - m.l - m.r, cH = H - m.t - m.b;
  const yMax = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  const sy = (v: number) => cH - (v / yMax) * cH;
  const slotW = cW / data.length;
  const barW = Math.min(44, slotW * 0.5);
  const sx = (i: number) => i * slotW + slotW / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
      <g transform={`translate(${m.l},${m.t})`}>
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={0} y1={sy(tk)} x2={cW} y2={sy(tk)} stroke="var(--vw-color-gray-100)" strokeWidth={1} />
            <text x={-8} y={sy(tk) + 4} textAnchor="end" fontSize={11} fill="var(--vw-color-gray-400)" fontFamily="Inter, sans-serif">{formatAxisValue(tk)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = sx(i) - barW / 2, y = sy(d.value), h = Math.max(cH - y, 1);
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={h} rx={6} ry={6} fill={d.color} />
              <text x={sx(i)} y={cH + 18} textAnchor="middle" fontSize={11} fill="var(--vw-color-gray-400)" fontFamily="Inter, sans-serif">{d.label}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function SvgAreaLineChart({ series, labels, height = 240 }: { series: { name: string; color: string; values: number[] }[]; labels: string[]; height?: number }) {
  const W = 520, H = height;
  const m = { t: 10, r: 8, b: 26, l: 34 };
  const cW = W - m.l - m.r, cH = H - m.t - m.b;
  const yMax = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  const sy = (v: number) => cH - (v / yMax) * cH;
  const sx = (i: number) => (i / Math.max(1, labels.length - 1)) * cW;
  const pointsFor = (values: number[]) => values.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const primaryPts = pointsFor(series[0]?.values ?? []);
  const gradId = `dashPreviewAreaGrad${series[0]?.name.replace(/\s+/g, "") ?? ""}`;
  const areaPath = primaryPts.length
    ? `${curvePath(primaryPts)} L${primaryPts[primaryPts.length - 1].x.toFixed(1)},${cH} L${primaryPts[0].x.toFixed(1)},${cH} Z`
    : "";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color ?? "#38BDF8"} stopOpacity={0.28} />
            <stop offset="100%" stopColor={series[0]?.color ?? "#38BDF8"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map((tk, i) => (
            <g key={i}>
              <line x1={0} y1={sy(tk)} x2={cW} y2={sy(tk)} stroke="var(--vw-color-gray-100)" strokeWidth={1} />
              <text x={-8} y={sy(tk) + 4} textAnchor="end" fontSize={11} fill="var(--vw-color-gray-400)" fontFamily="Inter, sans-serif">{formatAxisValue(tk)}</text>
            </g>
          ))}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
          {series.map((s) => (
            <path key={s.name} d={curvePath(pointsFor(s.values))} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
          ))}
          {series.map((s) => pointsFor(s.values).map((p, i) => (
            <circle key={`${s.name}-${i}`} cx={p.x} cy={p.y} r={3.5} fill={s.color} />
          )))}
          {labels.map((lbl, i) => (
            <text key={lbl} x={sx(i)} y={cH + 16} textAnchor="middle" fontSize={10.5} fill="var(--vw-color-gray-400)" fontFamily="Inter, sans-serif">{lbl}</text>
          ))}
        </g>
      </svg>
      {series.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 6 }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--vw-color-gray-600)", fontFamily: "Inter, sans-serif" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} /> {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, tint, tintBg, label, value, sub, subTone }: {
  icon: typeof Database; tint: string; tintBg: string; label: string; value: string; sub?: string; subTone?: "is-positive" | "is-negative";
}) {
  return (
    <div className="vw-card-section" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div className="vw-flex vw-items-center vw-justify-between">
        <span className="vw-card-metric-label">{label}</span>
        <div className="vw-card-icon-sm" style={{ background: tintBg, color: tint }}>
          <Icon style={{ width: 16, height: 16 }} />
        </div>
      </div>
      <div className="vw-card-metric-xl">{value}</div>
      {sub && (subTone
        ? <div className={`vw-card-variance ${subTone}`}>{sub} vs last week</div>
        : <div className="vw-card-description" style={{ fontSize: 12 }}>{sub}</div>
      )}
    </div>
  );
}

function HighlightCard({ tone, icon: Icon, title, sub }: { tone: "success" | "warning"; icon: typeof CheckCircle2; title: string; sub: string }) {
  const bg = tone === "success" ? "var(--vw-color-emerald-25)" : "var(--vw-color-amber-25)";
  const border = tone === "success" ? "var(--vw-color-emerald-200)" : "var(--vw-color-amber-200)";
  const tint = tone === "success" ? "var(--vw-color-emerald-600)" : "var(--vw-color-amber-600)";
  return (
    <div className="vw-card-section" style={{ background: bg, borderColor: border, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div className="vw-card-icon-md" style={{ background: "rgba(255,255,255,0.65)", color: tint }}>
        <Icon style={{ width: 20, height: 20 }} />
      </div>
      <div>
        <div className="vw-card-title-sm">{title}</div>
        <div className="vw-card-description" style={{ marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="vw-card-section">
      <div className="vw-card-title-sm">{title}</div>
      <div className="vw-card-description" style={{ marginBottom: 14 }}>{subtitle}</div>
      {children}
    </div>
  );
}

function StatusListCard({ title, total, icon: Icon, rows }: {
  title: string; total: number; icon: typeof LayoutGrid; rows: { icon: typeof CheckCircle2; label: string; value: number; tint: string }[];
}) {
  return (
    <div className="vw-card-section" style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div className="vw-flex vw-items-center vw-gap-sm">
        <div className="vw-card-icon-sm" style={{ background: "var(--vw-color-blue-50)", color: "var(--vw-color-blue-600)" }}>
          <Icon style={{ width: 16, height: 16 }} />
        </div>
        <div>
          <div className="vw-card-title-sm">{title}</div>
          <div className="vw-card-metric-md">{total}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} className="vw-flex vw-items-center vw-justify-between" style={{ fontSize: 13 }}>
            <span className="vw-flex vw-items-center vw-gap-xs" style={{ color: "var(--vw-color-gray-700)" }}>
              <r.icon style={{ width: 14, height: 14, color: r.tint }} /> {r.label}
            </span>
            <span style={{ fontWeight: 600, color: r.tint }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DASHBOARD_SUBTITLE = "Live snapshot — every widget refreshes together on each run.";
const DASHBOARD_DETAIL_WIDGETS = [
  { name: "Total records", desc: "KPI tile — governed record count in scope" },
  { name: "Widgets", desc: "KPI tile — count of widgets wired to this dashboard" },
  { name: "Data freshness", desc: "KPI tile — time since the last successful refresh" },
  { name: "Viewers this week", desc: "KPI tile — unique viewers, with trend vs last week" },
  { name: "Widget health", desc: "Status card — live / needs refresh / error breakdown" },
  { name: "Views trend", desc: "Line chart — daily views over the last 7 days" },
  { name: "Widgets by type", desc: "Bar chart — KPI, chart, table and map widgets on this dashboard" },
  { name: "Top data sources", desc: "Bar chart — which sources feed this dashboard's widgets" },
];

function DashboardPreview({ title, approval, seed, onExplainAi, onSubmit, onDiscard, hideActions }: {
  title: string; approval?: ApprovalStatus; seed: number; onExplainAi: () => void; onSubmit: () => void; onDiscard: () => void; hideActions?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isApproved = approval === "Approved";
  const isAwaiting = approval === "Awaiting approval";
  const canDiscard = !approval || approval === "Draft";

  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };

  const totalRecords = pick([12480, 8340, 21150, 6720], seed);
  const widgetCount = pick([4, 6, 5, 7], seed);
  const freshness = pick(["2 hrs ago", "15 min ago", "1 day ago", "40 min ago"], seed);
  const viewers = pick([18, 42, 9, 27], seed);
  const viewersTrend = pick(["+12%", "+4%", "-6%", "+21%"], seed);
  const widgetsLive = pick([3, 5, 4, 6], seed);
  const widgetsStale = pick([1, 1, 0, 1], seed);
  const widgetsError = pick([0, 0, 1, 0], seed);
  const allHealthy = widgetsStale === 0 && widgetsError === 0;

  const viewLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const viewsValues = rotate([24, 30, 28, 40, 52, 38, 46], seed);

  const widgetTypeValues = rotate([5, 3, 2, 1], seed);
  const widgetTypeBars = [
    { label: "KPI", color: "var(--vw-color-blue-500)" },
    { label: "Chart", color: "var(--vw-color-emerald-500)" },
    { label: "Table", color: "var(--vw-color-amber-500)" },
    { label: "Map", color: "var(--vw-color-purple-500)" },
  ].map((w, i) => ({ ...w, value: widgetTypeValues[i] }));

  const dataSourceValues = rotate([12, 7, 4], seed);
  const dataSourceBars = [
    { label: "ANALYTICS", color: "var(--vw-color-blue-500)" },
    { label: "FIBERNEO", color: "var(--vw-color-emerald-500)" },
    { label: "FIELD-FORCE", color: "var(--vw-color-amber-500)" },
  ].map((d, i) => ({ ...d, value: dataSourceValues[i] }));

  return (
    <div className="vw-flex vw-gap-md vw-items-start" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="vw-flex vw-flex-col vw-page-gap" style={{ flex: 1, minWidth: 0 }}>
        {/* Header — title/subtitle + AI Assistant / Details */}
        <div className="vw-card-section">
          <div className="vw-flex vw-items-start vw-justify-between vw-gap-md vw-wrap">
            <div>
              <div className="vw-flex vw-items-center vw-gap-sm">
                <span className="vw-page-title">{title}</span>
                {approval && <span className={`vw-chip ${STATUS_CHIP[approval]}`} style={{ fontSize: 11 }}>{approval}</span>}
              </div>
              <div className="vw-page-description" style={{ marginTop: 2 }}>{DASHBOARD_SUBTITLE}</div>
            </div>
            <div className="vw-flex vw-gap-xs" style={{ flexShrink: 0 }}>
              <button type="button" onClick={onExplainAi} className="nst-btn nst-btn--sm">
                <Sparkles style={{ width: 14, height: 14 }} /> AI Assistant
              </button>
              <button type="button" onClick={() => setShowDetails((v) => !v)} className={`nst-btn nst-btn--sm${showDetails ? " is-active" : ""}`}>
                <Info style={{ width: 14, height: 14 }} /> Details
              </button>
            </div>
          </div>

          {!hideActions && !isApproved && (
            <div className="vw-card-footer-divider vw-flex vw-items-center vw-gap-sm">
              <button type="button" onClick={submit} disabled={submitting || isAwaiting} className="nst-btn nst-btn--filled nst-btn--sm" style={{ opacity: submitting || isAwaiting ? 0.5 : 1 }}>
                <Check style={{ width: 14, height: 14 }} /> {isAwaiting ? "Awaiting approval" : submitting ? "Submitting…" : "Submit for approval"}
              </button>
              {canDiscard && (
                <button type="button" onClick={onDiscard} className="nst-btn nst-btn--danger-subtle nst-btn--sm">
                  <Trash2 style={{ width: 14, height: 14 }} /> Discard
                </button>
              )}
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <KpiTile icon={Database} tint="var(--vw-color-blue-600)" tintBg="var(--vw-color-blue-50)" label="Total records" value={totalRecords.toLocaleString()} sub="Across every widget on this dashboard" />
          <KpiTile icon={LayoutGrid} tint="var(--vw-color-emerald-600)" tintBg="var(--vw-color-emerald-50)" label="Widgets" value={String(widgetCount)} sub={`${widgetCount} on this dashboard`} />
          <KpiTile icon={RefreshCw} tint="var(--vw-color-amber-600)" tintBg="var(--vw-color-amber-50)" label="Data freshness" value={freshness} sub="Time since the last successful refresh" />
          <KpiTile icon={UserCircle} tint="var(--vw-color-purple-600)" tintBg="var(--vw-color-purple-50)" label="Viewers this week" value={String(viewers)} sub={viewersTrend} subTone={viewersTrend.startsWith("-") ? "is-negative" : "is-positive"} />
        </div>

        {/* Row 2 — health highlight · views trend · widget status */}
        <div className="vw-flex vw-wrap vw-gap-md vw-items-stretch">
          <div style={{ flex: "1 1 200px" }}>
            <HighlightCard
              tone={allHealthy ? "success" : "warning"}
              icon={allHealthy ? CheckCircle2 : AlertCircle}
              title={allHealthy ? "All widgets healthy" : `${widgetsStale + widgetsError} widget${widgetsStale + widgetsError === 1 ? "" : "s"} need attention`}
              sub={allHealthy ? "Every widget refreshed on the last run." : "Review the widget health list for details."}
            />
          </div>
          <div style={{ flex: "2 1 320px" }}>
            <ChartCard title="Views trend" subtitle="Daily views over the last 7 days">
              <SvgAreaLineChart series={[{ name: "Views", color: "var(--vw-color-blue-500)", values: viewsValues }]} labels={viewLabels} height={200} />
            </ChartCard>
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <StatusListCard
              title="Widgets" total={widgetCount} icon={LayoutGrid}
              rows={[
                { icon: CheckCircle2, label: "Live", value: widgetsLive, tint: "var(--vw-color-emerald-600)" },
                { icon: Clock, label: "Needs refresh", value: widgetsStale, tint: "var(--vw-color-amber-600)" },
                { icon: AlertCircle, label: "Error", value: widgetsError, tint: "var(--vw-color-red-600)" },
              ]}
            />
          </div>
        </div>

        {/* Row 3 — bar charts */}
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <ChartCard title="Widgets by type" subtitle="How this dashboard's widgets break down">
            <SvgBarChart data={widgetTypeBars} height={200} />
          </ChartCard>
          <ChartCard title="Top data sources" subtitle="Which sources feed this dashboard">
            <SvgBarChart data={dataSourceBars} height={200} />
          </ChartCard>
        </div>
      </div>

      {/* Details — right panel, not inline */}
      {showDetails && (
        <aside className="vw-card-section" style={{ width: 300, flexShrink: 0, position: "sticky", top: 0 }}>
          <div className="vw-flex vw-items-center vw-justify-between" style={{ marginBottom: 10 }}>
            <div className="vw-card-title-sm">Widgets on this dashboard</div>
            <button type="button" onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground" title="Close details">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="vw-flex vw-flex-col vw-gap-xs">
            {DASHBOARD_DETAIL_WIDGETS.map((w) => (
              <div key={w.name} className="vw-card-child-shaded">
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--vw-color-gray-800)" }}>{w.name}</div>
                <div className="vw-card-description" style={{ fontSize: 11.5 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

// Shared small data-grid — used by the widget preview's "Table" type and by
// the dataset preview's live query result, so both render identically.
function MiniDataTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid var(--vw-color-slate-200)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
        <thead style={{ background: "var(--vw-color-gray-50)" }}>
          <tr>{cols.map((c) => <th key={c} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11.5, fontWeight: 500, color: "var(--vw-color-gray-500)" }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--vw-color-slate-200)" }}>
              {row.map((v, j) => <td key={j} style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--vw-color-gray-700)" }}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Widget preview — same Layer 1 header/details/submit pattern as the
// dashboard preview, but the centerpiece is the widget itself (rendered per
// its own widgetType) plus three supporting cards instead of a KPI grid. ──
function InfoListCard({ icon: Icon, title, rows }: { icon: typeof Database; title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="vw-card-section" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div className="vw-flex vw-items-center vw-gap-sm">
        <div className="vw-card-icon-sm" style={{ background: "var(--vw-color-blue-50)", color: "var(--vw-color-blue-600)" }}>
          <Icon style={{ width: 16, height: 16 }} />
        </div>
        <div className="vw-card-title-sm">{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} className="vw-flex vw-items-start vw-justify-between vw-gap-sm" style={{ fontSize: 12.5 }}>
            <span style={{ color: "var(--vw-color-gray-500)", flexShrink: 0 }}>{r.label}</span>
            <span style={{ color: "var(--vw-color-gray-900)", fontWeight: 500, textAlign: "right" }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WIDGET_SUBTITLE = "Bound to a governed dataset — refreshes on demand or with its dashboard.";
const WIDGET_DETAIL_ITEMS = [
  { name: "Live preview", desc: "Renders the widget itself — KPI tile, chart, or table depending on its type" },
  { name: "Dataset", desc: "The governed dataset this widget is bound to" },
  { name: "Used on dashboards", desc: "Every dashboard that currently embeds this widget" },
  { name: "Configuration", desc: "Chart type, axis fields, filters, and color mapping" },
];

function WidgetPreview({ title, approval, widgetType, datasetName, seed, onExplainAi, onSubmit, onDiscard, hideActions }: {
  title: string; approval?: ApprovalStatus; widgetType: WidgetType; datasetName: string; seed: number; onExplainAi: () => void; onSubmit: () => void; onDiscard: () => void; hideActions?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isApproved = approval === "Approved";
  const isAwaiting = approval === "Awaiting approval";
  const canDiscard = !approval || approval === "Draft";

  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };

  const kpiValue = pick(["94.7%", "$482K", "1,204", "38.2K", "12.4%"], seed);
  const kpiTrend = pick(["+3.2% vs last period", "-1.1% vs last period", "+8.6% vs last period", "+0.4% vs last period"], seed);

  const barLabels = ["Critical", "High", "Medium", "Low"];
  const barColors = ["var(--vw-color-red-500)", "var(--vw-color-amber-500)", "var(--vw-color-blue-500)", "var(--vw-color-emerald-500)"];
  const barValues = rotate([12, 34, 58, 21], seed);
  const barData = barLabels.map((label, i) => ({ label, value: barValues[i], color: barColors[i] }));

  const lineLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const lineValues = rotate([40, 55, 48, 62, 58, 70, 66], seed);

  const tableCols = ["id", "segment", "value", "updated_at"];
  const tableRows = rotate([
    ["10231", "Enterprise", "48,210", "2026-07-15"],
    ["10232", "Mid-market", "12,904", "2026-07-15"],
    ["10233", "SMB", "3,118", "2026-07-14"],
    ["10234", "Enterprise", "61,775", "2026-07-14"],
  ], seed);

  const usedOnDashboards = [DASHBOARD_LIST[seed % DASHBOARD_LIST.length].name, DASHBOARD_LIST[(seed + 5) % DASHBOARD_LIST.length].name];

  return (
    <div className="vw-flex vw-gap-md vw-items-start" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="vw-flex vw-flex-col vw-page-gap" style={{ flex: 1, minWidth: 0 }}>
        {/* Header — title/subtitle + AI Assistant / Details */}
        <div className="vw-card-section">
          <div className="vw-flex vw-items-start vw-justify-between vw-gap-md vw-wrap">
            <div>
              <div className="vw-flex vw-items-center vw-gap-sm">
                <span className="vw-page-title">{title}</span>
                {approval && <span className={`vw-chip ${STATUS_CHIP[approval]}`} style={{ fontSize: 11 }}>{approval}</span>}
              </div>
              <div className="vw-page-description" style={{ marginTop: 2 }}>{WIDGET_SUBTITLE}</div>
            </div>
            <div className="vw-flex vw-gap-xs" style={{ flexShrink: 0 }}>
              <button type="button" onClick={onExplainAi} className="nst-btn nst-btn--sm">
                <Sparkles style={{ width: 14, height: 14 }} /> AI Assistant
              </button>
              <button type="button" onClick={() => setShowDetails((v) => !v)} className={`nst-btn nst-btn--sm${showDetails ? " is-active" : ""}`}>
                <Info style={{ width: 14, height: 14 }} /> Details
              </button>
            </div>
          </div>

          {!hideActions && !isApproved && (
            <div className="vw-card-footer-divider vw-flex vw-items-center vw-gap-sm">
              <button type="button" onClick={submit} disabled={submitting || isAwaiting} className="nst-btn nst-btn--filled nst-btn--sm" style={{ opacity: submitting || isAwaiting ? 0.5 : 1 }}>
                <Check style={{ width: 14, height: 14 }} /> {isAwaiting ? "Awaiting approval" : submitting ? "Submitting…" : "Submit for approval"}
              </button>
              {canDiscard && (
                <button type="button" onClick={onDiscard} className="nst-btn nst-btn--danger-subtle nst-btn--sm">
                  <Trash2 style={{ width: 14, height: 14 }} /> Discard
                </button>
              )}
            </div>
          )}
        </div>

        {/* Centerpiece — the widget itself, rendered per its own type */}
        <ChartCard title="Live preview" subtitle={`${widgetType} · bound to ${datasetName}`}>
          {widgetType === "KPI tile" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div className="vw-card-metric-xxxl">{kpiValue}</div>
              <div className={`vw-card-variance ${kpiTrend.startsWith("-") ? "is-negative" : "is-positive"}`} style={{ marginTop: 10 }}>{kpiTrend}</div>
            </div>
          )}
          {widgetType === "Bar chart" && <SvgBarChart data={barData} height={260} />}
          {widgetType === "Line chart" && (
            <SvgAreaLineChart series={[{ name: title, color: "var(--vw-color-blue-500)", values: lineValues }]} labels={lineLabels} height={260} />
          )}
          {widgetType === "Table" && <MiniDataTable cols={tableCols} rows={tableRows} />}
        </ChartCard>

        {/* Row 2 — dataset · used on dashboards · configuration */}
        <div className="vw-flex vw-wrap vw-gap-md vw-items-stretch">
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={Database} title="Dataset"
              rows={[
                { label: "Dataset", value: datasetName },
                { label: "Refresh", value: "On demand" },
                { label: "Owner", value: "Data Platform team" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={LayoutGrid} title="Used on dashboards"
              rows={usedOnDashboards.map((d, i) => ({ label: `Dashboard ${i + 1}`, value: d }))}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={Settings} title="Configuration"
              rows={[
                { label: "Layout", value: widgetType },
                { label: "Grouped by", value: "segment" },
                { label: "Colors", value: "Primary blue · status accents" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Details — right panel, not inline */}
      {showDetails && (
        <aside className="vw-card-section" style={{ width: 300, flexShrink: 0, position: "sticky", top: 0 }}>
          <div className="vw-flex vw-items-center vw-justify-between" style={{ marginBottom: 10 }}>
            <div className="vw-card-title-sm">Widget details</div>
            <button type="button" onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground" title="Close details">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="vw-flex vw-flex-col vw-gap-xs">
            {WIDGET_DETAIL_ITEMS.map((w) => (
              <div key={w.name} className="vw-card-child-shaded">
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--vw-color-gray-800)" }}>{w.name}</div>
                <div className="vw-card-description" style={{ fontSize: 11.5 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

// ── Dataset preview — same header/details/submit pattern again; the
// centerpiece is the governed query plus its live result grid (what a
// dataset actually *is*), with Source/Schema/Used-by-widgets supporting
// cards. "Used by widgets" is a real lookup against WIDGET_LIST, not mock —
// both lists share the same dataset names by construction. ──
const DATASET_SUBTITLE = "Governed and query-ready — every widget bound to this dataset reads the same rows.";
const DATASET_DETAIL_ITEMS = [
  { name: "Live preview", desc: "The governed query and the current result grid it returns" },
  { name: "Source", desc: "Datasource, table, refresh cadence, and owner" },
  { name: "Schema", desc: "Columns and their types" },
  { name: "Used by widgets", desc: "Every widget currently bound to this dataset" },
];

function DatasetPreview({ title, approval, sourceType, seed, onExplainAi, onSubmit, onDiscard, hideActions }: {
  title: string; approval?: ApprovalStatus; sourceType: string; seed: number; onExplainAi: () => void; onSubmit: () => void; onDiscard: () => void; hideActions?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isApproved = approval === "Approved";
  const isAwaiting = approval === "Awaiting approval";
  const canDiscard = !approval || approval === "Draft";

  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };

  const tableCols = ["id", "segment", "value", "updated_at"];
  const tableRows = rotate([
    ["10231", "Enterprise", "48,210", "2026-07-15"],
    ["10232", "Mid-market", "12,904", "2026-07-15"],
    ["10233", "SMB", "3,118", "2026-07-14"],
    ["10234", "Enterprise", "61,775", "2026-07-14"],
  ], seed);

  const usedByWidgets = WIDGET_LIST.filter((w) => w.datasetName === title);

  return (
    <div className="vw-flex vw-gap-md vw-items-start" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="vw-flex vw-flex-col vw-page-gap" style={{ flex: 1, minWidth: 0 }}>
        {/* Header — title/subtitle + AI Assistant / Details */}
        <div className="vw-card-section">
          <div className="vw-flex vw-items-start vw-justify-between vw-gap-md vw-wrap">
            <div>
              <div className="vw-flex vw-items-center vw-gap-sm">
                <span className="vw-page-title">{title}</span>
                {approval && <span className={`vw-chip ${STATUS_CHIP[approval]}`} style={{ fontSize: 11 }}>{approval}</span>}
              </div>
              <div className="vw-page-description" style={{ marginTop: 2 }}>{DATASET_SUBTITLE}</div>
            </div>
            <div className="vw-flex vw-gap-xs" style={{ flexShrink: 0 }}>
              <button type="button" onClick={onExplainAi} className="nst-btn nst-btn--sm">
                <Sparkles style={{ width: 14, height: 14 }} /> AI Assistant
              </button>
              <button type="button" onClick={() => setShowDetails((v) => !v)} className={`nst-btn nst-btn--sm${showDetails ? " is-active" : ""}`}>
                <Info style={{ width: 14, height: 14 }} /> Details
              </button>
            </div>
          </div>

          {!hideActions && !isApproved && (
            <div className="vw-card-footer-divider vw-flex vw-items-center vw-gap-sm">
              <button type="button" onClick={submit} disabled={submitting || isAwaiting} className="nst-btn nst-btn--filled nst-btn--sm" style={{ opacity: submitting || isAwaiting ? 0.5 : 1 }}>
                <Check style={{ width: 14, height: 14 }} /> {isAwaiting ? "Awaiting approval" : submitting ? "Submitting…" : "Submit for approval"}
              </button>
              {canDiscard && (
                <button type="button" onClick={onDiscard} className="nst-btn nst-btn--danger-subtle nst-btn--sm">
                  <Trash2 style={{ width: 14, height: 14 }} /> Discard
                </button>
              )}
            </div>
          )}
        </div>

        {/* Centerpiece — the governed query and its live result grid */}
        <ChartCard title="Live preview" subtitle={`Query · bound to ${sourceType}`}>
          <div style={{ overflow: "hidden", borderRadius: 10, background: "#0B1020", padding: "14px 16px", marginBottom: 14 }}>
            <pre style={{ overflowX: "auto", color: "#93C5FD", fontSize: 12, lineHeight: 1.7, fontFamily: "ui-monospace, monospace", margin: 0 }}>{queryFor(title)}</pre>
          </div>
          <MiniDataTable cols={tableCols} rows={tableRows} />
        </ChartCard>

        {/* Row 2 — source · schema · used by widgets */}
        <div className="vw-flex vw-wrap vw-gap-md vw-items-stretch">
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={Database} title="Source"
              rows={[
                { label: "Datasource", value: sourceType },
                { label: "Table", value: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") },
                { label: "Refresh", value: "Daily · 06:00 IST" },
                { label: "Owner", value: "Data Platform team" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={Table2} title="Schema"
              rows={[
                { label: "id", value: "BIGINT" },
                { label: "segment", value: "VARCHAR" },
                { label: "value", value: "DECIMAL" },
                { label: "updated_at", value: "TIMESTAMP" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={BarChart2} title="Used by widgets"
              rows={usedByWidgets.length > 0
                ? usedByWidgets.map((w, i) => ({ label: `Widget ${i + 1}`, value: w.name }))
                : [{ label: "Widgets", value: "None yet" }]}
            />
          </div>
        </div>
      </div>

      {/* Details — right panel, not inline */}
      {showDetails && (
        <aside className="vw-card-section" style={{ width: 300, flexShrink: 0, position: "sticky", top: 0 }}>
          <div className="vw-flex vw-items-center vw-justify-between" style={{ marginBottom: 10 }}>
            <div className="vw-card-title-sm">Dataset details</div>
            <button type="button" onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground" title="Close details">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="vw-flex vw-flex-col vw-gap-xs">
            {DATASET_DETAIL_ITEMS.map((w) => (
              <div key={w.name} className="vw-card-child-shaded">
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--vw-color-gray-800)" }}>{w.name}</div>
                <div className="vw-card-description" style={{ fontSize: 11.5 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

// ── Report preview — same header/details/submit pattern; the centerpiece is
// the narrative document itself (distribution line, body copy, an SLA-style
// compliance table) instead of a chart. Source dashboards cross-link to real
// DASHBOARD_LIST rows, continuing the same pattern as widget↔dataset. ──
const REPORT_SUBTITLE = "Compiled from its source dashboards into a distributed, narrative document.";
const REPORT_DETAIL_ITEMS = [
  { name: "Live preview", desc: "The compiled narrative document and its compliance table" },
  { name: "Schedule", desc: "Frequency, next/last run, and the distribution list" },
  { name: "Sections", desc: "The document's section outline" },
  { name: "Source dashboards", desc: "Every dashboard this report compiles from" },
];
const REPORT_SECTIONS = ["Executive summary", "Dashboard highlights", "SLA compliance", "Recommendations"];

function ReportPreview({ title, approval, frequency, sourceDashboards, seed, onExplainAi, onSubmit, onDiscard, hideActions }: {
  title: string; approval?: ApprovalStatus; frequency: ReportFrequency; sourceDashboards: string[]; seed: number; onExplainAi: () => void; onSubmit: () => void; onDiscard: () => void; hideActions?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isApproved = approval === "Approved";
  const isAwaiting = approval === "Awaiting approval";
  const canDiscard = !approval || approval === "Draft";

  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };

  const compliance = rotate([50, 65, 45, 80, 60], seed);
  const complianceRows = [
    { metric: "Incident response time", target: "95%" },
    { metric: "First-call resolution", target: "90%" },
    { metric: "Ticket backlog age", target: "85%" },
    { metric: "Uptime — core services", target: "99.9%" },
    { metric: "Change success rate", target: "92%" },
  ].map((r, i) => ({ ...r, actual: compliance[i], onTrack: compliance[i] >= 60 }));

  const generatedOn = pick(["15-Jul-2026", "12-Jul-2026", "18-Jul-2026", "20-Jul-2026"], seed);
  const nextRun = pick(["01-Aug-2026 07:00", "22-Jul-2026 07:00", "01-Sep-2026 07:00"], seed);
  const lastRun = pick(["15-Jul-2026 07:00 · Completed", "18-Jul-2026 07:00 · Completed", "20-Jul-2026 07:00 · Completed"], seed);

  return (
    <div className="vw-flex vw-gap-md vw-items-start" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="vw-flex vw-flex-col vw-page-gap" style={{ flex: 1, minWidth: 0 }}>
        {/* Header — title/subtitle + AI Assistant / Details */}
        <div className="vw-card-section">
          <div className="vw-flex vw-items-start vw-justify-between vw-gap-md vw-wrap">
            <div>
              <div className="vw-flex vw-items-center vw-gap-sm">
                <span className="vw-page-title">{title}</span>
                {approval && <span className={`vw-chip ${STATUS_CHIP[approval]}`} style={{ fontSize: 11 }}>{approval}</span>}
              </div>
              <div className="vw-page-description" style={{ marginTop: 2 }}>{REPORT_SUBTITLE}</div>
            </div>
            <div className="vw-flex vw-gap-xs" style={{ flexShrink: 0 }}>
              <button type="button" onClick={onExplainAi} className="nst-btn nst-btn--sm">
                <Sparkles style={{ width: 14, height: 14 }} /> AI Assistant
              </button>
              <button type="button" onClick={() => setShowDetails((v) => !v)} className={`nst-btn nst-btn--sm${showDetails ? " is-active" : ""}`}>
                <Info style={{ width: 14, height: 14 }} /> Details
              </button>
            </div>
          </div>

          {!hideActions && !isApproved && (
            <div className="vw-card-footer-divider vw-flex vw-items-center vw-gap-sm">
              <button type="button" onClick={submit} disabled={submitting || isAwaiting} className="nst-btn nst-btn--filled nst-btn--sm" style={{ opacity: submitting || isAwaiting ? 0.5 : 1 }}>
                <Check style={{ width: 14, height: 14 }} /> {isAwaiting ? "Awaiting approval" : submitting ? "Submitting…" : "Submit for approval"}
              </button>
              {canDiscard && (
                <button type="button" onClick={onDiscard} className="nst-btn nst-btn--danger-subtle nst-btn--sm">
                  <Trash2 style={{ width: 14, height: 14 }} /> Discard
                </button>
              )}
            </div>
          )}
        </div>

        {/* Centerpiece — the compiled narrative document */}
        <ChartCard title="Live preview" subtitle={`Generated ${generatedOn} · Distribution: Analytics leads`}>
          <div className="vw-flex vw-flex-col vw-gap-xs" style={{ marginBottom: 16 }}>
            <div style={{ height: 10, width: "100%", borderRadius: 5, background: "var(--vw-color-gray-100)" }} />
            <div style={{ height: 10, width: "92%", borderRadius: 5, background: "var(--vw-color-gray-100)" }} />
            <div style={{ height: 10, width: "80%", borderRadius: 5, background: "var(--vw-color-gray-100)" }} />
          </div>
          <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid var(--vw-color-slate-200)", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
              <thead style={{ background: "var(--vw-color-gray-50)" }}>
                <tr>
                  {["SLA metric", "Target", "Actual", "Status"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11.5, fontWeight: 500, color: "var(--vw-color-gray-500)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complianceRows.map((r) => (
                  <tr key={r.metric} style={{ borderTop: "1px solid var(--vw-color-slate-200)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 500, color: "var(--vw-color-gray-800)" }}>{r.metric}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--vw-color-gray-500)" }}>{r.target}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--vw-color-gray-700)" }}>{r.actual}%</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span className={`vw-chip ${r.onTrack ? "vw-chip--success" : "vw-chip--error"}`} style={{ fontSize: 10.5 }}>{r.onTrack ? "On track" : "At risk"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="vw-flex vw-flex-col vw-gap-xs">
            <div style={{ height: 10, width: "100%", borderRadius: 5, background: "var(--vw-color-gray-100)" }} />
            <div style={{ height: 10, width: "70%", borderRadius: 5, background: "var(--vw-color-gray-100)" }} />
          </div>
        </ChartCard>

        {/* Row 2 — schedule · sections · source dashboards */}
        <div className="vw-flex vw-wrap vw-gap-md vw-items-stretch">
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={Clock} title="Schedule"
              rows={[
                { label: "Frequency", value: frequency },
                { label: "Next run", value: frequency === "One-time" ? "—" : nextRun },
                { label: "Last run", value: lastRun },
                { label: "Distribution", value: "Analytics leads · PDF via email" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={FileText} title="Sections"
              rows={REPORT_SECTIONS.map((s, i) => ({ label: `Section ${i + 1}`, value: s }))}
            />
          </div>
          <div style={{ flex: "1 1 240px" }}>
            <InfoListCard
              icon={LayoutGrid} title="Source dashboards"
              rows={sourceDashboards.map((d, i) => ({ label: `Dashboard ${i + 1}`, value: d }))}
            />
          </div>
        </div>
      </div>

      {/* Details — right panel, not inline */}
      {showDetails && (
        <aside className="vw-card-section" style={{ width: 300, flexShrink: 0, position: "sticky", top: 0 }}>
          <div className="vw-flex vw-items-center vw-justify-between" style={{ marginBottom: 10 }}>
            <div className="vw-card-title-sm">Report details</div>
            <button type="button" onClick={() => setShowDetails(false)} className="text-muted-foreground hover:text-foreground" title="Close details">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="vw-flex vw-flex-col vw-gap-xs">
            {REPORT_DETAIL_ITEMS.map((w) => (
              <div key={w.name} className="vw-card-child-shaded">
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--vw-color-gray-800)" }}>{w.name}</div>
                <div className="vw-card-description" style={{ fontSize: 11.5 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function LivePreviewCard({ kind, title, approval, recurring, onEdit, onExplainAi, onSubmit, onDiscard, showActions = true }: {
  kind: BiTaskKind; title: string; approval?: ApprovalStatus; recurring?: string; onEdit: () => void; onExplainAi?: () => void; onSubmit: () => void; onDiscard: () => void; showActions?: boolean;
}) {
  const [seed, setSeed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Approval flow: Draft > Awaiting approval > Approved or Rejected.
  // Discard only exists in Draft; from Awaiting onward the reviewer decides.
  const isApproved = approval === "Approved";
  const isAwaiting = approval === "Awaiting approval";
  const canDiscard = !approval || approval === "Draft";

  const runNow = () => {
    if (running) return;
    setRunning(true);
    setTimeout(() => { setSeed((s) => s + 1); setHasRun(true); setRunning(false); }, 700);
  };
  const exportAs = (fmt: string) => {
    setExportOpen(false);
    setExported(fmt);
    setTimeout(() => setExported(null), 1800);
  };
  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };

  return (
    <div className="overflow-visible rounded-[12px] border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Preview</span>
          {approval && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ background: APPROVAL_STYLE[approval].bg, color: APPROVAL_STYLE[approval].fg, fontSize: "10.5px", fontWeight: 700 }}>
              {approval}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {kind === "dataset" && (
            <ToolbarIconButton icon={Eye} title="Preview" onClick={runNow} spinning={running} />
          )}
          {kind === "dashboard" && (
            <ToolbarIconButton icon={RefreshCw} title="Refresh" onClick={runNow} spinning={running} />
          )}
          {(kind === "widget" || kind === "report") && (
            <>
              <ToolbarIconButton icon={Play} title="Re-run" onClick={runNow} spinning={running} />
              <div className="relative">
                <ToolbarIconButton icon={Download} title="Export" onClick={() => setExportOpen((v) => !v)} active={exportOpen} />
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 top-9 z-50 min-w-[140px] overflow-hidden rounded-[10px] border border-border bg-card py-1 shadow-lg">
                      {EXPORT_FORMATS[kind].map((fmt) => (
                        <button key={fmt} onClick={() => exportAs(fmt)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-muted/50" style={{ fontSize: "12.5px", fontWeight: 500 }}>
                          <Download className="h-3.5 w-3.5" /> Export as {fmt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          <ToolbarIconButton icon={Edit} title="Edit" onClick={onEdit} />
        </div>
      </div>

      {exported && (
        <div className="border-b border-border bg-primary/5 px-4 py-1.5 text-primary" style={{ fontSize: "11.5px", fontWeight: 600 }}>
          Exported as {exported} ✓
        </div>
      )}

      <div className="p-5">
        <ItemPreviewBody kind={kind} title={title} seed={seed} hasRun={kind === "dataset" ? hasRun : true} />
      </div>

      {showActions && (
        <>
          {showExplain && (
            <div className="border-t border-border bg-[#FAFBFD] px-4 py-3">
              <p className="text-foreground" style={{ fontSize: "12.5px", lineHeight: 1.55 }}>{EXPLAIN[kind]}</p>
              {onExplainAi && (
                <button
                  onClick={onExplainAi}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-[9px] bg-primary px-3 py-1.5 text-white transition-opacity hover:opacity-90"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI Assistant
                </button>
              )}
            </div>
          )}

          {showDetails && (
            <div className="border-t border-border bg-[#FAFBFD] px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-foreground" style={{ fontSize: "12.5px", fontWeight: 700 }}>
                <Info className="h-3.5 w-3.5 text-primary" /> Details
              </div>
              <DetailsPanel kind={kind} title={title} />
            </div>
          )}

          {showSchedule && recurring && (
            <div className="border-t border-border bg-[#FAFBFD] px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-foreground" style={{ fontSize: "12.5px", fontWeight: 700 }}>
                <Clock className="h-3.5 w-3.5 text-primary" /> Scheduled · {recurring}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5" style={{ fontSize: "12px" }}>
                <div className="text-muted-foreground">Frequency</div><div className="text-foreground" style={{ fontWeight: 500 }}>{recurring}, 1st of the month · 07:00 IST</div>
                <div className="text-muted-foreground">Last run</div><div className="text-foreground" style={{ fontWeight: 500 }}>15-Jul-2026 07:40 · Completed</div>
                <div className="text-muted-foreground">Next run</div><div className="text-foreground" style={{ fontWeight: 500 }}>01-Aug-2026 07:00</div>
                <div className="text-muted-foreground">Distribution</div><div className="text-foreground" style={{ fontWeight: 500 }}>Analytics leads · PDF via email</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <button onClick={() => setShowExplain((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 hover:bg-muted/40 ${showExplain ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-foreground"}`} style={{ fontSize: "12.5px", fontWeight: 600 }}>
              <FileText className="h-3.5 w-3.5 text-primary" /> Summary
            </button>
            <button onClick={() => setShowDetails((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 hover:bg-muted/40 ${showDetails ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-foreground"}`} style={{ fontSize: "12.5px", fontWeight: 600 }}>
              <Info className="h-3.5 w-3.5 text-primary" /> Details
            </button>
            {recurring && (
              <button onClick={() => setShowSchedule((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 hover:bg-muted/40 ${showSchedule ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-foreground"}`} style={{ fontSize: "12.5px", fontWeight: 600 }}>
                <Clock className="h-3.5 w-3.5 text-primary" /> Scheduled · {recurring}
              </button>
            )}
            {!isApproved && (
              <button
                onClick={submit}
                disabled={submitting || isAwaiting}
                title={isAwaiting ? "Waiting for the reviewer" : undefined}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-foreground px-3 py-1.5 text-background hover:opacity-90 disabled:opacity-40"
                style={{ fontSize: "12.5px", fontWeight: 600 }}
              >
                <Check className="h-3.5 w-3.5" /> {isAwaiting ? "Awaiting approval" : submitting ? "Submitting…" : "Submit for approval"}
              </button>
            )}
            <div className="flex-1" />
            {canDiscard && (
              <button onClick={onDiscard} className="inline-flex items-center gap-1.5 text-destructive hover:opacity-80" style={{ fontSize: "12.5px", fontWeight: 600 }}>
                <Trash2 className="h-3.5 w-3.5" /> Discard
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat panel — used on the right (40%) of the chat view ──────────────────
function ChatPanel({ meta, task, intro, onClose }: { meta: { label: string }; task: BiTask; intro?: string; onClose: () => void }) {
  const [messages, setMessages] = useState<{ id: string; role: "assistant" | "user"; text: string }[]>([
    {
      id: "m0",
      role: "assistant",
      text: intro
        ? `Let me explain "${task.title}". ${intro} Ask me anything about how it works — or ask me to change it.`
        : `Hi, I'm the ${meta.label} agent. Ask me anything about "${task.title}" — I can adjust it, explain it, or rebuild a section.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { id: `u${m.length}`, role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a${m.length}`, role: "assistant", text: `Got it — updating "${task.title}" based on: "${text}". The preview on the left reflects the latest version.` }]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>Chat</div>
          <div className="text-muted-foreground" style={{ fontSize: "11.5px" }}>{meta.label}</div>
        </div>
        <button onClick={onClose} title="Close chat" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 ${m.role === "user" ? "bg-primary text-white" : "border border-border bg-card text-foreground"}`}
              style={{ fontSize: "13px", lineHeight: 1.5 }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && <div className="text-muted-foreground" style={{ fontSize: "12px" }}>Thinking…</div>}
      </div>
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-[10px] border border-border bg-[#FAFBFD] px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask the agent to change something…"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            style={{ fontSize: "13px" }}
          />
          <button onClick={send} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white hover:opacity-90">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign task — form shape adapts to which agent opened it ───────────────
// Application → datasource → dataset options are catalog-driven (see
// applicationCatalog.json) so each dropdown filters against the one above it,
// instead of three independent, unrelated flat lists.
const APPLICATION_CATALOG = applicationCatalog as {
  applications: { id: string; name: string; datasources: { id: string; name: string; datasets: { id: string; name: string }[] }[] }[];
};

const TASK_NOUN: Record<BiTaskKind, string> = { dataset: "dataset", widget: "widget", dashboard: "dashboard", report: "report" };
const PROMPT_PLACEHOLDER: Record<BiTaskKind, string> = {
  dataset: "Join CUSTOMER and ACCOUNT on customer_id, filter to active accounts only",
  widget: "Weekly trend of open tickets by severity",
  dashboard: "Overview of field crew utilization and open incidents by region",
  report: "Weekly report of open problems by severity for the field force team",
};

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <div className="mb-1.5 text-foreground" style={{ fontSize: "12.5px", fontWeight: 600 }}>
      {label} {optional && <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional)</span>}
    </div>
  );
}


export interface BreadcrumbState { extra: { label: string }[]; backToRoot?: () => void }

export function BiTasksAgent({ kind, onBreadcrumb, initialPrompt }: { kind: BiTaskKind; onBreadcrumb?: (state: BreadcrumbState) => void; initialPrompt?: string }) {
  const meta = KIND_META[kind];
  const tasks = TASKS_BY_KIND[kind];
  const userName = useCurrentUser();
  const [view, setView] = useState<"list" | "preview" | "chat" | "studio">(() => (initialPrompt ? "studio" : "list"));
  const [selected, setSelected] = useState<BiTask | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [explainIntro, setExplainIntro] = useState(false);
  const [errorTask, setErrorTask] = useState<BiTask | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const visibleTasks = tasks.filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()));

  const openPreview = (t: BiTask) => { setSelected(t); setView("preview"); };
  const openChat = (t: BiTask, explain = false) => { setSelected(t); setExplainIntro(explain); setView("chat"); };
  const backToList = () => { setView("list"); setSelected(null); };
  const flashAndBack = (message: string) => {
    setFlash(message);
    backToList();
    setTimeout(() => setFlash(null), 2500);
  };
  const selectedWidget = kind === "widget" && selected ? WIDGET_LIST.find((w) => w.id === selected.id) : undefined;
  const selectedDataset = kind === "dataset" && selected ? DATASET_LIST.find((d) => d.id === selected.id) : undefined;
  const selectedReport = kind === "report" && selected ? REPORT_LIST.find((r) => r.id === selected.id) : undefined;

  // --- AI Creation Studio (all 4 kinds) ----------------------------------
  type StudioMsg = { role: "user" | "agent"; text: string };
  const [studioMessages, setStudioMessages] = useState<StudioMsg[]>([]);
  const [studioInput, setStudioInput] = useState("");
  const [studioThinking, setStudioThinking] = useState(false);
  const [studioStage, setStudioStage] = useState<"gather" | "verify" | "generating" | "result" | "saved">("gather");
  const [studioApplication, setStudioApplication] = useState<string | null>(null);
  const [studioDatasource, setStudioDatasource] = useState<string | null>(null);
  const [studioDataset, setStudioDataset] = useState<string | null>(null);
  const [studioWidgetType, setStudioWidgetType] = useState<WidgetType>("Bar chart");
  const [studioReportDashboards, setStudioReportDashboards] = useState<string[]>([]);
  const [studioReportFrequency, setStudioReportFrequency] = useState<ReportFrequency | null>(null);
  const [studioSteps, setStudioSteps] = useState(0);
  const [studioSeed, setStudioSeed] = useState(0);
  const [studioTitle, setStudioTitle] = useState("");
  const [studioExpanded, setStudioExpanded] = useState(false);
  const initialPromptConsumed = useRef(false);

  const STUDIO_STEPS: Record<BiTaskKind, string[]> = {
    dashboard: ["Reading context", "Resolving datasets", "Composing layout"],
    widget: ["Reading context", "Resolving dataset", "Choosing visualization"],
    dataset: ["Reading context", "Resolving source", "Validating schema"],
    report: ["Reading context", "Gathering dashboards", "Drafting narrative"],
  };
  const STUDIO_BUILDING_MSG: Record<BiTaskKind, string> = {
    dashboard: "Building your dashboard — resolving datasets and composing the layout…",
    widget: "Building your widget — resolving the dataset and choosing a visualization…",
    dataset: "Building your dataset — resolving the source and validating the schema…",
    report: "Compiling your report — gathering the source dashboards and drafting the narrative…",
  };
  const STUDIO_READY_MSG: Record<BiTaskKind, string> = {
    dashboard: "Here's your dashboard — take a look on the right. Save it as a draft to keep working on it, or tell me what to change.",
    widget: "Here's your widget — take a look on the right. Save it as a draft to keep working on it, or tell me what to change.",
    dataset: "Here's your dataset — take a look on the right. Save it as a draft to keep working on it, or tell me what to change.",
    report: "Here's your report — take a look on the right. Save it as a draft to keep working on it, or tell me what to change.",
  };

  const extractCatalog = (text: string): { application: string | null; datasource: string | null; dataset: string | null } => {
    const lower = text.toLowerCase();
    for (const app of APPLICATION_CATALOG.applications) {
      if (!lower.includes(app.name.toLowerCase())) continue;
      for (const ds of app.datasources) {
        if (!lower.includes(ds.name.toLowerCase())) continue;
        for (const dset of ds.datasets) {
          if (lower.includes(dset.name.toLowerCase())) return { application: app.name, datasource: ds.name, dataset: dset.name };
        }
        return { application: app.name, datasource: ds.name, dataset: null };
      }
      return { application: app.name, datasource: null, dataset: null };
    }
    return { application: null, datasource: null, dataset: null };
  };

  const extractReportInfo = (text: string): { dashboards: string[]; frequency: ReportFrequency | null } => {
    const lower = text.toLowerCase();
    const dashboards = DASHBOARD_LIST.filter((d) => lower.includes(d.name.toLowerCase())).map((d) => d.name);
    let frequency: ReportFrequency | null = null;
    if (/\bweekly\b/.test(lower)) frequency = "Weekly";
    else if (/\bmonthly\b/.test(lower)) frequency = "Monthly";
    else if (/\bquarterly\b/.test(lower)) frequency = "Quarterly";
    else if (/\bone[\s-]?time\b/.test(lower)) frequency = "One-time";
    return { dashboards, frequency };
  };

  const inferWidgetType = (text: string): WidgetType | null => {
    const t = text.toLowerCase();
    if (/\bkpi\b|\btile\b/.test(t)) return "KPI tile";
    if (/\btable\b|\blist\b/.test(t)) return "Table";
    if (/\btrend\b|\bline\b/.test(t)) return "Line chart";
    if (/\bbar\b|\bcompare\b/.test(t)) return "Bar chart";
    return null;
  };

  const chooseStudioApplication = (value: string) => { setStudioApplication(value || null); setStudioDatasource(null); setStudioDataset(null); };
  const chooseStudioDatasource = (value: string) => { setStudioDatasource(value || null); setStudioDataset(null); };
  const toggleReportDashboard = (name: string) => setStudioReportDashboards((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  const studioSelectedApplication = APPLICATION_CATALOG.applications.find((a) => a.name === studioApplication);
  const studioDatasourceOptions = studioSelectedApplication?.datasources ?? [];
  const studioSelectedDatasource = studioDatasourceOptions.find((d) => d.name === studioDatasource);
  const studioDatasetOptions = studioSelectedDatasource?.datasets ?? [];
  const canGenerate =
    kind === "report" ? studioReportDashboards.length > 0 && !!studioReportFrequency
    : kind === "widget" ? !!studioApplication && !!studioDatasource && !!studioDataset
    : !!studioApplication && !!studioDatasource; // dashboard, dataset

  const sendStudioMessage = (raw?: string) => {
    const text = (raw ?? studioInput).trim();
    if (!text) return;
    setStudioMessages((m) => [...m, { role: "user", text }]);
    setStudioInput("");
    setStudioThinking(true);
    setTimeout(() => {
      let reply: string;
      if (kind === "report") {
        const found = extractReportInfo(text);
        const nextDashboards = found.dashboards.length ? Array.from(new Set([...studioReportDashboards, ...found.dashboards])) : studioReportDashboards;
        const nextFrequency = found.frequency ?? studioReportFrequency;
        setStudioReportDashboards(nextDashboards);
        setStudioReportFrequency(nextFrequency);
        if (nextDashboards.length && nextFrequency) {
          reply = `Got it — I'll compile a ${nextFrequency.toLowerCase()} report from ${nextDashboards.join(", ")}. Review on the right and click Generate when you're ready.`;
        } else if (nextDashboards.length) {
          reply = `Thanks — I'll pull from ${nextDashboards.join(", ")}. I couldn't tell how often you want it, so pick a frequency on the right.`;
        } else if (nextFrequency) {
          reply = `Got it — ${nextFrequency}. I couldn't find a specific dashboard in that, so pick one or more on the right.`;
        } else {
          reply = "Got it — I couldn't find a specific dashboard or cadence in that, so please pick the source dashboards and frequency on the right.";
        }
      } else {
        const found = extractCatalog(text);
        const nextApp = found.application ?? studioApplication;
        const nextDs = found.application ? found.datasource : studioDatasource;
        const nextDset = found.application ? found.dataset : studioDataset;
        setStudioApplication(nextApp);
        setStudioDatasource(nextDs);
        setStudioDataset(nextDset);
        if (kind === "widget") {
          const wt = inferWidgetType(text);
          if (wt) setStudioWidgetType(wt);
        }
        const needsDataset = kind === "widget";
        if (nextApp && nextDs && (!needsDataset || nextDset)) {
          reply = `Got it — I'll use ${nextApp} → ${nextDs}${nextDset ? ` → ${nextDset}` : ""}. Review the details on the right and click Generate when you're ready.`;
        } else if (nextApp && nextDs) {
          reply = `Thanks — I'll use ${nextApp} → ${nextDs}. Pick a dataset on the right to continue.`;
        } else if (nextApp) {
          reply = `Thanks — I'll use ${nextApp}. I couldn't tell which datasource from that, so pick one on the right.`;
        } else {
          reply = "Got it — I couldn't find a specific application in that, so please choose the details on the right.";
        }
      }
      setStudioThinking(false);
      setStudioMessages((m) => [...m, { role: "agent", text: reply }]);
      setStudioStage((s) => (s === "gather" ? "verify" : s));
    }, 650);
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    setStudioStage("generating");
    setStudioSteps(0);
    setStudioMessages((m) => [...m, { role: "agent", text: STUDIO_BUILDING_MSG[kind] }]);
    setTimeout(() => setStudioSteps(1), 500);
    setTimeout(() => setStudioSteps(2), 1050);
    setTimeout(() => {
      setStudioSteps(3);
      let title: string;
      if (kind === "report") {
        title = studioReportDashboards.length === 1
          ? `${studioReportDashboards[0]} report`
          : `${studioReportFrequency} report (${studioReportDashboards.length} dashboards)`;
      } else if (kind === "widget") {
        title = `${studioDataset} widget`;
      } else if (kind === "dataset") {
        title = `${studioDatasource} dataset`;
      } else {
        title = studioDataset ? `${studioDataset} dashboard` : studioDatasource ? `${studioDatasource} dashboard` : "New AI dashboard";
      }
      setStudioTitle(title);
      setStudioSeed(Date.now());
      setStudioStage("result");
      setStudioMessages((m) => [...m, { role: "agent", text: STUDIO_READY_MSG[kind] }]);
    }, 1650);
  };

  const handleSaveDraft = () => {
    const id = `ai-${Date.now()}`;
    const mapping = APP_TO_PACKAGE[studioApplication ?? ""] ?? { packageName: "ANALYTICS", moduleName: "Operations analytics" };
    if (kind === "dashboard") {
      DASHBOARD_LIST.unshift({
        id, status: "Draft", name: studioTitle, displayName: studioTitle,
        packageName: mapping.packageName, moduleName: mapping.moduleName, accessLevel: "Private",
        scheduled: false, creatorName: userName, lastActivityAgo: "Just now", lastActivityBy: userName,
      });
    } else if (kind === "widget") {
      WIDGET_LIST.unshift({
        id, status: "Draft", name: studioTitle, displayName: studioTitle,
        packageName: mapping.packageName, moduleName: mapping.moduleName, accessLevel: "Private",
        widgetType: studioWidgetType, datasetName: studioDataset ?? "—",
        creatorName: userName, lastActivityAgo: "Just now", lastActivityBy: userName,
      });
    } else if (kind === "dataset") {
      DATASET_LIST.unshift({
        id, status: "Draft", name: studioTitle, displayName: studioTitle,
        packageName: mapping.packageName, moduleName: mapping.moduleName, accessLevel: "Private",
        rowCount: pick([1240, 3860, 9120, 15400], seedFromId(id)), sourceType: studioDatasource ?? "—",
        creatorName: userName, lastActivityAgo: "Just now", lastActivityBy: userName,
      });
    } else {
      REPORT_LIST.unshift({
        id, status: "Draft", name: studioTitle, displayName: studioTitle,
        packageName: "ANALYTICS", moduleName: "Operations analytics", accessLevel: "Private",
        frequency: studioReportFrequency ?? "Monthly", sourceDashboards: studioReportDashboards,
        creatorName: userName, lastActivityAgo: "Just now", lastActivityBy: userName,
      });
    }
    setStudioStage("saved");
    setStudioMessages((m) => [...m, { role: "agent", text: `Saved "${studioTitle}" as a draft ✓ — you'll find it at the top of your ${TASK_NOUN[kind]} list.` }]);
  };

  const studioGreeting = (): StudioMsg => ({
    role: "agent",
    text: kind === "report"
      ? `Hi! I'm the ${meta.label}. Tell me which dashboards to pull from and how often, and I'll draft the report.`
      : `Hi! I'm the ${meta.label}. Describe the ${TASK_NOUN[kind]} you'd like and I'll get started — mention the application or data if you know it.`,
  });

  const resetStudio = () => {
    setStudioMessages([studioGreeting()]); setStudioStage("gather");
    setStudioApplication(null); setStudioDatasource(null); setStudioDataset(null);
    setStudioWidgetType("Bar chart"); setStudioReportDashboards([]); setStudioReportFrequency(null);
    setStudioTitle(""); setStudioExpanded(false);
  };

  useEffect(() => {
    setStudioMessages([studioGreeting()]);
    if (initialPrompt && !initialPromptConsumed.current) {
      initialPromptConsumed.current = true;
      sendStudioMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onBreadcrumb) return;
    if (view === "list") onBreadcrumb({ extra: [] });
    else if (selected) onBreadcrumb({ extra: [{ label: selected.title }], backToRoot: backToList });
    else onBreadcrumb({ extra: [], backToRoot: backToList });
  }, [view, selected]);

  if (view === "preview" && selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {kind === "dashboard" ? (
            <DashboardPreview
              title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
              onExplainAi={() => openChat(selected, true)}
              onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
              onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
            />
          ) : kind === "widget" ? (
            <WidgetPreview
              title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
              widgetType={selectedWidget?.widgetType ?? "Bar chart"} datasetName={selectedWidget?.datasetName ?? "—"}
              onExplainAi={() => openChat(selected, true)}
              onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
              onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
            />
          ) : kind === "dataset" ? (
            <DatasetPreview
              title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
              sourceType={selectedDataset?.sourceType ?? "Warehouse (Snowflake)"}
              onExplainAi={() => openChat(selected, true)}
              onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
              onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
            />
          ) : kind === "report" ? (
            <ReportPreview
              title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
              frequency={selectedReport?.frequency ?? "Monthly"} sourceDashboards={selectedReport?.sourceDashboards ?? []}
              onExplainAi={() => openChat(selected, true)}
              onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
              onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
            />
          ) : (
            <div className="mx-auto max-w-[760px]">
              <LivePreviewCard
                kind={kind} title={selected.title} approval={selected.approval} recurring={selected.recurring}
                onEdit={() => openChat(selected)}
                onExplainAi={() => openChat(selected, true)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "chat" && selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="w-[60%] flex-shrink-0 overflow-y-auto border-r border-border px-6 py-5">
            {kind === "dashboard" ? (
              <DashboardPreview
                title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
                onExplainAi={() => openChat(selected, true)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
              />
            ) : kind === "widget" ? (
              <WidgetPreview
                title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
                widgetType={selectedWidget?.widgetType ?? "Bar chart"} datasetName={selectedWidget?.datasetName ?? "—"}
                onExplainAi={() => openChat(selected, true)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
              />
            ) : kind === "dataset" ? (
              <DatasetPreview
                title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
                sourceType={selectedDataset?.sourceType ?? "Warehouse (Snowflake)"}
                onExplainAi={() => openChat(selected, true)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
              />
            ) : kind === "report" ? (
              <ReportPreview
                title={selected.title} approval={selected.approval} seed={seedFromId(selected.id)}
                frequency={selectedReport?.frequency ?? "Monthly"} sourceDashboards={selectedReport?.sourceDashboards ?? []}
                onExplainAi={() => openChat(selected, true)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
              />
            ) : (
              <LivePreviewCard
                kind={kind} title={selected.title} approval={selected.approval} recurring={selected.recurring}
                onEdit={() => openChat(selected)}
                onSubmit={() => flashAndBack(`"${selected.title}" submitted for approval ✓`)}
                onDiscard={() => flashAndBack(`"${selected.title}" discarded`)}
                showActions={false}
              />
            )}
          </div>
          <div className="w-[40%] flex-shrink-0">
            <ChatPanel meta={meta} task={selected} intro={explainIntro ? EXPLAIN[kind] : undefined} onClose={() => setView("preview")} />
          </div>
        </div>
      </div>
    );
  }

  if (view === "studio") {
    const renderResultPreview = () => {
      if (kind === "widget") {
        return (
          <WidgetPreview
            title={studioTitle} approval={undefined} seed={studioSeed}
            widgetType={studioWidgetType} datasetName={studioDataset ?? "—"}
            onExplainAi={() => {}} onSubmit={() => {}} onDiscard={() => {}} hideActions
          />
        );
      }
      if (kind === "dataset") {
        return (
          <DatasetPreview
            title={studioTitle} approval={undefined} seed={studioSeed} sourceType={studioDatasource ?? "—"}
            onExplainAi={() => {}} onSubmit={() => {}} onDiscard={() => {}} hideActions
          />
        );
      }
      if (kind === "report") {
        return (
          <ReportPreview
            title={studioTitle} approval={undefined} seed={studioSeed}
            frequency={studioReportFrequency ?? "Monthly"} sourceDashboards={studioReportDashboards}
            onExplainAi={() => {}} onSubmit={() => {}} onDiscard={() => {}} hideActions
          />
        );
      }
      return (
        <DashboardPreview
          title={studioTitle} approval={undefined} seed={studioSeed}
          onExplainAi={() => {}} onSubmit={() => {}} onDiscard={() => {}} hideActions
        />
      );
    };

    if (studioExpanded) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
            <span className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>{studioTitle || `${meta.label} preview`}</span>
            <button onClick={() => setStudioExpanded(false)} className="nst-btn nst-btn--sm"><X style={{ width: 14, height: 14 }} /> Exit full screen</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{renderResultPreview()}</div>
        </div>
      );
    }

    const userText = studioMessages.filter((m) => m.role === "user").map((m) => m.text).join(" ");

    return (
      <div className="flex h-full">
        {/* Left — chat, 40% */}
        <div className="flex w-[40%] flex-shrink-0 flex-col border-r border-border">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-card px-5 py-3">
            <meta.icon className="h-4 w-4 text-primary" />
            <span className="text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>{meta.label} — AI Assistant</span>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {studioMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 ${m.role === "user" ? "bg-primary text-white" : "bg-muted/50 text-foreground"}`}
                  style={{ fontSize: "13px", lineHeight: 1.5 }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {studioThinking && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-1 rounded-[12px] bg-muted/50 px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 border-t border-border px-4 py-3">
            <div className="flex items-end gap-2 rounded-[12px] border border-border bg-card px-3 py-2 focus-within:border-primary/40">
              <textarea
                value={studioInput}
                onChange={(e) => setStudioInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendStudioMessage(); } }}
                placeholder={PROMPT_PLACEHOLDER[kind]}
                rows={2}
                className="min-w-0 flex-1 resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                style={{ fontSize: "13px" }}
              />
              <button
                onClick={() => sendStudioMessage()}
                disabled={!studioInput.trim()}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-35"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right — result / steps, 60% */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {studioStage === "gather" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <meta.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                {kind === "report" ? "Which dashboards should this report cover?" : `Describe the ${TASK_NOUN[kind]} you'd like`}
              </div>
              <p className="mt-1.5 max-w-[320px] text-muted-foreground" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>
                {kind === "report"
                  ? "Mention the dashboards and how often — I'll fill in the rest, or pick manually."
                  : "Mention the application or data if you know it — I'll fill in the rest, or you can pick it manually."}
              </p>
            </div>
          )}

          {studioStage === "verify" && (
            <div className="mx-auto max-w-[640px]">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>Confirm the details</span>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-5">
                {kind === "report" ? (
                  <>
                    <FieldLabel label="Source dashboards" />
                    <div className="max-h-[220px] space-y-1 overflow-y-auto rounded-[10px] border border-border p-2">
                      {DASHBOARD_LIST.map((d) => (
                        <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-muted/40">
                          <input type="checkbox" checked={studioReportDashboards.includes(d.name)} onChange={() => toggleReportDashboard(d.name)} />
                          <span className="text-foreground" style={{ fontSize: "12.5px", fontWeight: 500 }}>{d.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <FieldLabel label="Frequency" />
                      <select
                        value={studioReportFrequency ?? ""}
                        onChange={(e) => setStudioReportFrequency((e.target.value || null) as ReportFrequency | null)}
                        className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-foreground outline-none"
                        style={{ fontSize: "13px", fontWeight: 600 }}
                      >
                        <option value="" disabled>Choose a frequency…</option>
                        {(["Weekly", "Monthly", "Quarterly", "One-time"] as ReportFrequency[]).map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className={`grid gap-4 ${kind === "widget" ? "md:grid-cols-4" : kind === "dataset" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                    <div>
                      <FieldLabel label="Application" />
                      <select value={studioApplication ?? ""} onChange={(e) => chooseStudioApplication(e.target.value)} className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-foreground outline-none" style={{ fontSize: "13px", fontWeight: 600 }}>
                        <option value="" disabled>Choose an application…</option>
                        {APPLICATION_CATALOG.applications.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label="Datasource" />
                      <select value={studioDatasource ?? ""} disabled={!studioApplication} onChange={(e) => chooseStudioDatasource(e.target.value)} className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50" style={{ fontSize: "13px", fontWeight: 600 }}>
                        <option value="" disabled>{studioApplication ? "Choose a datasource…" : "Select an application first"}</option>
                        {studioDatasourceOptions.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    {kind !== "dataset" && (
                      <div>
                        <FieldLabel label="Dataset" optional={kind === "dashboard"} />
                        <select value={studioDataset ?? ""} disabled={!studioDatasource} onChange={(e) => setStudioDataset(e.target.value || null)} className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50" style={{ fontSize: "13px", fontWeight: 600 }}>
                          <option value="">{studioDatasource ? "Choose a dataset…" : "Select a datasource first"}</option>
                          {studioDatasetOptions.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                    )}
                    {kind === "widget" && (
                      <div>
                        <FieldLabel label="Widget type" />
                        <select value={studioWidgetType} onChange={(e) => setStudioWidgetType(e.target.value as WidgetType)} className="w-full rounded-[10px] border border-border bg-card px-3 py-2.5 text-foreground outline-none" style={{ fontSize: "13px", fontWeight: 600 }}>
                          {(["KPI tile", "Bar chart", "Line chart", "Table"] as WidgetType[]).map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {userText && (
                  <div className="mt-4 rounded-[10px] bg-muted/30 px-3.5 py-3">
                    <div className="text-muted-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>YOUR REQUEST</div>
                    <p className="mt-1 text-foreground" style={{ fontSize: "12.5px", lineHeight: 1.5 }}>{userText}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-5 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  <Sparkles className="h-4 w-4" /> Generate {TASK_NOUN[kind]}
                </button>
              </div>
            </div>
          )}

          {studioStage === "generating" && (
            <div className="mx-auto flex max-w-[420px] flex-col items-center py-20 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader className="h-7 w-7 animate-spin text-primary" />
              </div>
              <div className="mb-5 text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Building your {TASK_NOUN[kind]}…</div>
              <div className="w-full space-y-2.5 text-left">
                {STUDIO_STEPS[kind].map((label, i) => (
                  <div key={label} className="flex items-center gap-2.5">
                    {studioSteps > i ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#047857]" />
                    ) : studioSteps === i ? (
                      <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 flex-shrink-0 rounded-full border border-border" />
                    )}
                    <span className="text-foreground" style={{ fontSize: "13px", fontWeight: studioSteps >= i ? 600 : 400, opacity: studioSteps >= i ? 1 : 0.5 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(studioStage === "result" || studioStage === "saved") && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>{studioStage === "saved" ? "Saved as draft" : `Your ${TASK_NOUN[kind]} is ready`}</span>
                <button onClick={() => setStudioExpanded(true)} className="nst-btn nst-btn--sm"><Maximize2 style={{ width: 14, height: 14 }} /> Expand</button>
              </div>
              <div className="rounded-[14px] border border-border bg-card p-5">
                {renderResultPreview()}
              </div>
              {studioStage === "result" ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-primary/20 bg-primary/5 px-4 py-3">
                  <span className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>Save this {TASK_NOUN[kind]} to keep working on it later?</span>
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={resetStudio} className="nst-btn nst-btn--sm">Discard</button>
                    <button onClick={handleSaveDraft} className="nst-btn nst-btn--filled nst-btn--sm"><Check style={{ width: 14, height: 14 }} /> Save as draft</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3" style={{ borderColor: "#D1FAE5", background: "#ECFDF5" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#047857" }}>Saved ✓ — find it in your {TASK_NOUN[kind]} list anytime.</span>
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={resetStudio} className="nst-btn nst-btn--sm">Create another</button>
                    <button onClick={() => setView("list")} className="nst-btn nst-btn--filled nst-btn--sm">View in list</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-primary/10">
            <meta.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-foreground" style={{ fontSize: "17px", fontWeight: 600 }}>{meta.label}</div>
            <div className="truncate text-muted-foreground" style={{ fontSize: "12px" }}>{meta.subtitle}</div>
          </div>
        </div>
        <button
          onClick={() => setShowDoc((v) => !v)}
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-[9px] border px-3 py-1.5 hover:bg-muted/40 ${showDoc ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-foreground"}`}
          style={{ fontSize: "12px", fontWeight: 600 }}
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" /> How to use
        </button>
      </div>

      {errorTask && (
        <ErrorModal
          task={errorTask}
          kind={kind}
          onClose={() => setErrorTask(null)}
          onRetry={() => { setErrorTask(null); setFlash(`Retry queued for "${errorTask.title}" ✓`); setTimeout(() => setFlash(null), 2500); }}
          onAskAgent={() => { const t = errorTask; setErrorTask(null); openChat(t); }}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {flash && (
          <div className="mb-4 rounded-[10px] border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-primary" style={{ fontSize: "12.5px", fontWeight: 600 }}>
            {flash}
          </div>
        )}
        {kind === "dashboard" ? (
          <DashboardsListView
            onOpen={(row) => openPreview(dashboardRowToTask(row))}
            onCreate={() => { resetStudio(); setView("studio"); }}
            onFlash={(message) => { setFlash(message); setTimeout(() => setFlash(null), 2500); }}
          />
        ) : kind === "widget" ? (
          <WidgetsListView
            onOpen={(row) => openPreview(widgetRowToTask(row))}
            onCreate={() => { resetStudio(); setView("studio"); }}
            onFlash={(message) => { setFlash(message); setTimeout(() => setFlash(null), 2500); }}
          />
        ) : kind === "dataset" ? (
          <DatasetsListView
            onOpen={(row) => openPreview(datasetRowToTask(row))}
            onCreate={() => { resetStudio(); setView("studio"); }}
            onFlash={(message) => { setFlash(message); setTimeout(() => setFlash(null), 2500); }}
          />
        ) : kind === "report" ? (
          <ReportsListView
            onOpen={(row) => openPreview(reportRowToTask(row))}
            onCreate={() => { resetStudio(); setView("studio"); }}
            onFlash={(message) => { setFlash(message); setTimeout(() => setFlash(null), 2500); }}
          />
        ) : (
        <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>Requests</span>
            </div>
            <p className="mt-1 text-muted-foreground" style={{ fontSize: "12.5px" }}>
              AI-submitted work runs here in the background — queued, picked up, and completed without needing a live chat session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests…"
                className="w-[220px] rounded-[10px] border border-border bg-card py-2 pl-8 pr-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                style={{ fontSize: "12.5px" }}
              />
            </div>
            <div className="flex overflow-hidden rounded-[10px] border border-border bg-muted/40 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          visibleTasks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" style={{ fontSize: "12.5px" }}>No requests match "{search}".</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTasks.map((t) => {
                const st = STAGE_STYLE[t.stage];
                const StageIcon = st.icon;
                const previewable = t.stage === "Completed";
                const MetaIcon = meta.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => { if (previewable) openPreview(t); }}
                    className={`rounded-[13px] border border-border bg-card p-4 transition-shadow ${previewable ? "cursor-pointer hover:border-primary/40" : ""}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                          <MetaIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="truncate text-foreground" style={{ fontSize: "14px", fontWeight: 700 }}>{t.title}</span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          task={t}
                          open={openMenuId === t.id}
                          onToggle={() => setOpenMenuId((id) => (id === t.id ? null : t.id))}
                          onClose={() => setOpenMenuId(null)}
                          onPreview={() => openPreview(t)}
                          onChat={() => openChat(t)}
                          onViewError={() => { setErrorTask(t); setOpenMenuId(null); }}
                        />
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: st.bg, color: st.fg, fontSize: "11.5px", fontWeight: 600 }}>
                        <StageIcon className={`h-3 w-3 ${t.stage === "Running" ? "animate-spin" : ""}`} /> {t.stage}
                      </span>
                      {t.approval && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ background: APPROVAL_STYLE[t.approval].bg, color: APPROVAL_STYLE[t.approval].fg, fontSize: "11px", fontWeight: 700 }}>{t.approval}</span>
                      )}
                      {t.recurring && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-secondary-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><Clock className="h-3 w-3" /> {t.recurring}</span>
                      )}
                    </div>
                    <div className="border-t border-border pt-2.5">
                      <div className="flex items-center justify-between gap-2" style={{ fontSize: "12px" }}>
                        <span className="text-muted-foreground">{t.app}</span>
                        <span className="text-muted-foreground">{t.createdOn}</span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground" style={{ fontSize: "12px" }}>{t.requestedBy}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
        <div className="overflow-visible rounded-[12px] border border-border bg-card">
          <table className="w-full border-collapse">
            <thead className="bg-[#FCFCFD]">
              <tr>
                {["Stage", "Status", "Request", "Application", "Requested by", "Created on", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => {
                const st = STAGE_STYLE[t.stage];
                const StageIcon = st.icon;
                const previewable = t.stage === "Completed";
                return (
                  <tr
                    key={t.id}
                    onClick={() => { if (previewable) openPreview(t); }}
                    className={`border-t border-border hover:bg-[#FAFBFD] ${previewable ? "cursor-pointer" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5" style={{ background: st.bg, color: st.fg, fontSize: "12px", fontWeight: 600 }}>
                        <StageIcon className={`h-3 w-3 ${t.stage === "Running" ? "animate-spin" : ""}`} /> {t.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {t.approval ? (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5" style={{ background: APPROVAL_STYLE[t.approval].bg, color: APPROVAL_STYLE[t.approval].fg, fontSize: "11.5px", fontWeight: 700 }}>
                          {t.approval}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" style={{ fontSize: "12.5px" }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                      {t.title}
                      {t.recurring && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-secondary-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><Clock className="h-3 w-3" /> {t.recurring}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground" style={{ fontSize: "13px" }}>{t.app}</td>
                    <td className="px-3 py-2.5 text-muted-foreground" style={{ fontSize: "13px" }}>{t.requestedBy}</td>
                    <td className="px-3 py-2.5 text-muted-foreground" style={{ fontSize: "13px" }}>{t.createdOn}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        task={t}
                        open={openMenuId === t.id}
                        onToggle={() => setOpenMenuId((id) => (id === t.id ? null : t.id))}
                        onClose={() => setOpenMenuId(null)}
                        onPreview={() => openPreview(t)}
                        onChat={() => openChat(t)}
                        onViewError={() => { setErrorTask(t); setOpenMenuId(null); }}
                      />
                    </td>
                  </tr>
                );
              })}
              {visibleTasks.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground" style={{ fontSize: "12.5px" }}>No requests match "{search}".</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
        </>
        )}
      </div>
      </div>
      {showDoc && <AgentDocPanel agentKey={kind} onClose={() => setShowDoc(false)} />}
    </div>
  );
}
