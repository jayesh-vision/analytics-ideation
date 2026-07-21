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

export function PersonaShell() {
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [crumbs, setCrumbs] = useState<BreadcrumbState>(ROOT_CRUMBS);

  const openAgent = (agent: Agent) => { setCrumbs(ROOT_CRUMBS); setActiveAgent(agent); };
  const backToHome = () => { setActiveAgent(null); setCrumbs(ROOT_CRUMBS); };

  const renderSurface = (agent: Agent) => {
    switch (agent.surface) {
      case "biTasks":
        return <BiTasksAgent kind={agent.agentKey as BiTaskKind} onBreadcrumb={setCrumbs} />;
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
        <PersonaHome persona={persona} onOpenAgent={openAgent} />
      )}
    </div>
  );
}
