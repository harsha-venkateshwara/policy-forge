import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Library, Binary, ListChecks, GitCompare, UserCheck, Loader2 } from "lucide-react";
import { T } from "./theme";
import { api } from "./api/client";
import { Sidebar, TopBar, Logo } from "./components/ui";
import type { Bootstrap, Health, Resolution } from "./types";
import Dashboard from "./views/Dashboard";
import PolicyLibrary from "./views/PolicyLibrary";
import Compiler from "./views/Compiler";
import Claims from "./views/Claims";
import ReviewQueue from "./views/ReviewQueue";
import PolicyDiff from "./views/PolicyDiff";
import ClaimDrawer from "./views/ClaimDrawer";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});
  const [selectedPolicy, setSelectedPolicy] = useState("P-1042");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.bootstrap()
      .then((b) => { setData(b); setResolved(b.resolutions || {}); })
      .catch((e) => setError(e.message));
    api.health().then(setHealth).catch(() => {});
  }, []);

  const effective = (cid: string): string => resolved[cid]?.outcome || (data ? data.determinations[cid].final : "pay");

  const stats = useMemo(() => {
    if (!data) return { total: 0, pay: 0, flag: 0, deny: 0, review: 0, savings: 0, autoRate: 0 };
    let pay = 0, flag = 0, deny = 0, review = 0, savings = 0;
    data.claims.forEach((c) => {
      const o = effective(c.id);
      if (o === "pay") pay++;
      else if (o === "flag") { flag++; savings += c.billed; }
      else if (o === "deny") { deny++; savings += c.billed; }
      else review++;
    });
    const total = data.claims.length;
    return { total, pay, flag, deny, review, savings, autoRate: total ? Math.round(((total - review) / total) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, resolved]);

  // A compile overwrites a rule server-side; re-pull rules + determinations so the
  // whole app reflects the new logic.
  async function refreshAdjudications() {
    const [rules, determinations] = await Promise.all([api.rules(), api.adjudications()]);
    setData((d) => (d ? { ...d, rules, determinations } : d));
  }

  async function resolve(claimId: string, outcome: string) {
    const r = await api.resolve(claimId, outcome, "HV");
    setResolved((prev) => ({ ...prev, [claimId]: r }));
  }

  if (error) return <Splash error={error} />;
  if (!data) return <Splash />;

  const nav = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "library", label: "Policy Library", Icon: Library },
    { id: "compiler", label: "Policy Compiler", Icon: Binary, badge: "AI" },
    { id: "claims", label: "Claims Adjudication", Icon: ListChecks },
    { id: "review", label: "Review Queue", Icon: UserCheck, count: stats.review },
    { id: "diff", label: "Policy Change Diff", Icon: GitCompare },
  ];
  const title = nav.find((n) => n.id === view)?.label || "";

  const openPolicy = (policyId: string) => { setSelectedPolicy(policyId); setView("compiler"); };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, color: T.text, position: "relative", overflow: "hidden" }}>
      <Sidebar view={view} setView={setView} nav={nav} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title={title} health={health} />
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {view === "dashboard" && <Dashboard data={data} stats={stats} effective={effective} go={setView} />}
          {view === "library" && <PolicyLibrary data={data} onOpen={openPolicy} />}
          {view === "compiler" && <Compiler data={data} selectedPolicy={selectedPolicy} setSelectedPolicy={setSelectedPolicy} onCompiled={refreshAdjudications} />}
          {view === "claims" && <Claims data={data} effective={effective} openDrawer={setDrawer} />}
          {view === "review" && <ReviewQueue data={data} resolved={resolved} resolve={resolve} openDrawer={setDrawer} />}
          {view === "diff" && <PolicyDiff data={data} onApplied={refreshAdjudications} />}
        </main>
      </div>
      {drawer && (
        <ClaimDrawer
          claim={data.claims.find((c) => c.id === drawer)!}
          result={data.determinations[drawer]}
          resolution={resolved[drawer]}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function Splash({ error }: { error?: string }) {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: T.bg }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={48} /></div>
        {error ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Can't reach the PolicyForge API</div>
            <div style={{ fontSize: 13.5, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>{error}</div>
            <div style={{ fontSize: 12.5, color: T.faint, marginTop: 12 }}>
              Start the backend with <code style={{ fontFamily: T.mono }}>uvicorn app.main:app --reload</code>, then refresh.
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", color: T.muted, fontSize: 13.5 }}>
            <Loader2 size={16} className="spin" /> Loading payment integrity workspace…
          </div>
        )}
      </div>
    </div>
  );
}
