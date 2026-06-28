import { useState } from "react";
import { Loader2, RotateCw, ChevronRight } from "lucide-react";
import { T, money } from "../theme";
import { Badge, Code, joinNodes } from "../components/ui";
import type { Bootstrap } from "../types";

export default function Claims({ data, effective, openDrawer }:
  { data: Bootstrap; effective: (id: string) => string; openDrawer: (id: string) => void }) {
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(data.claims.length);
  const [filter, setFilter] = useState("all");

  function run() {
    setRunning(true);
    setShown(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(i);
      if (i >= data.claims.length) { clearInterval(t); setRunning(false); }
    }, 90);
  }

  const filtered = data.claims.filter((c) => filter === "all" || effective(c.id) === filter);

  return (
    <div className="up" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-.02em" }}>Claims adjudication</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>Deterministic engine · {data.claims.length} claims · last run 2 minutes ago</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={run} disabled={running}>
          {running ? <><Loader2 size={15} className="spin" /> Running…</> : <><RotateCw size={15} /> Run adjudication</>}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["all", "All"], ["flag", "Flagged"], ["deny", "Denied"], ["review", "Review"], ["pay", "Paid"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className="btn"
            style={{ padding: "6px 13px", fontSize: 12.5, background: filter === k ? T.ink : T.panel, color: filter === k ? "#fff" : T.muted, border: `1px solid ${filter === k ? T.ink : T.line}` }}>{l}</button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.panel2 }}>
              {["Claim", "Member", "Codes", "Units", "DOS", "Billed", "Policy applied", "Outcome", ""].map((h, i) => (
                <th key={i} style={{ textAlign: i === 5 || i === 3 ? "right" : "left", padding: "11px 16px", fontSize: 11, fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${T.line}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const r = data.determinations[c.id];
              const visible = idx < shown;
              return (
                <tr key={c.id} className="row" onClick={() => openDrawer(c.id)}
                  style={{ borderBottom: `1px solid ${T.lineSoft}`, cursor: "pointer", opacity: visible ? 1 : 0.25, transition: "opacity .2s" }}>
                  <td style={{ padding: "12px 16px", fontFamily: T.mono, fontSize: 12.5, color: T.inkSoft, fontWeight: 500 }}>{c.id}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12.5, color: T.muted }}>{c.member}<span style={{ color: T.faint }}> · {c.age}{c.sex}</span></td>
                  <td style={{ padding: "12px 16px" }}>{joinNodes(c.codes.map((x) => <Code key={x}>{x}</Code>))}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: T.mono, fontSize: 12.5, color: c.units > 1 ? T.flag : T.muted, fontWeight: c.units > 1 ? 600 : 400 }}>{c.units}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12.5, color: T.muted, fontFamily: T.mono }}>{c.dos.slice(5)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12.5, color: T.inkSoft, fontWeight: 500 }}>{money(c.billed)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: T.muted, maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.evals.length ? r.evals[0].title : <span style={{ color: T.faint }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{visible && <Badge outcome={effective(c.id)} />}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}><ChevronRight size={16} color={T.faint} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
