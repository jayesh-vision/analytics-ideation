import { useState } from "react";
import { ChevronRight } from "../icons";
import { PERSONAS, type Agent } from "./personas";
import { PersonaHome } from "./CatalogHome";
import { ComingSoon } from "./ComingSoon";
import { BiTasksAgent, type BiTaskKind, type BreadcrumbState } from "../surfaces/BiTasksAgent";
import { ExplainerAgent } from "../surfaces/ExplainerAgent";

// The BI Analytics shell: no chrome beyond the app itself — the persona home screen
// shows the agent grid, and opening an agent mounts its native surface under a single
// breadcrumb trail (Home > Agent > current item) back to Home.
const persona = PERSONAS[0];
const ROOT_CRUMBS: BreadcrumbState = { extra: [] };

// Lightweight client-side "orchestrator": guesses which BI task kind a free-text
// ask is about, so Home's ask box can route straight into that agent's AI
// Creation Studio with the typed text as the opening chat message.
function inferKind(text: string): BiTaskKind {
  const t = text.toLowerCase();
  if (/\breport\b/.test(t)) return "report";
  if (/\bwidget\b|\bchart\b|\bkpi\b/.test(t)) return "widget";
  if (/\bdataset\b|\bdata set\b/.test(t)) return "dataset";
  return "dashboard";
}

export function PersonaShell() {
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [crumbs, setCrumbs] = useState<BreadcrumbState>(ROOT_CRUMBS);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const [pendingDashboard, setPendingDashboard] = useState<string | undefined>(undefined);

  const openAgent = (agent: Agent, prompt?: string, dashboard?: string) => {
    setCrumbs(ROOT_CRUMBS); setActiveAgent(agent); setPendingPrompt(prompt); setPendingDashboard(dashboard);
  };
  const backToHome = () => { setActiveAgent(null); setCrumbs(ROOT_CRUMBS); setPendingPrompt(undefined); setPendingDashboard(undefined); };

  const askFromHome = (text: string) => {
    const kind = inferKind(text);
    const agent = persona.agents.find((a) => a.surface === "biTasks" && a.agentKey === kind);
    if (agent) openAgent(agent, text);
  };

  // A "Needs attention" alert deep-links to its flagged dashboard's preview
  // inside the Dashboard Composer (board-demo Step 0).
  const openAttention = (dashboardName: string) => {
    const agent = persona.agents.find((a) => a.surface === "biTasks" && a.agentKey === "dashboard");
    if (agent) openAgent(agent, undefined, dashboardName);
  };

  const renderSurface = (agent: Agent) => {
    switch (agent.surface) {
      case "biTasks":
        return <BiTasksAgent kind={agent.agentKey as BiTaskKind} onBreadcrumb={setCrumbs} initialPrompt={pendingPrompt} initialDashboard={pendingDashboard} />;
      case "biExplainer":
        return <ExplainerAgent />;
      default:
        return <ComingSoon title={agent.name} desc={agent.desc} />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {activeAgent ? (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border bg-card px-5 py-3">
            <button onClick={backToHome} className="text-muted-foreground hover:text-foreground" style={{ fontSize: "12.5px", fontWeight: 500 }}>Home</button>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            {crumbs.backToRoot ? (
              <button onClick={crumbs.backToRoot} className="text-muted-foreground hover:text-foreground" style={{ fontSize: "12.5px", fontWeight: 500 }}>{activeAgent.name}</button>
            ) : (
              <span className="text-foreground" style={{ fontSize: "12.5px", fontWeight: 600 }}>{activeAgent.name}</span>
            )}
            {crumbs.extra.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground" style={{ fontSize: "12.5px", fontWeight: 600 }}>{c.label}</span>
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{renderSurface(activeAgent)}</div>
        </div>
      ) : (
        <PersonaHome persona={persona} onOpenAgent={openAgent} onAsk={askFromHome} onOpenAttention={openAttention} />
      )}
    </div>
  );
}
