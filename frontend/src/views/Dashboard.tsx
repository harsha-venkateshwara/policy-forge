import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, Tooltip } from "recharts";
import { Scale, ListChecks, FileCode2, UserCheck, Sparkles, ArrowRight } from "lucide-react";
import { T, money } from "../theme";
import { Metric, CardHead, Badge, Code, joinNodes } from "../components/ui";
import type { Bootstrap } from "../types";

const TREND = [
  { d: "Mon", v: 1840 }, { d: "Tue", v: 2110 }, { d: "Wed", v: 1980 }, { d: "Thu", v: 2470 },
  { d: "Fri", v: 2240 }, { d: "Sat", v: 1290 }, { d: "Sun", v: 980 }, { d: "Today", v: 2620 },
];

export default function Dashboard({ data, stats, effective, go }:
  { data: Bootstrap; stats: any; effective: (id: string) => string; go: (v: string) => void }) {
  const split = [
    { k: "Pay", v: stats.pay, c: T.pass }, { k: "Flag", v: stats.flag, c: T.flag },
    { k: "Deny", v: stats.deny, c: T.deny }, { k: "Review", v: stats.review, c: T.review },
  ];
  const recent = data.claims.slice(0, 5);
  const policyCount = Object.keys(data.rules).length;

  return (
    <div className="up" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", color: T.ink }}>Payment integrity overview</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13.5 }}>Live adjudication across compiled payment policies · cycle to date</p>
        </div>
        <button className="btn btn-primary" onClick={() => go("compiler")}><Sparkles size={15} /> Compile a policy</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <Metric label="Findings identified" value={money(stats.savings)} sub="flagged + denied charges" accent={T.teal} Icon={Scale} trend="+18% vs last cycle" />
        <Metric label="Claims adjudicated" value={stats.total.toLocaleString()} sub="this run" accent={T.ink} Icon={ListChecks} trend={`${stats.autoRate}% auto-adjudicated`} />
        <Metric label="Active policies" value={policyCount} sub="compiled & verified" accent={T.lime} Icon={FileCode2} trend="AI-compiled" />
        <Metric label="In human review" value={stats.review} sub="awaiting analyst" accent={T.review} Icon={UserCheck} trend="governance gate" warn />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <CardHead title="Claims processed" right="Last 8 days" />
          <div style={{ height: 180, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.teal} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={T.teal} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.faint }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontSize: 12, boxShadow: T.shadowMd }} labelStyle={{ color: T.muted, fontWeight: 600 }} />
                <Area type="monotone" dataKey="v" stroke={T.teal} strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <CardHead title="Outcome distribution" right={`${stats.total} claims`} />
          <div style={{ height: 132, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={split} margin={{ top: 8, right: 6, left: -22, bottom: 0 }} barCategoryGap="34%">
                <XAxis dataKey="k" tick={{ fontSize: 11, fill: T.faint }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: T.panel2 }} contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontSize: 12 }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                  {split.map((s, i) => <Cell key={i} fill={s.c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            {split.map((s) => (
              <span key={s.k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.muted }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.c }} /> {s.k} <b style={{ color: T.inkSoft }}>{s.v}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <CardHead title="Recent adjudications" />
          <button className="btn btn-ghost" style={{ padding: "7px 13px" }} onClick={() => go("claims")}>View all <ArrowRight size={14} /></button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {recent.map((c) => {
              const r = data.determinations[c.id];
              return (
                <tr key={c.id} className="row" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                  <td style={{ padding: "13px 20px", fontFamily: T.mono, fontSize: 12.5, color: T.inkSoft, fontWeight: 500, width: 110 }}>{c.id}</td>
                  <td style={{ padding: "13px 8px", fontSize: 12.5, color: T.muted }}>{joinNodes(c.codes.map((x) => <Code key={x}>{x}</Code>))}</td>
                  <td style={{ padding: "13px 8px", fontSize: 12.5, color: T.muted }}>Member {c.member} · {money(c.billed)}</td>
                  <td style={{ padding: "13px 8px", fontSize: 12, color: T.faint, maxWidth: 360 }}>{r.evals.length ? r.evals[0].title : "No policy applies"}</td>
                  <td style={{ padding: "13px 20px", textAlign: "right" }}><Badge outcome={effective(c.id)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
