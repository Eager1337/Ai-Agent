import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { AUTH_STATES, type Case } from "@/lib/soc-data";
import { useSoc } from "@/lib/soc-store";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Cases — Eager AI Command Center" },
      { name: "description", content: "Authorized cases with scope, authorization and audit trail." },
      { property: "og:title", content: "Cases — Eager AI Command Center" },
      { property: "og:description", content: "Authorized cases with scope, authorization and audit trail." },
    ],
  }),
  component: CasesPage,
});

const empty = { name: "", description: "", organization: "", authorization: AUTH_STATES[0]! as Case["authorization"], authRef: "", scope: "", targets: "", start: "", end: "", team: "", classification: "TLP:AMBER" as Case["classification"] };

function CasesPage() {
  const { cases, addCase, logAudit } = useSoc();
  const [sel, setSel] = useState(cases[0]?.id);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [confirmOp, setConfirmOp] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const current = cases.find((c) => c.id === sel);

  const submit = () => {
    const id = `CASE-2026-${String(143 + cases.length).padStart(4, "0")}`;
    addCase({ ...form, id, investigator: "A. Kamara", status: "Open",
      audit: [{ at: new Date().toISOString().slice(0, 16).replace("T", " "), actor: "A. Kamara", action: `Case opened (${form.authorization}, ref ${form.authRef || "n/a"})` }] });
    setSel(id); setCreating(false); setForm(empty);
  };

  const f = (k: keyof typeof empty, label: string, type = "text") => (
    <label className="block"><span className="label-mono">{label}</span>
      <input type={type} className={input + " mt-1"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );

  return (
    <>
      <PageTitle code="SEC-01 // CASES" title="Authorized Cases">
        <button className={btn} onClick={() => setCreating(true)}>+ New case</button>
      </PageTitle>
      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <Panel title={`${cases.length} cases`}>
          <ul className="space-y-1">
            {cases.map((c) => (
              <li key={c.id}>
                <button onClick={() => { setSel(c.id); setCreating(false); }} className={`w-full text-left p-2 rounded-sm border ${sel === c.id && !creating ? "border-primary bg-accent" : "border-transparent hover:bg-secondary"}`}>
                  <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">{c.id}</span><span>{c.status}</span></div>
                  <div className="text-sm mt-0.5">{c.name}</div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {creating ? (
          <Panel title="Open new case">
            <div className="grid sm:grid-cols-2 gap-3">
              {f("name", "Case name")}{f("organization", "Organization")}
              <label className="block"><span className="label-mono">Authorization status</span>
                <select className={input + " mt-1"} value={form.authorization} onChange={(e) => setForm({ ...form, authorization: e.target.value as Case["authorization"] })}>
                  {AUTH_STATES.map((a) => <option key={a}>{a}</option>)}</select></label>
              {f("authRef", "Authorization reference")}
              {f("scope", "Scope")}{f("targets", "Target assets")}
              {f("start", "Start date", "date")}{f("end", "End date", "date")}
              {f("team", "Team members")}
              <label className="block"><span className="label-mono">Classification</span>
                <select className={input + " mt-1"} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value as Case["classification"] })}>
                  {["TLP:CLEAR", "TLP:GREEN", "TLP:AMBER", "TLP:RED"].map((a) => <option key={a}>{a}</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="label-mono">Description</span>
                <textarea className={input + " mt-1 h-20"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            </div>
            <div className="mt-4 flex gap-2">
              <button className={btn} disabled={!form.name || !form.scope} onClick={submit}>Open case</button>
              <button className={btnGhost} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </Panel>
        ) : current && (
          <div className="space-y-4">
            <Panel title={current.id} action={<span className="font-mono text-xs text-warning">{current.classification}</span>}>
              <h2 className="text-lg font-semibold">{current.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
              <dl className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
                {[["Organization", current.organization], ["Authorization", current.authorization], ["Auth ref", current.authRef],
                  ["Scope", current.scope], ["Targets", current.targets], ["Window", `${current.start} → ${current.end}`],
                  ["Investigator", current.investigator], ["Team", current.team], ["Status", current.status]].map(([k, v]) => (
                  <div key={k}><dt className="label-mono">{k}</dt><dd className="mt-0.5">{v || "—"}</dd></div>))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Run OSINT collection", "Analyze evidence", "Scan target assets"].map((op) => (
                  <button key={op} className={btnGhost} onClick={() => { setConfirmOp(op); setAgreed(false); }}>{op}</button>))}
              </div>
            </Panel>
            <Panel title="Audit trail">
              <ul className="font-mono text-xs space-y-1.5">
                {current.audit.map((a, i) => <li key={i}><span className="text-muted-foreground">{a.at}</span> <span className="text-primary">{a.actor}</span> — {a.action}</li>)}
              </ul>
            </Panel>
          </div>
        )}
      </div>

      {confirmOp && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md border border-warning/60 bg-popover rounded-md p-5">
            <div className="label-mono text-warning">Authorization check</div>
            <h3 className="text-lg font-semibold mt-1">Confirm that you are authorized to analyze this target.</h3>
            <p className="text-sm text-muted-foreground mt-2">{confirmOp} · {current.targets}<br />Basis: {current.authorization} ({current.authRef})</p>
            <label className="flex gap-2 mt-4 text-sm items-start"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
              I confirm this activity is within the authorized scope of this case.</label>
            <div className="mt-5 flex gap-2 justify-end">
              <button className={btnGhost} onClick={() => setConfirmOp(null)}>Cancel</button>
              <button className={btn} disabled={!agreed} onClick={() => { logAudit(current.id, `Authorization confirmed for: ${confirmOp}`); setConfirmOp(null); }}>Confirm & proceed</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
