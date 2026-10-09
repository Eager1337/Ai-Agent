import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, btn, btnGhost } from "@/components/soc/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/cyber-lab")({
  head: () => ({ meta: [{ title: "Cyber Lab — Eager AI" }, { name: "description", content: "Guided security exercises and isolated browser lab sessions." }] }),
  component: CyberLabPage,
});

const exercises = [
  { id: "web-basics", level: "Beginner", time: "15 min", title: "Web security fundamentals", category: "Web App Security", goal: "Learn request/response anatomy, security headers, cookies, and how to document findings.", steps: ["Inspect the supplied sample HTTP request.", "Identify missing defensive headers from the static example.", "Write a finding with impact and remediation."] },
  { id: "owasp-checklist", level: "Beginner", time: "25 min", title: "OWASP testing checklist", category: "Authorized Assessment", goal: "Practice a structured, non-destructive assessment plan using OWASP WSTG categories.", steps: ["Choose an application you own or an intentionally vulnerable training target.", "Map each test to a written scope and authorization.", "Record expected evidence and safe verification steps."] },
  { id: "log-hunt", level: "Intermediate", time: "20 min", title: "Security log investigation", category: "Blue Team / DFIR", goal: "Investigate a provided synthetic authentication log and distinguish signal from noise.", steps: ["Review the synthetic events shown in the exercise.", "Group repeated failures and unusual login locations.", "Write a concise incident timeline and next defensive checks."] },
  { id: "hash-forensics", level: "Beginner", time: "10 min", title: "Evidence integrity", category: "Digital Forensics", goal: "Understand file hashes, evidence provenance, and chain of custody.", steps: ["Use a harmless sample file in your local training environment.", "Calculate its SHA-256 hash with an approved tool.", "Record source, timestamp, hash, and handling notes."] },
];
type Exercise = typeof exercises[number];
type LabMode = "linux-desktop" | "virtual-machine";

function CyberLabPage() {
  const [selected, setSelected] = useState<Exercise>(exercises[0]!);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busyMode, setBusyMode] = useState<LabMode | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [launchUrl, setLaunchUrl] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  async function startLab(mode: LabMode) {
    setBusyMode(mode); setSessionStatus("Requesting an isolated workspace…"); setLaunchUrl(""); setProgress(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/lab/sessions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode }) });
      const created = await response.json() as { sessionId?: string; status?: string; error?: string };
      if (!response.ok || !created.sessionId) throw new Error(created.error ?? "Could not start a lab session.");
      setSessionId(created.sessionId);
      setSessionStatus("Workspace is starting. Waiting for the provider to confirm it is ready…");
      for (let attempt = 0; attempt < 18; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const check = await fetch(`/api/lab/sessions/${created.sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        const state = await check.json() as { status?: string; launchUrl?: string; progress?: number | null; message?: string; error?: string };
        if (state.status === "running" && state.launchUrl) {
          setLaunchUrl(state.launchUrl); setSessionStatus("Provider confirms the isolated workspace is running. Open it in a new tab."); setProgress(100); return;
        }
        if (!check.ok && check.status !== 202) throw new Error(state.error ?? state.message ?? "Could not verify the workspace status.");
        setProgress(typeof state.progress === "number" ? state.progress : null);
        setSessionStatus(state.message ?? `Workspace starting… check ${attempt + 1} of 18`);
      }
      setSessionStatus("The session request was accepted but is still starting. Use Check status to continue waiting.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Could not start the lab.");
    } finally { setBusyMode(null); }
  }

  async function stopLab() {
    if (!sessionId) return;
    setBusyMode("linux-desktop");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch(`/api/lab/sessions/${sessionId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json() as { status?: string; message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not stop lab session.");
      setSessionStatus(result.message ?? "Stop request sent.");
      setLaunchUrl("");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Could not stop lab session.");
    } finally { setBusyMode(null); }
  }

  async function checkLabStatus() {
    if (!sessionId) return;
    setBusyMode("linux-desktop");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch(`/api/lab/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
      const state = await response.json() as { status?: string; launchUrl?: string; progress?: number | null; message?: string; error?: string };
      if (state.status === "running" && state.launchUrl) { setLaunchUrl(state.launchUrl); setSessionStatus("Provider confirms the isolated workspace is running."); setProgress(100); }
      else if (response.status === 202) { setSessionStatus(state.message ?? "Workspace is still starting."); setProgress(state.progress ?? null); }
      else throw new Error(state.error ?? state.message ?? "Could not verify the workspace.");
    } catch (error) { setSessionStatus(error instanceof Error ? error.message : "Could not check lab status."); }
    finally { setBusyMode(null); }
  }

  return <>
    <PageTitle code="LAB-01 // AUTHORIZED TRAINING" title="Ethical Hacking Lab">
      <span className="label-mono border border-warning/40 px-2 py-1 rounded-sm">PROVIDER SETUP REQUIRED</span>
    </PageTitle>
    <div className="border border-warning/40 bg-warning/5 p-3 rounded-md text-sm mb-4"><strong>Live lab status:</strong> Session-launch code is implemented for a separately hosted Kasm Workspaces provider. A real desktop or VM will start only after the provider URL, API permissions, and the correct preconfigured workspace image IDs are set on the server and the database migration is applied. No security tools run on the Eager AI web server.</div>
    <Panel title="Isolated environments" className="mb-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border rounded-sm p-4"><div className="label-mono">ENVIRONMENT 01</div><h3 className="font-semibold mt-1">Browser Linux desktop</h3><p className="text-sm text-muted-foreground mt-2">Launch a browser-delivered Linux workspace configured by your Kasm administrator for safe learning tools and lab targets.</p><button className={btn + " mt-3"} disabled={busyMode !== null} onClick={() => void startLab("linux-desktop")}>{busyMode === "linux-desktop" ? "Starting…" : "Start Linux desktop"}</button></div>
        <div className="border rounded-sm p-4"><div className="label-mono">ENVIRONMENT 02</div><h3 className="font-semibold mt-1">Full virtual machine</h3><p className="text-sm text-muted-foreground mt-2">Launch a separate VM or server-pool workspace only when the provider is configured with a dedicated image and network isolation.</p><button className={btn + " mt-3"} disabled={busyMode !== null} onClick={() => void startLab("virtual-machine")}>{busyMode === "virtual-machine" ? "Starting…" : "Start full VM"}</button></div>
      </div>
      {sessionStatus && <div role="status" className="border rounded-sm p-3 mt-4 text-sm"><p>{sessionStatus}</p>{progress !== null && <p className="text-muted-foreground mt-1">Provider progress: {progress}%</p>}<div className="flex flex-wrap gap-2 mt-3">{sessionId && !launchUrl && <button className={btnGhost} disabled={busyMode !== null} onClick={() => void checkLabStatus()}>Check status</button>}{launchUrl && <a className={btn} href={launchUrl} target="_blank" rel="noreferrer">Open isolated workspace ↗</a>}{sessionId && <button className={btnGhost} disabled={busyMode !== null} onClick={() => void stopLab()}>Stop workspace</button>}</div></div>}
    </Panel>
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
          {started && <div role="status" className="border rounded-sm p-3 mt-4 text-sm"><strong>Guided checklist active.</strong><p className="text-muted-foreground mt-1">No commands are executed and no external targets are contacted by this checklist.</p></div>}
        </Panel>
        <Panel title="Analyst notes">
          <label className="block text-sm"><span className="label-mono">Notes for {selected.title}</span><textarea className="w-full mt-2 min-h-28 rounded-sm border bg-background p-3 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Document observations, evidence, and remediation ideas…" /></label>
          <p className="text-xs text-muted-foreground mt-2">Notes remain in this page session. Persistent storage has not been connected.</p>
        </Panel>
        <Panel title="Isolation and authorization requirements">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Use dedicated disposable Linux workspace images and VM/server-pool targets; do not mount the host filesystem.</li>
            <li>Block access to cloud metadata, private networks, and other tenants; allow only explicitly approved lab networks.</li>
            <li>Apply CPU/RAM/session quotas, audit logs, and an automatic one-hour expiry.</li>
            <li>Use only intentionally vulnerable training images or systems you own or have explicit permission to test.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Learning framework: <a className="text-primary underline" href="https://owasp.org/projects/web-security-testing-guide" target="_blank" rel="noreferrer">OWASP Web Security Testing Guide</a>.</p>
        </Panel>
      </div>
    </div>
  </>;
}
