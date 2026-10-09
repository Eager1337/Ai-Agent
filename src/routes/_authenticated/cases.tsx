import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { AUTH_STATES } from "@/lib/soc-data";
import { useAudit, useCases, useInsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/cases")({
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

const empty = { name: "", description: "", organization: "", authorization_status: "Training Lab", auth_ref: "", scope: "", targets: "", start_date: "", end_date: "", team: "", classification: "TLP:AMBER" };
type Form = typeof empty;

function CasesPage() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const actor = user.email ?? "analyst";
  const { data: cases = [], isLoading } = useCases();
  const addCase = useInsert("cases", ["cases"]);
  const addAudit = useInsert("case_audit", ["audit"]);
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [confirmOp, setConfirmOp] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const current = cases.find((c) => c.id === sel) ?? (creating ? undefined : cases[0]);
  const { data: audit = [] } = useAudit(current?.id);

  const submit = async () => {
    setCaseError(null);
    if (!form.name.trim() || !form.scope.trim()) {
      setCaseError("Enter a case name and a clearly defined authorized scope.");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setCaseError("The authorization end date cannot be earlier than the start date.");
      return;
    }
    if (!agreed) {
      setCaseError("Confirm authorization before opening this case.");
      return;
    }
    try {
      const code = `CASE-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, "0")}`;
      const row = await addCase.mutateAsync({ ...form, name: form.name.trim(), scope: form.scope.trim(), code, investigator: actor, start_date: form.start_date || null, end_date: form.end_date || null });
      setSel(row.id); setCreating(false); setForm(empty); setAgreed(false);
      try {
        await addAudit.mutateAsync({ case_id: row.id, actor, action: `Case opened; user affirmed authorization; type=${form.authorization_status}; ref=${form.auth_ref || "n/a"}; scope=${form.scope.trim()}` });
      } catch {
        setCaseError("The case was created, but its initial audit entry failed. Reopen the case and verify the audit trail before continuing.");
      }
    } catch {
      setCaseError("The case could not be saved. Check your connection and database permissions, then try again.");
    }
  };

  const f = (k: keyof Form, label: string, type = "text") => (
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
          {isLoading ? <div className="h-20 animate-pulse bg-muted rounded" /> : cases.length === 0 ? <p className="text-sm text-muted-foreground">No cases yet.</p> : (
            <ul className="space-y-1">
              {cases.map((c) => (
                <li key={c.id}>
                  <button onClick={() => { setSel(c.id); setCreating(false); }} className={`w-full text-left p-2 rounded-sm border ${current?.id === c.id ? "border-primary bg-accent" : "border-transparent hover:bg-secondary"}`}>
                    <div className="flex justify-between font-mono text-xs"><span className="text-muted-foreground">{c.code}</span><span>{c.status}</span></div>
                    <div className="text-sm mt-0.5">{c.name}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {creating ? (
          <Panel title="Open new case">
            <div className="grid sm:grid-cols-2 gap-3">
              {f("name", "Case name")}{f("organization", "Organization")}
              <label className="block"><span className="label-mono">Authorization status</span>
                <select className={input + " mt-1"} value={form.authorization_status} onChange={(e) => setForm({ ...form, authorization_status: e.target.value })}>
                  {AUTH_STATES.map((a) => <option key={a}>{a}</option>)}</select></label>
              {f("auth_ref", "Authorization reference")}
              {f("scope", "Scope")}{f("targets", "Target assets")}
              {f("start_date", "Start date", "date")}{f("end_date", "End date", "date")}
              {f("team", "Team members")}
              <label className="block"><span className="label-mono">Classification</span>
                <select className={input + " mt-1"} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                  {["TLP:CLEAR", "TLP:GREEN", "TLP:AMBER", "TLP:RED"].map((a) => <option key={a}>{a}</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="label-mono">Description</span>
                <textarea className={input + " mt-1 h-20"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            </div>
            <label className="mt-4 flex gap-2 items-start text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
              I confirm that this case is for a training lab, coursework, research, incident response, or another activity I am authorized to perform, and that the scope above reflects that authorization.
            </label>
            {caseError && <p role="alert" className="text-sm text-destructive mt-2">{caseError}</p>}
            <div className="mt-4 flex gap-2">
              <button className={btn} disabled={!form.name.trim() || !form.scope.trim() || !agreed || addCase.isPending || addAudit.isPending} onClick={() => void submit()}>{addCase.isPending ? "Saving…" : "Open case"}</button>
              <button className={btnGhost} onClick={() => { setCreating(false); setAgreed(false); setCaseError(null); }}>Cancel</button>
            </div>
            {(addCase.error || addAudit.error) && <p role="alert" className="text-sm text-destructive mt-2">{caseError ?? "The case or audit event could not be saved completely. Check the case list and audit trail before retrying."}</p>}
          </Panel>
        ) : current ? (
          <div className="space-y-4">
            <Panel title={current.code} action={<span className="font-mono text-xs text-warning">{current.classification}</span>}>
              <h2 className="text-lg font-semibold">{current.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
              <dl className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
                {[["Organization", current.organization], ["Authorization", current.authorization_status], ["Auth ref", current.auth_ref],
                  ["Scope", current.scope], ["Targets", current.targets], ["Window", `${current.start_date ?? "—"} → ${current.end_date ?? "—"}`],
                  ["Investigator", current.investigator], ["Team", current.team], ["Status", current.status]].map(([k, v]) => (
                  <div key={k}><dt className="label-mono">{k}</dt><dd className="mt-0.5 break-words">{v || "—"}</dd></div>))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Prepare OSINT research plan", "Review supplied evidence", "Review scoped assessment plan"].map((op) => (
                  <button key={op} className={btnGhost} onClick={() => { setConfirmOp(op); setAgreed(false); setConfirmError(null); }}>{op}</button>))}
              </div>
            </Panel>
            <Panel title="Audit trail">
              <ul className="font-mono text-xs space-y-1.5">
                {audit.map((a) => <li key={a.id}><span className="text-muted-foreground">{new Date(a.created_at).toISOString().slice(0, 16).replace("T", " ")}</span> <span className="text-primary">{a.actor}</span> — {a.action}</li>)}
              </ul>
            </Panel>
          </div>
        ) : <Empty>Open your first case to start an authorized investigation.</Empty>}
      </div>

      {confirmOp && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md border border-warning/60 bg-popover rounded-md p-5">
            <div className="label-mono text-warning">Authorization check</div>
            <h3 className="text-lg font-semibold mt-1">Confirm that you are authorized to analyze this target.</h3>
            <p className="text-xs text-muted-foreground mt-2">This action only records your authorization confirmation. It does not run a scan, collect OSINT, or change any external system.</p>
            <p className="text-sm text-muted-foreground mt-2">{confirmOp} · {current.targets || "—"}<br />Basis: {current.authorization_status} ({current.auth_ref || "no ref"})</p>
            <label className="flex gap-2 mt-4 text-sm items-start"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
              I confirm this activity is within the authorized scope of this case.</label>
            {confirmError && <p role="alert" className="text-sm text-destructive mt-3">{confirmError}</p>}
            <div className="mt-5 flex gap-2 justify-end">
              <button className={btnGhost} onClick={() => setConfirmOp(null)}>Cancel</button>
              <button className={btn} disabled={!agreed || addAudit.isPending} onClick={async () => {
                setConfirmError(null);
                try {
                  await addAudit.mutateAsync({ case_id: current.id, actor, action: `Authorization confirmed for: ${confirmOp}; no external action executed` });
                  setConfirmOp(null);
                } catch {
                  setConfirmError("The confirmation could not be recorded. Nothing was executed; retry after checking your connection.");
                }
              }}>{addAudit.isPending ? "Saving…" : "Confirm & record"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
