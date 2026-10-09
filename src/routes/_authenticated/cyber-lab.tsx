import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, btn, btnGhost } from "@/components/soc/Shell";

export const Route = createFileRoute("/_authenticated/cyber-lab")({
  head: () => ({ meta: [{ title: "Cyber Lab — Eager AI" }, { name: "description", content: "Ethical hacking practice plans and isolated lab workspace." }] }),
  component: CyberLabPage,
});

const exercises = [
  { id: "web-basics", level: "Beginner", time: "15 min", title: "Web security fundamentals", category: "Web App Security", goal: "Learn request/response anatomy, security headers, cookies, and how to document findings.", steps: ["Inspect the supplied sample HTTP request.", "Identify missing defensive headers from the static example.", "Write a finding with impact and remediation."] },
  { id: "owasp-checklist", level: "Beginner", time: "25 min", title: "OWASP testing checklist", category: "Authorized Assessment", goal: "Practice a structured, non-destructive assessment plan using OWASP WSTG categories.", steps: ["Choose an application you own or an intentionally vulnerable training target.", "Map each test to a written scope and authorization.", "Record expected evidence and safe verification steps."] },
  { id: "log-hunt", level: "Intermediate", time: "20 min", title: "Security log investigation", category: "Blue Team / DFIR", goal: "Investigate a provided synthetic authentication log and distinguish signal from noise.", steps: ["Review the synthetic events shown in the exercise.", "Group repeated failures and unusual login locations.", "Write a concise incident timeline and next defensive checks."] },
  { id: "hash-forensics", level: "Beginner", time: "10 min", title: "Evidence integrity", category: "Digital Forensics", goal: "Understand file hashes, evidence provenance, and chain of custody.", steps: ["Use a harmless sample file in your local training environment.", "Calculate its SHA-256 hash with an approved tool.", "Record source, timestamp, hash, and handling notes."] },
];
type Exercise = typeof exercises[number];

function CyberLabPage() {
  const [selected, setSelected] = useState<Exercise>(exercises[0]!);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  return <>
    <PageTitle code="LAB-01 // ISOLATED TRAINING" title="Ethical Hacking Lab">
      <span className="label-mono border border-warning/40 px-2 py-1 rounded-sm">VM BACKEND NOT CONNECTED</span>
    </PageTitle>
    <div className="border border-warning/40 bg-warning/5 p-3 rounded-md text-sm mb-4"><strong>Honest status:</strong> This page currently provides guided exercises and a lab-session checklist. It does not create a real virtual machine or execute security tools. A real browser VM requires a separately deployed sandbox service with isolation, network controls, quotas, and session cleanup.</div>
    <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
      <Panel title="Training modules">
        <div className="space-y-2">{exercises.map((e) => <button key={e.id} onClick={() => { setSelected(e); setStarted(false); }} className={"w-full text-left rounded-sm border p-3 " + (selected.id === e.id ? "border-primary bg-accent" : "border-border hover:bg-secondary")}><div className="label-mono">{e.category}</div><div className="text-sm font-medium mt-1">{e.title}</div><div className="text-xs text-muted-foreground mt-1">{e.level} · {e.time}</div>{completed.includes(e.id) && <div className="text-xs text-success mt-2">COMPLETED</div>}</button>)}</div>
      </Panel>
      <div className="space-y-4">
        <Panel title={selected.title} action={<span className="label-mono">GUIDED EXERCISE</span>}>
          <p className="text-sm text-muted-foreground">{selected.goal}</p>
          <h3 className="font-mono text-xs mt-4 mb-2">EXERCISE CHECKLIST</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm">{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <div className="flex flex-wrap gap-2 mt-4"><button className={btn} onClick={() => setStarted(true)}>{started ? "Session checklist opened" : "Start guided session"}</button><button className={btnGhost} onClick={() => { setCompleted((old) => old.includes(selected.id) ? old : [...old, selected.id]); setStarted(false); }}>Mark exercise complete</button></div>
          {started && <div role="status" className="border rounded-sm p-3 mt-4 text-sm"><strong>Training session active — checklist mode.</strong><p className="text-muted-foreground mt-1">No commands are executed and no network targets are contacted. Work through the checklist and record your findings below.</p></div>}
        </Panel>
        <Panel title="Analyst notes">
          <label className="block text-sm"><span className="label-mono">Notes for {selected.title}</span><textarea className="w-full mt-2 min-h-28 rounded-sm border bg-background p-3 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Document observations, evidence, and remediation ideas…" /></label>
          <p className="text-xs text-muted-foreground mt-2">Notes remain in this page session. Persistent storage has not been connected.</p>
        </Panel>
        <Panel title="Real virtual environment — deployment requirements">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>A separately hosted disposable VM/container provider (for example, a browser-accessible remote desktop service).</li>
            <li>Per-user isolation, no host mounts, restricted egress, CPU/RAM/time limits, and automatic destroy-on-exit.</li>
            <li>Only intentionally vulnerable images or targets explicitly owned/authorized for testing.</li>
            <li>Short-lived session tokens, audit logs, abuse controls, and a kill switch.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Recommended learning framework: <a className="text-primary underline" href="https://owasp.org/projects/web-security-testing-guide" target="_blank" rel="noreferrer">OWASP Web Security Testing Guide</a>.</p>
        </Panel>
      </div>
    </div>
  </>;
}
