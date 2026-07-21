import { useState } from "react";
import { Plus, ChevronDown, Mic, ArrowUp, AlertTriangle, CheckSquare, Maximize2, Sparkles, Filter } from "../icons";
import { TONE, type Persona, type Agent } from "./personas";
import { useCurrentUser } from "./CurrentUser";

// Ask-first home for every persona. One prompt across the team; the specialist agents
// sit quietly below; what needs a human lives in the right rail. Minimal navigation.
interface Att { sev: "Critical" | "High" | "Medium"; area: string; title: string }
interface Task { state: "Pending" | "Overdue"; title: string; from: string }
interface HomeCfg { greeting: string; placeholder: string; starters: string[]; attention: Att[]; tasks: Task[] }

const HOME: Record<string, HomeCfg> = {
  bi: {
    greeting: "what would you like to build?",
    placeholder: "Ask across every agent — build, visualize, compose, or report…",
    starters: ["Build a dataset from Orders and Customers", "Create a revenue KPI widget", "Compose a Q3 sales dashboard", "Generate this week's executive report"],
    attention: [
      { sev: "Critical", area: "Dashboard", title: "Q3 Revenue dashboard failed to refresh — 3 widgets stale" },
      { sev: "High", area: "Dataset", title: "orders_summary dataset build failed — schema mismatch" },
      { sev: "High", area: "Report", title: "Weekly Ops report missed its 8am schedule" },
      { sev: "Medium", area: "Widget", title: "5 widgets reference a deprecated dataset" },
    ],
    tasks: [
      { state: "Pending", title: "Approve the new customer_360 dashboard for sharing", from: "Dashboard Composer agent" },
      { state: "Overdue", title: "Review revenue_kpi widget before publish", from: "Widget Builder agent" },
      { state: "Pending", title: "Confirm dataset schema for Marketing Spend", from: "Dataset Creator agent" },
    ],
  },
};
const FALLBACK: HomeCfg = { greeting: "how can I help?", placeholder: "Ask your agents…", starters: [], attention: [], tasks: [] };

const SEV: Record<string, string> = { Critical: "#B91C1C", High: "#C2410C", Medium: "#B0870F" };
const SEV_BG: Record<string, string> = { Critical: "#FEE2E2", High: "#FFEDD5", Medium: "#FFEDD5" };

const SOURCE_OPTIONS = ["All types", "Datasources", "Datasets", "Widgets", "Reports", "Dashboards"];

export function PersonaHome({ persona, onOpenAgent, onAsk }: { persona: Persona; onOpenAgent: (a: Agent) => void; onAsk?: (text: string) => void }) {
  const [ask, setAsk] = useState("");
  const submitAsk = () => {
    const text = ask.trim();
    if (!text) return;
    onAsk?.(text);
    setAsk("");
  };
  const [source, setSource] = useState(SOURCE_OPTIONS[0]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [addAgentClicked, setAddAgentClicked] = useState(false);
  const cfg = HOME[persona.id] ?? FALLBACK;
  const hasRail = cfg.attention.length > 0 || cfg.tasks.length > 0;
  const userName = useCurrentUser();

  return (
    <div className="flex h-full min-h-0">
      {/* Main — ask box stays put; agents are the only thing that scrolls */}
      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <div className="mx-auto w-full max-w-[860px] flex-shrink-0 px-6 pb-2 pt-[7vh]">
          <h1 className="mb-6 text-center text-foreground" style={{ fontSize: "27px", fontWeight: 600 }}>
            Hi {userName}, {cfg.greeting}
          </h1>

          {/* Ask box */}
          <div className="rounded-[24px] border border-border bg-card px-5 pt-5 pb-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-[0_8px_24px_rgba(37,99,235,0.10)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <input
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitAsk(); }}
                placeholder={cfg.placeholder}
                className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground truncate"
                style={{ fontSize: "16px" }}
              />
            </div>
            <div className="mt-3.5 flex items-center gap-2 border-t border-border/70 pt-3">
              <div className="relative">
                <button
                  onClick={() => setSourceOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${sourceOpen ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/30 hover:bg-primary/5"}`}
                  style={{ fontSize: "12.5px", fontWeight: 500 }}
                >
                  <Filter className="h-3 w-3" />
                  {source} <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sourceOpen ? "rotate-180" : ""}`} />
                </button>
                {sourceOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSourceOpen(false)} />
                    <div className="absolute left-0 top-10 z-50 min-w-[170px] overflow-hidden rounded-[12px] border border-border bg-card py-1 shadow-lg">
                      {SOURCE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setSource(opt); setSourceOpen(false); }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50 ${opt === source ? "text-primary" : "text-foreground"}`}
                          style={{ fontSize: "12.5px", fontWeight: opt === source ? 600 : 500 }}
                        >
                          {opt} {opt === source && <span style={{ fontSize: "11px" }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1" />
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"><Mic className="h-4 w-4" /></button>
              <button
                onClick={submitAsk}
                disabled={!ask.trim()}
                title="Send"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-35 disabled:shadow-none"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Starter chips */}
          {cfg.starters.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {cfg.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => setAsk(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  style={{ fontSize: "12px" }}
                >
                  <Sparkles className="h-3 w-3 opacity-60" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Your agents — the ask box above stays fixed; this list scrolls on its own */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[860px] px-6 pb-16 pt-8">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>Your agents</span>
            <span className="text-muted-foreground" style={{ fontSize: "12.5px" }}>{persona.agents.length} on call</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {persona.agents.map((agent) => {
              const [from, to] = TONE[agent.tone];
              const Icon = agent.icon;
              return (
                <button key={agent.name} onClick={() => onOpenAgent(agent)} className="group relative flex items-start gap-3 rounded-[13px] border border-border bg-card p-3.5 text-left transition-shadow hover:border-primary/40 hover:z-10">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: to }}>
                    <Icon className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>{agent.name.replace(" Agent", "")}</div>
                    <div className="mt-0.5 line-clamp-2 text-muted-foreground" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>{agent.desc}</div>
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[260px] max-w-[85vw] -translate-x-1/2 scale-95 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100" style={{ fontSize: "11.5px", lineHeight: 1.5 }}>
                    {agent.desc}
                  </div>
                </button>
              );
            })}
            <button
              disabled={addAgentClicked}
              onClick={() => setAddAgentClicked(true)}
              title={addAgentClicked ? "Custom agents are coming soon" : "Add a custom agent"}
              className={`flex items-start gap-3 rounded-[13px] border border-dashed border-border bg-transparent p-3.5 text-left transition-all ${addAgentClicked ? "cursor-not-allowed opacity-50" : "hover:border-primary/40 hover:bg-primary/[0.02]"}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-dashed border-border">
                <Plus className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-foreground" style={{ fontSize: "13.5px", fontWeight: 600 }}>Add custom agent</div>
                <div className="mt-0.5 line-clamp-2 text-muted-foreground" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>
                  {addAgentClicked ? "Coming soon — defining your own agents isn't available yet." : "Define your own agent with its instructions and data scope."}
                </div>
              </div>
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Right rail — what needs a human */}
      {hasRail && (
        <aside className="hidden w-[320px] flex-shrink-0 overflow-y-auto border-l border-border bg-[#FCFCFD] px-4 py-5 xl:block">
          {cfg.attention.length > 0 && (<>
            <RailHeader icon={AlertTriangle} label="Needs attention" count={cfg.attention.length} tint="#C2410C" />
            <div className="mb-6 space-y-2.5">
              {cfg.attention.map((a, i) => (
                <div key={i} className="rounded-[11px] border border-border bg-card p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="rounded-full px-1.5 py-0.5" style={{ fontSize: "9.5px", fontWeight: 700, color: SEV[a.sev], background: SEV_BG[a.sev] }}>{a.sev}</span>
                    <span className="text-muted-foreground" style={{ fontSize: "10.5px" }}>{a.area}</span>
                  </div>
                  <div className="text-foreground" style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>{a.title}</div>
                </div>
              ))}
            </div>
          </>)}

          {cfg.tasks.length > 0 && (<>
            <RailHeader icon={CheckSquare} label="My tasks" count={cfg.tasks.length} tint="#2563EB" />
            <div className="space-y-2.5">
              {cfg.tasks.map((t, i) => (
                <div key={i} className="rounded-[11px] border border-border bg-card p-3">
                  <span className="mb-1 inline-block rounded-full px-1.5 py-0.5" style={{ fontSize: "9.5px", fontWeight: 700, color: t.state === "Overdue" ? "#C2410C" : "#5F6B7A", background: t.state === "Overdue" ? "#FFEDD5" : "#EEF1F4" }}>{t.state}</span>
                  <div className="text-foreground" style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>{t.title}</div>
                  <div className="mt-0.5 text-muted-foreground" style={{ fontSize: "10.5px" }}>{t.from}</div>
                </div>
              ))}
            </div>
          </>)}
        </aside>
      )}
    </div>
  );
}

function RailHeader({ icon: Icon, label, count, tint }: { icon: typeof AlertTriangle; label: string; count: number; tint: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: tint }} />
      <span className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>{label}</span>
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FEE2E2] px-1 text-[#B91C1C]" style={{ fontSize: "10.5px", fontWeight: 700 }}>{count}</span>
      <Maximize2 className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
