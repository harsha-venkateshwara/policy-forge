import { X, Hash, Activity, Stethoscope, Calendar, FileText, Scale, Quote, UserCheck } from "lucide-react";
import { T, OUTCOME, money } from "../theme";
import { Badge, Confidence } from "../components/ui";
import type { Claim, Determination, Resolution } from "../types";

export default function ClaimDrawer({ claim, result, resolution, onClose }:
  { claim: Claim; result: Determination; resolution?: Resolution; onClose: () => void }) {
  const outcome = resolution?.outcome || result.final;
  const o = OUTCOME[outcome] || OUTCOME.review;
  const primary = result.evals.find((e) => e.rule_id === result.primary_rule_id);

  // A determination is an auditable artifact, so export the full record (claim,
  // outcome, firing rule, cited clause, analyst override) as signed-off JSON.
  function exportDetermination() {
    const record = {
      exported_at: new Date().toISOString(),
      claim,
      determination: result,
      effective_outcome: outcome,
      analyst_resolution: resolution ?? null,
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `determination-${claim.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(8,30,34,.32)", animation: "fade .2s" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "92%", background: T.panel, boxShadow: T.shadowLg, animation: "slidein .28s cubic-bezier(.2,.7,.2,1)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: T.ink }}>{claim.id}</div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Member {claim.member} · {claim.age}{claim.sex} · POS {claim.pos}</div>
          </div>
          <span style={{ marginLeft: "auto" }}><Badge outcome={outcome} size="lg" /></span>
          <div onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", cursor: "pointer", color: T.muted, border: `1px solid ${T.line}` }}><X size={16} /></div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          <SectionLabel>Claim detail</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <Fact icon={Hash} label="Procedure codes" value={claim.codes.join(", ")} mono />
            <Fact icon={Activity} label="Units" value={String(claim.units)} mono />
            <Fact icon={Stethoscope} label="Diagnosis" value={claim.dx.join(", ") || "—"} mono />
            <Fact icon={Calendar} label="Date of service" value={claim.dos} mono />
            <Fact icon={FileText} label="Modifiers" value={claim.mods.join(", ") || "none"} mono />
            <Fact icon={Scale} label="Billed" value={money(claim.billed)} />
          </div>

          <SectionLabel>Determination</SectionLabel>
          <div style={{ padding: 14, borderRadius: 11, background: o.bg, border: `1px solid ${o.color}22`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55 }}>{result.reason}</div>
            {resolution && (
              <div style={{ fontSize: 11.5, color: T.pass, marginTop: 9, display: "flex", alignItems: "center", gap: 6 }}>
                <UserCheck size={13} /> Analyst override · {OUTCOME[resolution.outcome].label} by {resolution.by}
              </div>
            )}
          </div>

          {primary && (
            <>
              <SectionLabel>Policy basis</SectionLabel>
              <div style={{ padding: 14, borderRadius: 11, border: `1px solid ${T.line}`, background: T.panel2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.teal }}>{primary.rule_id}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{primary.title}</span>
                </div>
                {result.citation && (
                  <div style={{ display: "flex", gap: 7, fontSize: 12.5, color: T.muted, fontStyle: "italic", lineHeight: 1.55 }}>
                    <Quote size={13} style={{ flexShrink: 0, marginTop: 2, color: T.tealLine }} />“{result.citation}”
                  </div>
                )}
              </div>
            </>
          )}

          {result.evals.length > 1 && (
            <>
              <div style={{ marginTop: 18 }}><SectionLabel>All policies evaluated</SectionLabel></div>
              {result.evals.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${T.lineSoft}` : "none" }}>
                  <span style={{ fontSize: 12.5, color: T.muted, flex: 1 }}>{e.title}</span>
                  <Badge outcome={e.outcome} />
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.line}`, display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-ghost" onClick={exportDetermination}>Export determination</button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: any }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>{children}</div>;
}

function Fact({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: 11, borderRadius: 10, background: T.panel2, border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: T.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontSize: 13.5, color: T.inkSoft, fontWeight: 600, marginTop: 5, fontFamily: mono ? T.mono : T.sans }}>{value}</div>
    </div>
  );
}
