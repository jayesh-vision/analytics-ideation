import { useState, type ReactNode } from "react";
import type { LucideIcon } from "../icons";
import { Send, Sparkles, Check, ArrowRight } from "../icons";

// ── Surface header ───────────────────────────────────────────────────────
export function AgentHeader({
  icon: Icon, title, subtitle, primary,
}: {
  icon: LucideIcon; title: string; subtitle: string;
  primary?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-foreground" style={{ fontSize: "17px", fontWeight: 600 }}>{title}</div>
          <div className="text-muted-foreground" style={{ fontSize: "12px" }}>{subtitle}</div>
        </div>
      </div>
      {primary && (
        <button
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ fontSize: "13px", fontWeight: 600 }}
        >
          {primary.label} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-6 py-3">
      {steps.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${done ? "bg-primary" : active ? "bg-primary" : "bg-[#E3E7EE]"}`}
                style={{ fontSize: "11px", fontWeight: 600 }}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={active ? "text-foreground" : "text-muted-foreground"} style={{ fontSize: "12px", fontWeight: active ? 600 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Mini data grid ───────────────────────────────────────────────────────
export function MiniGrid({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-auto rounded-[12px] border border-border">
      <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums" }}>
        <thead className="bg-[#FCFCFD]">
          <tr>{columns.map((c) => (
            <th key={c} className="whitespace-nowrap px-3 py-2 text-left text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 text-foreground" style={{ fontSize: "13px" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pipeline canvas (horizontal DAG) ─────────────────────────────────────
export interface PipeNode { label: string; sub: string; icon: LucideIcon; tone?: string }
export function PipelineCanvas({ nodes, onNodeClick, activeIndex }: {
  nodes: PipeNode[]; onNodeClick?: (i: number) => void; activeIndex?: number;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {nodes.map((n, i) => {
        const Icon = n.icon; const active = i === activeIndex;
        return (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => onNodeClick?.(i)}
              className={`min-w-[150px] rounded-[12px] border bg-[#F8FAFF] px-3 py-2.5 text-left transition-colors ${active ? "border-primary" : "border-border hover:border-[#C9D5E5]"}`}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <Icon className="h-4 w-4" style={{ color: n.tone || "var(--primary)" }} />
                <span className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>{n.label}</span>
              </div>
              <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{n.sub}</span>
            </button>
            {i < nodes.length - 1 && <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

// ── AI assistant panel (NL chat that yields a result) ────────────────────
interface Msg { role: "user" | "ai"; text: string }
export function AgentAssistant({
  title = "AI Assistant", hint, suggestions, onResult,
}: {
  title?: string; hint: string; suggestions: string[];
  onResult?: (prompt: string) => string; // returns the assistant's reply text
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const send = (text: string) => {
    const t = text.trim(); if (!t || typing) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput(""); setTyping(true);
    setTimeout(() => {
      const reply = onResult?.(t) ?? "Done — applied to the working set.";
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
      setTyping(false);
    }, 800);
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>{title}</div>
          <div className="text-muted-foreground" style={{ fontSize: "11px" }}>{hint}</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.length === 0 ? (
          <div className="space-y-1.5">
            <p className="mb-2 text-center text-muted-foreground" style={{ fontSize: "12px" }}>Try one of these</p>
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)}
                className="w-full rounded-[8px] border border-border bg-muted/30 px-3 py-2 text-left text-foreground hover:bg-muted/50" style={{ fontSize: "13px" }}>
                {s}
              </button>
            ))}
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-[12px] px-3 py-2 ${m.role === "user" ? "bg-[#eef1f4]" : "bg-muted/40"}`} style={{ fontSize: "13px", lineHeight: 1.45 }}>
                {m.text}
              </div>
            </div>
          ))
        )}
        {typing && <div className="text-muted-foreground" style={{ fontSize: "12px" }}>Thinking…</div>}
      </div>

      <div className="border-t border-border p-3">
        <div className="rounded-[12px] border border-border bg-white px-3 py-2">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything…" rows={2}
            className="w-full resize-none border-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground" style={{ fontSize: "13px" }}
          />
          <div className="mt-1 flex justify-end">
            <button onClick={() => send(input)} disabled={!input.trim() || typing}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Two-pane layout: main + assistant ────────────────────────────────────
export function WithAssistant({ children, assistant }: { children: ReactNode; assistant: ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "1fr 340px" }}>
      <div className="min-w-0 overflow-y-auto p-6">{children}</div>
      <div className="min-h-0">{assistant}</div>
    </div>
  );
}

// ── Surface frame (header/stepper + body column) ─────────────────────────
export function SurfaceFrame({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}
