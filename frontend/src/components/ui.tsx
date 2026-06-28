// Shared, presentational building blocks used across every view.
import type { ReactNode } from "react";
import {
  Search, Bell, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Activity, Cpu, Zap,
} from "lucide-react";
import { T, OUTCOME } from "../theme";
import type { Health } from "../types";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 9, background: `linear-gradient(150deg, ${T.teal}, ${T.tealDeep})`,
      display: "grid", placeItems: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)", flexShrink: 0 }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path d="M12 2.5l7 2.6v5.3c0 4.4-3 7.6-7 9.1-4-1.5-7-4.7-7-9.1V5.1l7-2.6z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" opacity=".95" />
        <path d="M10.4 9.2L8.2 12l2.2 2.8M13.6 9.2L15.8 12l-2.2 2.8" stroke={T.lime} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Badge({ outcome, size = "sm" }: { outcome: string; size?: "sm" | "lg" }) {
  const o = OUTCOME[outcome] || OUTCOME.review;
  const Icon = o.Icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: size === "lg" ? "5px 11px" : "3px 9px",
      borderRadius: 999, background: o.bg, color: o.color, fontSize: size === "lg" ? 12.5 : 11.5, fontWeight: 600,
      border: `1px solid ${o.color}22`, whiteSpace: "nowrap" }}>
      <Icon size={size === "lg" ? 13 : 12} strokeWidth={2.4} /> {o.label}
    </span>
  );
}

export function Confidence({ value, width = 96, showPct = true }: { value: number; width?: number; showPct?: boolean }) {
  const pct = Math.round(value * 100);
  const c = value >= 0.85 ? T.pass : value >= 0.7 ? T.review : T.flag;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width, height: 6, borderRadius: 999, background: T.lineSoft, overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", height: "100%", width: pct + "%", background: c, borderRadius: 999, transition: "width .7s cubic-bezier(.2,.7,.2,1)" }} />
      </span>
      {showPct && <span style={{ fontFamily: T.mono, fontSize: 11.5, color: c, fontWeight: 600, minWidth: 30 }}>{pct}%</span>}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code style={{ fontFamily: T.mono, fontSize: 12, background: T.panel2, border: `1px solid ${T.line}`,
    borderRadius: 5, padding: "1px 6px", color: T.inkSoft }}>{children}</code>;
}

// Join JSX nodes with a space separator, safe on empty arrays.
export function joinNodes(nodes: ReactNode[]): ReactNode {
  if (nodes.length === 0) return <span style={{ color: T.faint }}>—</span>;
  return nodes.reduce((a, b) => [a, " ", b] as any);
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: T.ink }}>{title}</h3>
      {right && <span style={{ fontSize: 11.5, color: T.faint, fontWeight: 500 }}>{right}</span>}
    </div>
  );
}

export function Metric({ label, value, sub, accent, Icon, trend, warn }:
  { label: string; value: ReactNode; sub: string; accent: string; Icon: any; trend: string; warn?: boolean }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{label}</div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: accent + "14", color: accent, display: "grid", placeItems: "center" }}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", color: T.ink, margin: "8px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: T.faint }}>{sub}</div>
      <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${T.lineSoft}`, fontSize: 11.5, fontWeight: 600,
        color: warn ? T.review : T.pass, display: "flex", alignItems: "center", gap: 5 }}>
        {warn ? <AlertTriangle size={12} /> : <Activity size={12} />}{trend}
      </div>
    </div>
  );
}

export function Pill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 10, background: T.panel, border: `1px solid ${T.line}` }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />
      <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{value}</span>
    </div>
  );
}

export function Empty({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="card" style={{ padding: "48px 20px", textAlign: "center" }}>
      <Icon size={28} color={T.faint} style={{ opacity: 0.6 }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: T.inkSoft, marginTop: 12 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>{body}</div>
    </div>
  );
}

export function Sidebar({ view, setView, nav, collapsed, setCollapsed }:
  { view: string; setView: (v: string) => void; nav: any[]; collapsed: boolean; setCollapsed: (f: (c: boolean) => boolean) => void }) {
  return (
    <aside style={{ width: collapsed ? 70 : 248, background: `linear-gradient(180deg, ${T.ink}, #0A2529)`,
      display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .2s", padding: "16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 4px 16px" }}>
        <Logo />
        {!collapsed && (
          <div style={{ lineHeight: 1.15, overflow: "hidden" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-.01em" }}>PolicyForge</div>
            <div style={{ color: "#7FA39E", fontSize: 10.5, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>Payment Policy Intelligence</div>
          </div>
        )}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {nav.map(({ id, label, Icon, badge, count }) => (
          <div key={id} className={"nav" + (view === id ? " on" : "")} onClick={() => setView(id)} title={label}>
            <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
            {!collapsed && badge && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: T.ink, background: T.lime, padding: "2px 6px", borderRadius: 5, letterSpacing: ".03em" }}>{badge}</span>}
            {!collapsed && count > 0 && <span style={{ marginLeft: badge ? 6 : "auto", fontSize: 11, fontWeight: 700, color: "#fff", background: T.review, padding: "1px 7px", borderRadius: 999 }}>{count}</span>}
            {!collapsed && !badge && !(count > 0) && <span className="nav-dot" />}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {!collapsed && (
          <div style={{ padding: 12, borderRadius: 11, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.lime, fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
              <ShieldCheck size={13} /> Governed by design
            </div>
            <div style={{ color: "#9FBDB8", fontSize: 11, lineHeight: 1.45 }}>
              Rules are AI-compiled and analyst-verified. Adjudication runs on a deterministic engine, so every result is reproducible.
            </div>
          </div>
        )}
        <div className="nav" onClick={() => setCollapsed((c) => !c)} style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /> <span>Collapse</span></>}
        </div>
      </div>
    </aside>
  );
}

export function CompilerBadge({ health }: { health: Health | null }) {
  if (!health) return null;
  const live = health.compiler_mode === "live";
  const color = live ? T.teal : T.review;
  const Icon = live ? Zap : Cpu;
  return (
    <div title={live
        ? `Live model compiler, ${health.model}`
        : "Heuristic compiler (no API key). Set GROQ_API_KEY to compile with the live model."}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 999,
        background: color + "12", border: `1px solid ${color}28`, color, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon size={13} strokeWidth={2.4} />
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {live ? "Live model" : "Heuristic mode"}
    </div>
  );
}

export function TopBar({ title, health }: { title: string; health?: Health | null }) {
  return (
    <header style={{ height: 60, background: T.panel, borderBottom: `1px solid ${T.line}`, display: "flex",
      alignItems: "center", gap: 16, padding: "0 22px", flexShrink: 0 }}>
      <span style={{ fontWeight: 600, color: T.inkSoft, fontSize: 13 }}>{title}</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <CompilerBadge health={health ?? null} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel2, border: `1px solid ${T.line}`,
          borderRadius: 9, padding: "8px 12px", width: 200, color: T.faint }}>
          <Search size={15} /><span style={{ fontSize: 12.5 }}>Search policies, claims…</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${T.line}`, display: "grid",
          placeItems: "center", color: T.muted, position: "relative", background: T.panel }}>
          <Bell size={16} />
          <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: T.flag, border: `1.5px solid ${T.panel}` }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: `linear-gradient(135deg, ${T.teal}, ${T.ink})`,
            color: "#fff", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 700 }}>HV</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft }}>Payment Integrity</div>
            <div style={{ fontSize: 10.5, color: T.faint }}>Analyst workspace</div>
          </div>
        </div>
      </div>
    </header>
  );
}
