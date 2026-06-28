import { useState, useEffect, useRef } from "react";
import { FileText, Binary, Cpu, Loader2, AlertTriangle, Check, Quote } from "lucide-react";
import { T, OP_TEXT } from "../theme";
import { api } from "../api/client";
import { Badge, Confidence, Code, joinNodes } from "../components/ui";
import type { Bootstrap, Rule } from "../types";

const STAGES = ["Parsing policy language", "Extracting edit conditions", "Resolving codes & exceptions", "Scoring confidence"];

export default function Compiler({ data, selectedPolicy, setSelectedPolicy, onCompiled }:
  { data: Bootstrap; selectedPolicy: string; setSelectedPolicy: (id: string) => void; onCompiled: () => Promise<void> }) {
  const policy = data.policies.find((p) => p.id === selectedPolicy) || data.policies[0];
  const [text, setText] = useState(policy.text);
  const [compiling, setCompiling] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [rule, setRule] = useState<Rule | null>(data.rules[policy.id] || null);
  const timers = useRef<any[]>([]);

  useEffect(() => {
    setText(policy.text);
    setRule(data.rules[policy.id] || null);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolicy]);

  async function compile() {
    setCompiling(true); setErr(null); setRule(null); setStage(0);
    timers.current.forEach(clearTimeout);
    timers.current = [600, 1300, 2050].map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    const started = Date.now();
    try {
      const out = await api.compile(text, policy.id);
      const wait = Math.max(0, 2600 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      setRule(out);
      await onCompiled();
    } catch (e: any) {
      setErr(e.message || "Could not compile this policy.");
    } finally {
      timers.current.forEach(clearTimeout);
      setCompiling(false);
    }
  }

  return (
    <div className="up" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-.02em" }}>Policy compiler</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>Turn written policy into a governed, executable claim-edit rule</p>
        </div>
        <select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)}
          style={{ marginLeft: "auto", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.line}`, background: T.panel, fontSize: 13, color: T.inkSoft, fontFamily: T.sans, fontWeight: 500, cursor: "pointer" }}>
          {data.policies.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={15} color={T.muted} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft }}>Policy source</span>
            <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 10.5, color: T.faint }}>{policy.code}</span>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
            style={{ width: "100%", minHeight: 300, border: "none", outline: "none", resize: "vertical", padding: 16, fontFamily: T.sans, fontSize: 13.5, lineHeight: 1.65, color: T.text, background: T.panel }} />
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn btn-primary" onClick={compile} disabled={compiling || !text.trim()}>
              {compiling ? <><Loader2 size={15} className="spin" /> Compiling…</> : <><Cpu size={15} /> Compile policy</>}
            </button>
            <span style={{ fontSize: 11.5, color: T.faint }}>Edit the text or paste a new policy, then compile.</span>
          </div>
        </div>

        <div className="card" style={{ overflow: "hidden", minHeight: 360 }}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Binary size={15} color={T.teal} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft }}>Compiled rule</span>
            <span style={{ marginLeft: "auto", fontSize: 9.5, fontWeight: 700, color: T.ink, background: T.lime, padding: "2px 7px", borderRadius: 5 }}>AI-GENERATED</span>
          </div>
          <div style={{ padding: 16 }}>
            {compiling && <CompileProgress stage={stage} />}
            {err && !compiling && (
              <div style={{ padding: 16, borderRadius: 10, background: T.flagBg, border: `1px solid ${T.flag}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.flag, fontWeight: 600, fontSize: 13 }}>
                  <AlertTriangle size={15} /> Couldn't compile this policy
                </div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>{err}</div>
              </div>
            )}
            {!compiling && !err && rule && <RuleView rule={rule} policyText={text} />}
            {!compiling && !err && !rule && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.faint }}>
                <Binary size={30} style={{ opacity: 0.5 }} />
                <div style={{ fontSize: 13, marginTop: 12, color: T.muted }}>Compile the policy to generate an executable rule.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompileProgress({ stage }: { stage: number }) {
  return (
    <div style={{ padding: "10px 4px" }}>
      {STAGES.map((s, i) => {
        const done = i < stage, active = i === stage;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", opacity: i <= stage ? 1 : 0.4, transition: "opacity .3s" }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", flexShrink: 0,
              background: done ? T.passBg : active ? T.tealSoft : T.panel2, color: done ? T.pass : T.teal,
              border: `1px solid ${done ? T.pass + "33" : active ? T.tealLine : T.line}` }}>
              {done ? <Check size={13} strokeWidth={3} /> : active ? <Loader2 size={13} className="spin" /> : <span style={{ fontSize: 10, fontFamily: T.mono }}>{i + 1}</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: done ? T.inkSoft : active ? T.teal : T.faint }}>{s}</span>
            {active && <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
              {[0, 1, 2].map((d) => <span key={d} style={{ width: 4, height: 4, borderRadius: 999, background: T.teal, animation: `pulse 1s ${d * 0.2}s infinite` }} />)}
            </span>}
          </div>
        );
      })}
    </div>
  );
}

function RuleView({ rule, policyText }: { rule: Rule; policyText: string }) {
  const [tab, setTab] = useState("rule");
  const ltLabel: Record<string, string> = {
    frequency_limit: "Frequency limit", mutually_exclusive: "Mutually exclusive",
    eligibility: "Eligibility", modifier_required: "Modifier required", review: "Manual review",
  };
  const lt = ltLabel[rule.logic_type] || rule.logic_type;
  const json = JSON.stringify({
    rule_id: rule.rule_id, logic_type: rule.logic_type, target_codes: rule.target_codes,
    conditions: rule.conditions.map((c) => ({ field: c.field, operator: c.operator, value: c.value, confidence: c.confidence })),
    exceptions: rule.exceptions, outcome: rule.outcome, overall_confidence: rule.overall_confidence,
  }, null, 2);

  return (
    <div className="up">
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, background: T.panel2, border: `1px solid ${T.line}`, marginBottom: 14 }}>
        <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, color: T.teal }}>{rule.rule_id}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{rule.title}</span>
        <span style={{ marginLeft: "auto" }}><Badge outcome={rule.outcome} size="lg" /></span>
      </div>

      <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${T.line}`, marginBottom: 14 }}>
        {[["rule", "Rule"], ["json", "Schema"], ["trace", "Traceability"]].map(([k, l]) => (
          <div key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {tab === "rule" && (
        <div>
          <Row label="Summary"><span style={{ color: T.text, lineHeight: 1.5 }}>{rule.policy_summary}</span></Row>
          <Row label="Logic"><span style={{ fontWeight: 600, color: T.inkSoft }}>{lt}</span></Row>
          <Row label="Applies to">{joinNodes(rule.target_codes.map((c) => <Code key={c}>{c}</Code>))}</Row>
          <Row label="Outcome"><Badge outcome={rule.outcome} /></Row>
          <Row label="Confidence">
            <Confidence value={rule.overall_confidence} width={130} />
            {rule.overall_confidence < 0.85 && <span style={{ fontSize: 11.5, color: T.review, marginLeft: 10 }}>below auto-adjudication threshold → routes to review</span>}
          </Row>

          <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: ".05em", textTransform: "uppercase" }}>Conditions</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {rule.conditions.map((c, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, background: T.panel2, border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <Code>{c.field}</Code>
                  <span style={{ color: T.teal, fontWeight: 700, fontFamily: T.mono, fontSize: 13 }}>{OP_TEXT[c.operator] || c.operator}</span>
                  <Code>{Array.isArray(c.value) ? c.value.join(", ") : String(c.value)}</Code>
                  <span style={{ marginLeft: "auto" }}><Confidence value={c.confidence} width={64} /></span>
                </div>
                {c.source_quote && (
                  <div style={{ marginTop: 9, display: "flex", gap: 7, fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.5 }}>
                    <Quote size={13} style={{ flexShrink: 0, marginTop: 2, color: T.tealLine }} />“{c.source_quote}”
                  </div>
                )}
              </div>
            ))}
          </div>

          {rule.exceptions.length > 0 && (
            <>
              <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: ".05em", textTransform: "uppercase" }}>Exceptions</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {rule.exceptions.map((e, i) => (
                  <span key={i} className="chip" title={e.note} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: T.panel2, border: `1px solid ${T.line}`, fontSize: 12, color: T.inkSoft }}>
                    <span style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", fontWeight: 600 }}>{e.type}</span>
                    <Code>{e.value}</Code>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "json" && (
        <pre style={{ margin: 0, padding: 16, borderRadius: 10, background: "#0C2E33", color: "#D7EEE9", fontFamily: T.mono, fontSize: 12, lineHeight: 1.6, overflow: "auto", maxHeight: 320 }}>{json}</pre>
      )}

      {tab === "trace" && (
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>Every condition links to the exact policy language that produced it, so an analyst can audit the rule against its source before it adjudicates a single claim.</p>
          {rule.conditions.map((c, i) => (
            <div key={i} style={{ padding: 13, borderRadius: 10, border: `1px solid ${T.line}`, marginBottom: 9, background: T.panel }}>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.teal, marginBottom: 7 }}>
                {c.field} {OP_TEXT[c.operator] || c.operator} {Array.isArray(c.value) ? `[${c.value.join(", ")}]` : c.value}
              </div>
              <HighlightPolicy text={policyText} quote={c.source_quote} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: `1px solid ${T.lineSoft}`, alignItems: "center" }}>
      <span style={{ width: 96, flexShrink: 0, fontSize: 12, color: T.faint, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>{children}</span>
    </div>
  );
}

function HighlightPolicy({ text, quote }: { text: string; quote: string }) {
  if (!quote || !text.includes(quote)) {
    return <span style={{ fontSize: 12, color: T.faint, fontStyle: "italic" }}>Source phrase not located verbatim in the current text.</span>;
  }
  const [a, b] = text.split(quote);
  const clip = (s: string, end: boolean) => (s.length > 90 ? (end ? "…" + s.slice(-90) : s.slice(0, 90) + "…") : s);
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.6, color: T.muted }}>
      {clip(a, true)}<mark style={{ background: T.limeSoft, color: T.ink, padding: "1px 3px", borderRadius: 3, fontWeight: 500 }}>{quote}</mark>{clip(b, false)}
    </div>
  );
}
