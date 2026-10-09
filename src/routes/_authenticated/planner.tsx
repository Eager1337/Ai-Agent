import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { PageTitle, Panel, btn, input } from "@/components/soc/Shell";
import { useCases, useInsert } from "@/lib/db";
import { streamPost } from "@/lib/stream";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [
    { title: "Investigation Planner — Eager AI" },
    { name: "description", content: "AI-generated prioritized investigation steps and evidence summaries." },
    { property: "og:title", content: "Investigation Planner — Eager AI" },
    { property: "og:description", content: "AI-generated prioritized investigation steps and evidence summaries." },
  ] }),
  component: Planner,
});

function Planner() {
  const { data: cases = [] } = useCases();
  const saveNote = useInsert("notes", ["notes"]);
  const [details, setDetails] = useState("");
  const [iocs, setIocs] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadCase = (id: string) => {
    const c = cases.find((x) => x.id === id); if (!c) return;
    setDetails(`${c.code} — ${c.name}\nOrganization: ${c.organization}\nAuthorization: ${c.authorization_status} (${c.auth_ref})\nScope: ${c.scope}\nTargets: ${c.targets}\n\n${c.description}`);
  };
  const run = async () => {
    setBusy(true); setErr(null); setOut(""); setSaved(false);
    try { await streamPost("/api/plan", { caseDetails: details, indicators: iocs }, setOut); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  };

  return (
    <>
      <PageTitle code="SEC-02 // PLANNER" title="Investigation Planner" />
      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        <Panel title="Input">
          {cases.length > 0 && (
            <select className={input + " mb-3"} defaultValue="" onChange={(e) => loadCase(e.target.value)}>
              <option value="" disabled>Load from a case…</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          )}
          <label className="label-mono">Case details</label>
          <textarea className={input + " mt-1 h-40"} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened, scope, affected assets, timeline…" />
          <label className="label-mono mt-3 block">Threat indicators</label>
          <textarea className={input + " mt-1 h-32 font-mono text-xs"} value={iocs} onChange={(e) => setIocs(e.target.value)} placeholder={"one per line, e.g.\n185.199.44.17\nnorthbr1dge-pay.com\nsha256:9f2c…"} />
          <button className={btn + " mt-3 w-full justify-center"} disabled={busy || !details.trim()} onClick={run}>{busy ? "Analyzing…" : "Generate plan"}</button>
        </Panel>
        <Panel title="Plan" action={out && !busy ? (
          <button className="font-mono text-xs text-primary" disabled={saved} onClick={async () => { await saveNote.mutateAsync({ title: `Investigation plan — ${details.split("\n")[0]!.slice(0, 60)}`, body: out }); setSaved(true); }}>{saved ? "Saved ✓" : "Save as note"}</button>
        ) : undefined}>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!out && !err && <p className="text-sm text-muted-foreground">{busy ? "Working…" : "Your prioritized steps and evidence summary will appear here."}</p>}
          <div className="text-sm leading-relaxed [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-4 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:mt-1 [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2"><ReactMarkdown>{out}</ReactMarkdown></div>
        </Panel>
      </div>
    </>
  );
}
