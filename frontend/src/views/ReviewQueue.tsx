import { UserCheck, AlertTriangle, Quote, CheckCircle2, Ban, Check } from "lucide-react";
import { T, OUTCOME, money } from "../theme";
import { Code, Pill, Empty, Badge } from "../components/ui";
import type { Bootstrap, Resolution } from "../types";

export default function ReviewQueue({ data, resolved, resolve, openDrawer }:
  { data: Bootstrap; resolved: Record<string, Resolution>; resolve: (id: string, outcome: string) => void; openDrawer: (id: string) => void }) {
  const queue = data.claims.filter((c) => data.determinations[c.id].final === "review");
  const pending = queue.filter((c) => !resolved[c.id]);

  return (
    <div className="up" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-.02em" }}>Review queue</h1>
        <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>
          The governance gate. Low-confidence rules and boundary cases never auto-adjudicate. An analyst decides.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Pill color={T.review} label="Awaiting analyst" value={pending.length} />
        <Pill color={T.pass} label="Resolved this session" value={queue.length - pending.length} />
      </div>

      {queue.length === 0 && <Empty icon={UserCheck} title="Nothing in review" body="Every claim cleared the confidence threshold and adjudicated automatically." />}

      <div style={{ display: "grid", gap: 12 }}>
        {queue.map((c) => {
          const r = data.determinations[c.id];
          const res = resolved[c.id];
          return (
            <div key={c.id} className="card" style={{ padding: 16, opacity: res ? 0.72 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: T.reviewBg, color: T.review, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <AlertTriangle size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, color: T.inkSoft, cursor: "pointer" }} onClick={() => openDrawer(c.id)}>{c.id}</span>
                    {c.codes.map((x) => <Code key={x}>{x}</Code>)}
                    <span style={{ fontSize: 12, color: T.faint }}>· member {c.member} · {c.age}{c.sex} · {money(c.billed)}</span>
                    {res && <span style={{ marginLeft: "auto" }}><Badge outcome={res.outcome} /></span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 8, lineHeight: 1.55, display: "flex", gap: 7 }}>
                    <Quote size={13} style={{ flexShrink: 0, marginTop: 2, color: T.tealLine }} />{r.reason}
                  </div>
                  {res ? (
                    <div style={{ fontSize: 11.5, color: T.pass, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={13} /> Resolved as <b>{OUTCOME[res.outcome].label}</b> by {res.by} · {res.at}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn" onClick={() => resolve(c.id, "deny")} style={{ padding: "7px 13px", fontSize: 12.5, background: T.denyBg, color: T.deny, border: `1px solid ${T.deny}22` }}>
                        <Ban size={13} /> Uphold denial
                      </button>
                      <button className="btn" onClick={() => resolve(c.id, "pay")} style={{ padding: "7px 13px", fontSize: 12.5, background: T.passBg, color: T.pass, border: `1px solid ${T.pass}22` }}>
                        <Check size={13} /> Approve payment
                      </button>
                      <button className="btn btn-ghost" style={{ padding: "7px 13px", fontSize: 12.5 }} onClick={() => openDrawer(c.id)}>
                        Open claim
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
