import { useState } from "react";
import {
  GitCompare, Sparkles, Loader2, AlertTriangle, Plus, Minus, ArrowRight,
  FileText, Wand2, CheckCircle2,
} from "lucide-react";
import { T } from "../theme";
import { api } from "../api/client";
import { Badge, Confidence, Code } from "../components/ui";
import type { Bootstrap, PolicyDiffResult } from "../types";

// A pre-loaded revision per policy so the demo is clickable on arrival. The NPWT
// example is the showpiece: a vague policy tightened into a firm 1-unit cap, which
// the compiler then scores with *higher* confidence, so findings stop routing to
// review and start auto-adjudicating.
const REVISIONS: Record<string, string> = {
  "P-1047":
    "Negative pressure wound therapy using a durable medical equipment pump (CPT 97605) is " +
    "reimbursable at a maximum of one (1) unit per member, per date of service.\n\n" +
    "Claims billed with more than one unit of CPT 97605 for the same member on the same date of " +
    "service should be flagged as a frequency edit and the excess units denied.",
  "P-1044":
    "Screening colonoscopy (CPT 45378) for members at average risk is covered once every ten (10) " +
    "years for members aged forty-five (45) years and older.\n\n" +
    "Effective 2026-07-01, members aged 45 through 49 also require a documented average-risk " +
    "attestation on file; claims without the attestation are not eligible and should be denied.\n\n" +
    "Claims for members under age 45 without a documented high-risk diagnosis (ICD-10 Z80.0 or " +
    "Z85.038) are not eligible for coverage and should be denied.",
};

export default function PolicyDiff({ data, onApplied }:
  { data: Bootstrap; onApplied: () => Promise<void> }) {
  const withRevision = data.policies.filter((p) => REVISIONS[p.id]);
  const initial = (withRevision[0] || data.policies[0]).id;
  const [policyId, setPolicyId] = useState(initial);
  const policy = data.policies.find((p) => p.id === policyId) || data.policies[0];

  const [oldText, setOldText] = useState(policy.text);
  const [newText, setNewText] = useState(REVISIONS[policy.id] || policy.text);
  const [result, setResult] = useState<PolicyDiffResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pick(id: string) {
    const p = data.policies.find((x) => x.id === id)!;
    setPolicyId(id);
    setOldText(p.text);
    setNewText(REVISIONS[id] || p.text);
    setResult(null); setApplied(false); setErr(null);
  }

  async function analyze() {
    setBusy(true); setErr(null); setApplied(false); setResult(null);
    try {
      setResult(await api.diff(oldText, newText, policyId, false));
    } catch (e: any) {
      setErr(e.message || "Could not analyze this change.");
    } finally {
      setBusy(false);
    }
  }

  async function applyChange() {
    if (!result) return;
    setBusy(true);
    try {
      await api.diff(oldText, newText, policyId, true);
      await onApplied();
      setApplied(true);
    } catch (e: any) {
      setErr(e.message || "Could not apply this change.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="up" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-.02em" }}>Policy change diff</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>
            When a payer or CMS revises a policy, summarize what changed, recompile the rule, and see exactly which conditions moved.
          </p>
        </div>
        <select value={policyId} onChange={(e) => pick(e.target.value)}
          style={{ marginLeft: "auto", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.line}`, background: T.panel, fontSize: 13, color: T.inkSoft, fontFamily: T.sans, fontWeight: 500, cursor: "pointer" }}>
          {data.policies.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Pane label="Previous version" code={policy.code} tone="muted" value={oldText} onChange={setOldText} />
        <Pane label="Revised version" code={policy.code} tone="teal" value={newText} onChange={setNewText} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="btn btn-primary" onClick={analyze} disabled={busy || !newText.trim()}>
          {busy && !result ? <><Loader2 size={15} className="spin" /> Analyzing…</> : <><GitCompare size={15} /> Analyze change</>}
        </button>
        <span style={{ fontSize: 11.5, color: T.faint }}>Edit either side, or pick another policy, then analyze.</span>
      </div>

      {err && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 11, background: T.flagBg, border: `1px solid ${T.flag}22`, display: "flex", gap: 8, color: T.flag, fontSize: 13 }}>
          <AlertTriangle size={15} /> {err}
        </div>
      )}

      {result && <Result result={result} applied={applied} busy={busy} onApply={applyChange} />}
    </div>
  );
}

function Pane({ label, code, tone, value, onChange }:
  { label: string; code: string; tone: "muted" | "teal"; value: string; onChange: (v: string) => void }) {
  const accent = tone === "teal" ? T.teal : T.faint;
  return (
    <div className="card" style={{ overflow: "hidden", borderColor: tone === "teal" ? T.tealLine : T.line }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={14} color={accent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 10.5, color: T.faint }}>{code}</span>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
        style={{ width: "100%", minHeight: 210, border: "none", outline: "none", resize: "vertical", padding: 14, fontFamily: T.sans, fontSize: 13, lineHeight: 1.6, color: T.text, background: T.panel }} />
    </div>
  );
}

function Result({ result, applied, busy, onApply }:
  { result: PolicyDiffResult; applied: boolean; busy: boolean; onApply: () => void }) {
  const { summary, mode, new_rule, old_rule, changes, added_lines, removed_lines } = result;

  return (
    <div className="up" style={{ marginTop: 16, display: "grid", gap: 14 }}>
      {/* AI summary */}
      <div className="card" style={{ padding: 16, display: "flex", gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.tealSoft, color: T.tealDeep, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Wand2 size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>What changed</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: T.ink, background: mode === "live" ? T.lime : T.tealLine, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>
              {mode === "live" ? "AI summary" : "Heuristic summary"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6, lineHeight: 1.6 }}>{summary}</div>
        </div>
      </div>

      {/* text-level added / removed */}
      {(added_lines.length > 0 || removed_lines.length > 0) && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Text changes</div>
          <div style={{ display: "grid", gap: 6 }}>
            {removed_lines.map((l, i) => <DiffLine key={"r" + i} kind="removed" text={l} />)}
            {added_lines.map((l, i) => <DiffLine key={"a" + i} kind="added" text={l} />)}
          </div>
        </div>
      )}

      {/* rule-level change list */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: ".05em" }}>Recompiled rule</span>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.teal }}>{new_rule.rule_id}</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {old_rule && <Confidence value={old_rule.overall_confidence} width={56} />}
            {old_rule && <ArrowRight size={14} color={T.faint} />}
            <Confidence value={new_rule.overall_confidence} width={56} />
            <Badge outcome={new_rule.outcome} />
          </span>
        </div>

        {changes.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.muted }}>The recompiled rule is identical to the current one, with no logic change.</div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {changes.map((c, i) => <ChangeRow key={i} change={c} />)}
          </div>
        )}

        {new_rule.overall_confidence >= 0.85 && old_rule && old_rule.overall_confidence < 0.85 && (
          <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 9, background: T.passBg, border: `1px solid ${T.pass}22`, fontSize: 12, color: T.pass, display: "flex", alignItems: "center", gap: 7 }}>
            <CheckCircle2 size={13} /> Confidence now clears the 85% gate, so findings will auto-adjudicate instead of routing to review.
          </div>
        )}

        <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", gap: 12 }}>
          {applied ? (
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: T.pass }}>
              <CheckCircle2 size={15} /> Applied. The live rule and every adjudication now use this version.
            </span>
          ) : (
            <>
              <button className="btn btn-primary" onClick={onApply} disabled={busy}>
                {busy ? <><Loader2 size={15} className="spin" /> Applying…</> : <><Sparkles size={15} /> Apply &amp; recompile rule</>}
              </button>
              <span style={{ fontSize: 11.5, color: T.faint }}>Promotes the recompiled rule to live and re-adjudicates every claim.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffLine({ kind, text }: { kind: "added" | "removed"; text: string }) {
  const added = kind === "added";
  return (
    <div style={{ display: "flex", gap: 9, padding: "8px 11px", borderRadius: 8, fontSize: 12.5, lineHeight: 1.55,
      background: added ? T.passBg : T.flagBg, color: added ? T.pass : T.deny,
      border: `1px solid ${(added ? T.pass : T.flag)}1c` }}>
      {added ? <Plus size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <Minus size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span style={{ color: T.inkSoft }}>{text}</span>
    </div>
  );
}

function ChangeRow({ change }: { change: { kind: string; label: string; before?: string | null; after?: string | null } }) {
  const tone = change.kind === "added" ? T.pass : change.kind === "removed" ? T.deny : T.info;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: T.panel2, border: `1px solid ${T.line}`, flexWrap: "wrap" }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: tone, background: tone + "16", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".03em" }}>{change.kind}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft }}>{change.label}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontFamily: T.mono, fontSize: 12 }}>
        {change.before != null && <span style={{ color: T.faint, textDecoration: "line-through" }}>{change.before}</span>}
        {change.before != null && change.after != null && <ArrowRight size={13} color={T.faint} />}
        {change.after != null && <span style={{ color: T.teal, fontWeight: 600 }}>{change.after}</span>}
      </span>
    </div>
  );
}
