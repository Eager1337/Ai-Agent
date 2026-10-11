import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { useCaseItems, useCases, useDelete, useInsert } from "@/lib/db";
import { detectIoc, pivots, sha256Hex } from "@/lib/ioc";
import { streamPost } from "@/lib/stream";

export const Route = createFileRoute("/_authenticated/case/$caseId")({
  head: () => ({
    meta: [
      { title: "Case Workspace — Eager AI Command Center" },
      { name: "description", content: "Investigate indicators and evidence for an open case with OSINT, forensics and AI planning." },
      { property: "og:title", content: "Case Workspace — Eager AI Command Center" },
      { property: "og:description", content: "Investigate indicators and evidence for an open case with OSINT, forensics and AI planning." },
    ],
  }),
  component: CaseWorkspace,
});

type Tab = "osint" | "forensics" | "plan";
const MAX_HASH = 512 * 1024 * 1024;

function CaseWorkspace() {
  const { caseId } = Route.useParams();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: cases = [], isLoading } = useCases();
  const c = cases.find((x) => x.id === caseId);
  const { data: items = [] } = useCaseItems(caseId);
  const addItem = useInsert("case_items", ["case_items"]);
  const delItem = useDelete("case_items", ["case_items"]);
  const saveNote = useInsert("notes", ["notes"]);
  const [tab, setTab] = useState<Tab>("osint");
  const [iocText, setIocText] = useState("");
  const [evNote, setEvNote] = useState("");
  const [extra, setExtra] = useState("");
  const [hashing, setHashing] = useState("");
  const [out, setOut] = useState<Record<Tab, string>>({ osint: "", forensics: "", plan: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saved, setSaved] = useState(false);

  if (isLoading) return <div className="h-32 animate-pulse bg-muted rounded" />;
  if (!c) return <Panel title="Case not found"><Link to="/cases" className="text-primary text-sm">Back to cases</Link></Panel>;

  const indicators = items.filter((i) => i.kind === "indicator");
  const evidence = items.filter((i) => i.kind === "evidence");

  const addIocs = async () => {
    setErr(null);
    const existing = new Set(indicators.map((i) => i.value));
    const lines = [...new Set(iocText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))];
    try {
      for (const l of lines) {
        const d = detectIoc(l);
        if (existing.has(d.value)) continue;
        await addItem.mutateAsync({ case_id: c.id, kind: "indicator", item_type: d.type, value: d.value });
      }
      setIocText("");
    } catch { setErr("Some indicators could not be saved."); }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setErr(null);
    for (const f of Array.from(files)) {
      try {
        setHashing(f.name);
        const sha = f.size <= MAX_HASH ? await sha256Hex(await f.arrayBuffer()) : null;
        await addItem.mutateAsync({
          case_id: c.id, kind: "evidence", item_type: "file", value: f.name, sha256: sha, size_bytes: f.size,
          mime: f.type || "unknown", modified_at: new Date(f.lastModified).toISOString(),
          notes: sha ? "" : "Too large to hash in browser — hash with a forensic tool.",
        });
      } catch { setErr(`Could not record ${f.name}.`); }
    }
    setHashing("");
  };

  const addEvNote = async () => {
    try {
      await addItem.mutateAsync({ case_id: c.id, kind: "evidence", item_type: "note", value: evNote.trim().slice(0, 200), notes: evNote.trim(), sha256: await sha256Hex(evNote.trim()) });
      setEvNote("");
    } catch { setErr("The evidence note could not be saved."); }
  };

  const run = async () => {
    setConfirm(false); setBusy(true); setErr(null); setSaved(false);
    setOut((o) => ({ ...o, [tab]: "" }));
    try { await streamPost("/api/analyze", { caseId: c.id, mode: tab, extra }, (t) => setOut((o) => ({ ...o, [tab]: t }))); }
    catch (e) { setErr(e instanceof Error ? e.message : "Analysis failed"); }
    setBusy(false);
  };

  const tabs: [Tab, string][] = [["osint", `OSINT · ${indicators.length}`], ["forensics", `Forensics · ${evidence.length}`], ["plan", "AI Planner"]];
  const result = out[tab];

  return (
    <>
      <PageTitle code={`${c.code} // WORKSPACE`} title={c.name}>
        <Link to="/cases" className={btnGhost}>All cases</Link>
      </PageTitle>
      <p className="text-xs text-muted-foreground -mt-2 mb-4 font-mono">{c.authorization_status} · ref {c.auth_ref || "n/a"} · scope: {c.scope}</p>
      <div className="flex gap-1 mb-4 border-b">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 font-mono text-xs border-b-2 ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{l}</button>)}
      </div>
      {err && <p role="alert" className="text-sm text-destructive mb-3">{err}</p>}

      <div className="grid lg:grid-cols-[460px_1fr] gap-4">
        <div className="space-y-4">
          {tab === "osint" && (
            <>
              <Panel title="Add indicators">
                <textarea className={input + " h-28 font-mono text-xs"} value={iocText} onChange={(e) => setIocText(e.target.value)} placeholder={"IPs, domains, URLs, hashes, emails, CVEs — one per line\nDefanged values like evil[.]com are accepted"} />
                <button className={btn + " mt-2"} disabled={!iocText.trim() || addItem.isPending} onClick={() => void addIocs()}>Add to case</button>
              </Panel>
              <Panel title={`${indicators.length} indicators`}>
                {indicators.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                  <ul className="divide-y">{indicators.map((i) => (
                    <li key={i.id} className="py-2">
                      <div className="flex justify-between gap-2 font-mono text-xs"><span><span className="text-info uppercase mr-2">{i.item_type}</span><span className="break-all">{i.value}</span></span>
                        <button className="text-muted-foreground hover:text-destructive" aria-label="Remove" onClick={() => delItem.mutate(i.id)}>×</button></div>
                      <div className="flex flex-wrap gap-2 mt-1">{pivots(i.item_type, i.value).map((p) => <a key={p.label} href={p.href} target="_blank" rel="noreferrer noopener" className="text-[11px] text-primary underline-offset-2 hover:underline">{p.label} ↗</a>)}</div>
                    </li>))}</ul>
                )}
                <p className="text-[11px] text-muted-foreground mt-3">Lookup links open public services in a new tab only when you click them. The app does not contact any target.</p>
              </Panel>
            </>
          )}
          {tab === "forensics" && (
            <>
              <Panel title="Add evidence">
                <label className="label-mono">Files (hashed locally, never uploaded)</label>
                <input type="file" multiple className="block mt-1 text-sm" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
                {hashing && <p className="text-xs text-muted-foreground mt-1">Hashing {hashing}…</p>}
                <label className="label-mono mt-4 block">Or describe an item</label>
                <textarea className={input + " mt-1 h-20"} value={evNote} onChange={(e) => setEvNote(e.target.value)} placeholder="e.g. Memory capture of WS-FIN-05, acquired 14:02 UTC by A. Kamara with WinPMEM" />
                <button className={btn + " mt-2"} disabled={!evNote.trim() || addItem.isPending} onClick={() => void addEvNote()}>Record item</button>
              </Panel>
              <Panel title={`${evidence.length} evidence items`}>
                {evidence.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                  <ul className="divide-y">{evidence.map((i) => (
                    <li key={i.id} className="py-2 font-mono text-xs">
                      <div className="flex justify-between gap-2"><span className="break-all">{i.value}</span><button className="text-muted-foreground hover:text-destructive" aria-label="Remove" onClick={() => delItem.mutate(i.id)}>×</button></div>
                      <div className="text-muted-foreground mt-0.5">{i.item_type} · {i.mime ?? "—"} · {i.size_bytes != null ? `${(i.size_bytes / 1024).toFixed(1)} KB` : "—"} · modified {i.modified_at ? i.modified_at.slice(0, 16).replace("T", " ") : "—"}</div>
                      {i.sha256 && <div className="text-muted-foreground break-all">sha256 {i.sha256}</div>}
                      {i.notes && i.item_type !== "note" && <div className="text-warning">{i.notes}</div>}
                    </li>))}</ul>
                )}
              </Panel>
            </>
          )}
          {tab === "plan" && (
            <Panel title="Planner input">
              <p className="text-sm text-muted-foreground">Uses this case's details, its {indicators.length} indicators and {evidence.length} evidence items. Add anything else below.</p>
              <textarea className={input + " mt-3 h-40"} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Extra context: what happened, alerts, timeline…" />
            </Panel>
          )}
          <button className={btn + " w-full justify-center"} disabled={busy} onClick={() => { setAgreed(false); setConfirm(true); }}>
            {busy ? "Analyzing…" : tab === "osint" ? "Analyze indicators with AI" : tab === "forensics" ? "Analyze evidence with AI" : "Generate investigation plan"}
          </button>
        </div>

        <Panel title="AI analysis" action={result && !busy ? (
          <button className="font-mono text-xs text-primary" disabled={saved || saveNote.isPending} onClick={async () => { try { await saveNote.mutateAsync({ title: `${c.code} ${tab} analysis`, body: result }); setSaved(true); } catch { setErr("Could not save the note."); } }}>{saved ? "Saved ✓" : "Save as note"}</button>
        ) : undefined}>
          {!result && <p className="text-sm text-muted-foreground">{busy ? "Working…" : "Results appear here."}</p>}
          <div className="text-sm leading-relaxed [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-4 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:mt-1 [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2"><ReactMarkdown>{result}</ReactMarkdown></div>
        </Panel>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md border border-warning/60 bg-popover rounded-md p-5">
            <div className="label-mono text-warning">Authorization check</div>
            <h3 className="text-lg font-semibold mt-1">Confirm that you are authorized to analyze this target.</h3>
            <p className="text-sm text-muted-foreground mt-2">{c.targets || "—"} · {c.authorization_status}. Recorded in the audit trail as {user.email}.</p>
            <label className="flex gap-2 mt-4 text-sm items-start"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />I confirm this analysis is within the authorized scope of this case.</label>
            <div className="mt-5 flex gap-2 justify-end">
              <button className={btnGhost} onClick={() => setConfirm(false)}>Cancel</button>
              <button className={btn} disabled={!agreed} onClick={() => void run()}>Confirm & run</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
