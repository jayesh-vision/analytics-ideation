import { PanelLeftClose, PanelLeftOpen } from "../icons";
import { PERSONAS } from "./personas";

interface PersonaRailProps {
  activeId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

// Collapsible left rail of experience profiles (personas), marketplace-style.
export function PersonaRail({ activeId, onSelect, collapsed, onToggle }: PersonaRailProps) {
  return (
    <div
      className="flex flex-shrink-0 flex-col border-r border-border bg-[var(--sidebar)] transition-[width] duration-200"
      style={{ width: collapsed ? 64 : 248 }}
    >
      {/* Rail header — label + collapse toggle */}
      <div className={`flex h-12 flex-shrink-0 items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
        {!collapsed && (
          <span className="uppercase tracking-wide text-muted-foreground" style={{ fontSize: "10px", fontWeight: 600 }}>
            Experience profiles
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Persona list */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {PERSONAS.map((p) => {
          const active = p.id === activeId;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              title={collapsed ? `${p.label} — ${p.role}` : undefined}
              className={`group flex items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-colors ${
                active ? "bg-primary/10" : "hover:bg-muted/60"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] border ${
                  active ? "border-primary/30 bg-white text-primary" : "border-border bg-white text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${active ? "text-primary" : "text-foreground"}`} style={{ fontSize: "13px", fontWeight: 600 }}>
                    {p.label}
                  </span>
                  <span className="block truncate text-muted-foreground" style={{ fontSize: "11px" }}>
                    {p.role}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
