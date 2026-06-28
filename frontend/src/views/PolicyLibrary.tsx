import { FileText, CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { T } from "../theme";
import { Code, Confidence, joinNodes } from "../components/ui";
import type { Bootstrap } from "../types";

export default function PolicyLibrary({ data, onOpen }: { data: Bootstrap; onOpen: (id: string) => void }) {
  return (
    <div className="up" style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-.02em" }}>Policy library</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>Written payment policies and their compiled rule status</p>
        </div>
        <button className="btn btn-ghost"><Plus size={15} /> Add policy</button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {data.policies.map((p) => {
          const r = data.rules[p.id];
          return (
            <div key={p.id} className="card row" style={{ padding: 18, display: "flex", alignItems: "center", gap: 18, cursor: "pointer" }} onClick={() => onOpen(p.id)}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: T.tealSoft, color: T.tealDeep, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <FileText size={19} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: T.ink }}>{p.title}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.muted, background: T.panel2, padding: "2px 7px", borderRadius: 5, border: `1px solid ${T.line}` }}>{p.code}</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>
                  {p.category} · updated {p.updated} · targets {r ? joinNodes(r.target_codes.map((x) => <Code key={x}>{x}</Code>)) : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: T.pass, background: T.passBg, padding: "3px 9px", borderRadius: 999, border: `1px solid ${T.pass}22` }}>
                  <CheckCircle2 size={12} /> Compiled
                </span>
                {r && <Confidence value={r.overall_confidence} width={70} />}
              </div>
              <ChevronRight size={18} color={T.faint} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
