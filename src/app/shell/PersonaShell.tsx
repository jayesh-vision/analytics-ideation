import { useEffect, useState } from "react";
import { Database, ChevronLeft, Sparkles } from "../icons";
import { PERSONAS, type Agent } from "./personas";
import { PersonaRail } from "./PersonaRail";
import { PersonaHome } from "./CatalogHome";
import { ComingSoon } from "./ComingSoon";
import { BiTasksAgent, type BiTaskKind } from "../surfaces/BiTasksAgent";
import { ExplainerAgent } from "../surfaces/ExplainerAgent";

// The DataByte Enterprise Intelligence shell: a collapsible left rail of experience
// profiles (personas); each profile shows its coordinated team of agents; opening an
// agent mounts its native surface. talk-to-your-data is the first real agent surface.
// Deep links: /<personaId>/home selects that experience, e.g. /bi/home or /catalog/home.
function personaIdFromPath(): string {
  const seg = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return PERSONAS.find((p) => p.id === seg)?.id ?? PERSONAS[0].id;
}

export function PersonaShell() {
  const [personaId, setPersonaId] = useState(personaIdFromPath);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("db.rail.collapsed") === "1"; } catch { return false; }
  });
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  const switchPersona = (id: string) => {
    setPersonaId(id);
    setActiveAgent(null);
    try { window.history.pushState(null, "", `/${id}/home`); } catch { /* ignore */ }
  };

  // Browser back/forward keeps the persona in sync with the URL.
  useEffect(() => {
    const onPop = () => { setPersonaId(personaIdFromPath()); setActiveAgent(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const toggleRail = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem("db.rail.collapsed", next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });
  const backToWorkspace = () => setActiveAgent(null);

  const renderSurface = (agent: Agent) => {
    switch (agent.surface) {
      case "biTasks":
        return <BiTasksAgent kind={agent.agentKey as BiTaskKind} />;
      case "biExplainer":
        return <ExplainerAgent />;
      default:
        return <ComingSoon title={agent.name} desc={agent.desc} />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top strip — logo · (back) · universal command · identity */}
      <div className="flex h-[58px] flex-shrink-0 items-center gap-3.5 border-b border-border bg-card px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-primary">
            <Database className="h-[15px] w-[15px] text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>DataByte</div>
            <div className="text-muted-foreground" style={{ fontSize: "10px" }}>Enterprise Intelligence</div>
          </div>
        </div>

        {activeAgent && (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            <button onClick={backToWorkspace} className="inline-flex items-center gap-1.5 text-primary" style={{ fontSize: "12px", fontWeight: 500 }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Workspace
            </button>
          </>
        )}

        <div className="flex-1" />

        <div className="hidden items-center gap-2 rounded-[9px] border border-border bg-[#FAFBFD] px-3 md:flex" style={{ height: 34, width: 300 }}>
          <Sparkles className="h-[15px] w-[15px] text-primary" />
          <span className="text-muted-foreground" style={{ fontSize: "13px" }}>Ask or act on your enterprise…</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary/10 text-primary" style={{ fontSize: "12px", fontWeight: 600 }}>
            {persona.initials}
          </div>
          <div className="leading-tight">
            <div className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>{persona.role}</div>
            <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{persona.label} experience</div>
          </div>
        </div>
      </div>

      {/* Body — collapsible persona rail + the agent landing / active surface */}
      <div className="flex min-h-0 flex-1">
        <PersonaRail activeId={personaId} onSelect={switchPersona} collapsed={collapsed} onToggle={toggleRail} />
        <div className="min-w-0 flex-1">
          {activeAgent ? (
            <div className="h-full overflow-y-auto">{renderSurface(activeAgent)}</div>
          ) : (
            <PersonaHome persona={persona} onOpenAgent={setActiveAgent} />
          )}
        </div>
      </div>
    </div>
  );
}
