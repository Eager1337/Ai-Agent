import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Empty, PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { useAudit, useCases, useInsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security Operations — Eager AI" }, { name: "description", content: "Authorized cybersecurity investigation workspace." }] }),
  component: SecurityWorkspace,
});

const sections = ["Overview", "Evidence & DFIR", "OSINT", "Network Analysis", "Malware Triage", "Incident Response", "Threat Intel", "ATT&CK", "Hunting", "Reports", "Security Labs", "Credential Safety"] as const;
type Section = typeof sections[number];
type EvidenceResult = { name: string; size: number; type: string; sha256: string; text: string; source: string };
const provenance = { user: "USER-PROVIDED INFORMATION", inference: "AI INFERENCE", simulated: "SIMULATED LAB DATA", unverified: "UNVERIFIED INFORMATION" };

function SecurityWorkspace() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: cases = [], isLoading } = useCases();
  const [section, setSection] = useState<Section>("Overview");
  const [caseId, setCaseId] = useState("");
  const [learning, setLearning] = useState(true);
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<EvidenceResult | null>(null);
  const [finding, setFinding] = useState({ title: "", source: "", url: "", details: "", confidence: "Unverified" });
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState("");
  const selectedCase = cases.find((c) => c.id === caseId) ?? cases[0];
  const { data: audit = [] } = useAudit(selectedCase?.id);
  const addAudit = useInsert("case_audit", ["audit"]);
  const actor = user.email ?? "analyst";
  const canAnalyze = !!selectedCase && !!selectedCase.scope.trim() && !!selectedCase.authorization_status;
  const filteredAudit = audit.filter((item) => (item.action + item.actor).toLowerCase().includes(query.toLowerCase()));

  const exportReport = () => {
    const body = [
      "# Eager AI — Security Investigation Report", "",
      `Generated: ${new Date().toISOString()}`,
      `Case: ${selectedCase?.code ?? "No case selected"} — ${selectedCase?.name ?? ""}`,
      `Authorization: ${selectedCase?.authorization_status ?? "Not established"}`,
      `Authorization reference: ${selectedCase?.auth_ref || "Not provided"}`,
      `Scope: ${selectedCase?.scope || "Not provided"}`, "",
      "## Summary", report || "No analyst summary has been entered.",
      "", "## Evidence reviewed",
      file ? `- ${file.name} (${file.size} bytes; SHA-256: ${file.sha256}; source: ${provenance.user})` : "- No file analyzed in this session.",
      "", "## Audit events", ...audit.map((a) => `- ${a.created_at} | ${a.actor} | ${a.action}`),
      "", "## Limitations", "- Findings are limited to user-provided information. No external target was scanned and no unknown sample was executed.",
    ].join("\n");
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `eager-security-report-${selectedCase?.code ?? "draft"}.md`; a.click(); URL.revokeObjectURL(url);
  };

  async function inspectFile(f: File) {
    setNotice(""); setFile(null);
    if (f.size > 25 * 1024 * 1024) {
      setNotice("This local-first analyzer supports files up to 25 MB. Use a smaller, sanitized export.");
      return;
    }
    try {
      const bytes = await f.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      const textual = f.size <= 5_000_000 && (/text|json|xml|csv|javascript|x-www-form-urlencoded/i.test(f.type) || /\.(log|txt|csv|json|xml|evtx\.txt|pcap\.txt|md|yaml|yml|conf|ini)$/i.test(f.name));
      const content = textual ? (await f.text()).slice(0, 500_000) : "";
      const result = { name: f.name, size: f.size, type: f.type || "unknown", sha256: hash, text: content, source: "USER-PROVIDED INFORMATION" };
      setFile(result);
      if (selectedCase) await addAudit.mutateAsync({ case_id: selectedCase.id, actor, action: `Evidence indexed locally: ${f.name}; size=${f.size}; SHA-256=${hash}; contents remain in browser; source=USER-PROVIDED INFORMATION` });
      setNotice("SHA-256 calculated locally. File contents were not uploaded or executed.");
    } catch {
      setNotice("Could not read this file in the browser. Try a smaller supported file.");
    }
  }

  async function saveFinding() {
    if (!selectedCase || !finding.title.trim() || !finding.details.trim()) return;
    await addAudit.mutateAsync({ case_id: selectedCase.id, actor, action: `OSINT finding [${finding.confidence}]: ${finding.title}; source=${finding.source || "not specified"}; URL=${finding.url || "not supplied"}; details=${finding.details}; provenance=USER-PROVIDED INFORMATION` });
    setFinding({ title: "", source: "", url: "", details: "", confidence: "Unverified" });
    setNotice("Finding added to the case audit trail as user-provided information. Verify it independently before treating it as fact.");
  }

  const extracted = useMemo(() => {
    if (!file?.text) return [];
    const patterns = [
      ["IPv4", /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
      ["Domain", /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|edu|gov|io|co|sl|uk|info|dev|app|xyz)\b/gi],
      ["SHA-256-like", /\b[a-f0-9]{64}\b/gi],
      ["Email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ] as const;
    return patterns.flatMap(([kind, pattern]) => Array.from(new Set(file.text.match(pattern) ?? [])).map((value) => ({ kind, value })));
  }, [file]);

  return (
    <>
      <PageTitle code="SEC-00 // SECURITY OPERATIONS" title="Cybersecurity & Intelligence Command Center">
        <div className="flex gap-2">
          <button className={learning ? btn : btnGhost} onClick={() => setLearning(true)}>Learning Mode</button>
          <button className={!learning ? btn : btnGhost} onClick={() => setLearning(false)}>Professional</button>
        </div>
      </PageTitle>
      <div className="border border-warning/40 bg-warning/5 rounded-md p-3 mb-4 text-sm">
        <strong>Authorized use only.</strong> Analyze systems and artifacts only when you have permission. This workspace does not perform live scans, fetch OSINT targets, or execute samples. External-system actions require a separate, explicit authorization workflow.
      </div>
      <div className="grid md:grid-cols-[220px_1fr] xl:grid-cols-[220px_minmax(0,1fr)_270px] gap-4">
        <Panel title="Workspace">
          <div className="space-y-1">
            {sections.map((s) => <button key={s} onClick={() => setSection(s)} className={`block w-full text-left rounded-sm px-3 py-2 text-sm ${section === s ? "bg-accent text-accent-foreground border-l-2 border-primary" : "text-muted-foreground hover:bg-secondary"}`}>{s}</button>)}
          </div>
          <div className="border-t mt-3 pt-3">
            <label className="label-mono">Active case</label>
            <select className={input + " mt-1"} value={selectedCase?.id ?? ""} onChange={(e) => setCaseId(e.target.value)}>
              {cases.length === 0 && <option value="">No cases</option>}
              {cases.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
            <Link to="/cases" className="block text-xs text-primary mt-2 hover:underline">Manage cases →</Link>
          </div>
        </Panel>

        <div className="space-y-4 min-w-0">
          {section === "Overview" && <>
            <Panel title="Operational overview" action={<span className="font-mono text-xs text-success">CASE-AWARE</span>}>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  ["Active cases", cases.filter((c) => c.status !== "Closed").length, "REAL DATA · YOUR CASES"],
                  ["Case audit events", audit.length, "REAL DATA · AUDIT LOG"],
                  ["Evidence in this session", file ? 1 : 0, "USER-PROVIDED INFORMATION"],
                  ["Indexed indicators", extracted.length, "LOCAL FILE ANALYSIS"],
                ].map(([label, value, note]) => <div key={String(label)} className="border rounded-sm p-3"><div className="label-mono">{label}</div><div className="text-2xl font-mono text-primary mt-2">{value}</div><div className="text-[10px] text-muted-foreground mt-1">{note}</div></div>)}
              </div>
            </Panel>
            <Panel title="Investigation launchpad">
              <div className="grid sm:grid-cols-2 gap-2">
                {(["Evidence & DFIR", "OSINT", "Network Analysis", "Malware Triage", "Incident Response", "Threat Intel", "ATT&CK", "Hunting", "Reports", "Security Labs", "Credential Safety"] as Section[]).map((s) => <button key={s} className={btnGhost + " justify-between"} onClick={() => setSection(s)}>{s}<span>→</span></button>)}
              </div>
            </Panel>
            <Panel title="Case activity">
              {audit.length ? <ol className="border-l ml-1">{audit.slice(0, 8).map((a) => <li key={a.id} className="pl-4 pb-3 relative text-sm"><span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary"/><div className="font-mono text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {a.actor}</div><div className="break-words">{a.action}</div></li>)}</ol> : <Empty>{isLoading ? "Loading cases…" : "No case activity yet. Create an authorized case and record your first finding."}</Empty>}
            </Panel>
          </>}
          {section === "Evidence & DFIR" && <>
            <Panel title="Evidence intake · local-first">
              <p className="text-sm text-muted-foreground mb-3">Choose a user-provided artifact to calculate its SHA-256 hash and inspect safe text formats. The file stays in this browser session; it is not uploaded or executed.</p>
              <input type="file" className={input} onChange={(e) => { const f = e.target.files?.[0]; if (f) void inspectFile(f); }} />
              {notice && <p className="text-xs mt-3 text-primary">{notice}</p>}
              {file && <div className="mt-4 border rounded-sm p-3 space-y-2 text-sm break-words"><div><span className="label-mono">Filename</span><div>{file.name}</div></div><div><span className="label-mono">Size / type</span><div>{file.size.toLocaleString()} bytes · {file.type}</div></div><div><span className="label-mono">SHA-256</span><code className="block text-xs break-all mt-1">{file.sha256}</code></div><div className="text-xs text-muted-foreground">{provenance.user}</div></div>}
            </Panel>
            <Panel title="Artifact triage">
              {!file ? <Empty>Select an artifact to see available safe metadata.</Empty> : <>
                <div className="text-sm mb-2">Text extraction: {file.text ? "available" : "not performed for this file type"} · no dynamic execution</div>
                {file.text && <><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words bg-muted p-3 text-xs">{file.text.slice(0, 12000)}</pre><div className="font-mono text-xs mt-3 mb-2">EXTRACTED CANDIDATES · UNVERIFIED</div><ul className="space-y-1">{extracted.slice(0, 100).map((i, n) => <li key={n} className="font-mono text-xs break-all"><span className="text-info">{i.kind}</span> · {i.value}</li>)}</ul></>}
              </>}
            </Panel>
          </>}
          {section === "OSINT" && <Panel title="Source-backed OSINT notebook">
            <p className="text-sm text-muted-foreground mb-3">Record information from public sources you have already reviewed. No target is queried automatically; cite source URLs and keep uncertainty visible.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="label-mono">Finding title</span><input className={input + " mt-1"} value={finding.title} onChange={(e) => setFinding({ ...finding, title: e.target.value })} /></label>
              <label><span className="label-mono">Source / publisher</span><input className={input + " mt-1"} value={finding.source} onChange={(e) => setFinding({ ...finding, source: e.target.value })} /></label>
              <label className="sm:col-span-2"><span className="label-mono">Source URL or reference</span><input className={input + " mt-1"} value={finding.url} onChange={(e) => setFinding({ ...finding, url: e.target.value })} placeholder="https://… or publication reference" /></label>
              <label><span className="label-mono">Confidence</span><select className={input + " mt-1"} value={finding.confidence} onChange={(e) => setFinding({ ...finding, confidence: e.target.value })}>{["Confirmed", "Highly likely", "Likely", "Possible", "Unverified", "Disputed"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="label-mono">Observation / extracted information</span><textarea className={input + " mt-1 min-h-24"} value={finding.details} onChange={(e) => setFinding({ ...finding, details: e.target.value })} /></label>
            </div>
            <button className={btn + " mt-3"} disabled={!canAnalyze || !finding.title.trim() || !finding.details.trim() || addAudit.isPending} onClick={() => void saveFinding()}>Record finding in case audit</button>
          </Panel>}
          {section === "Network Analysis" && <Panel title="Network & log triage">
            <p className="text-sm text-muted-foreground mb-3">Load a text export of firewall, DNS, proxy, authentication or NetFlow records in Evidence & DFIR. Candidate IPs/domains are extracted locally and remain unverified until correlated with source logs.</p>
            {file?.text ? <><div className="grid grid-cols-2 gap-3 mb-3"><div className="border p-3 rounded-sm"><div className="label-mono">Candidate indicators</div><div className="text-2xl font-mono text-primary">{extracted.length}</div></div><div className="border p-3 rounded-sm"><div className="label-mono">Text size</div><div className="text-2xl font-mono text-primary">{file.text.length.toLocaleString()}</div></div></div><div className="space-y-1">{extracted.map((x, i) => <div key={i} className="border-b py-2 font-mono text-xs break-all">{x.kind} · {x.value} <span className="text-muted-foreground">· UNVERIFIED</span></div>)}</div><p className="text-xs text-muted-foreground mt-3">This is pattern extraction only, not packet decoding, reputation lookup or proof of malicious activity.</p></> : <Empty>First select a text-based log export in Evidence & DFIR.</Empty>}
          </Panel>}
          {section === "Malware Triage" && <Panel title="Static malware triage">
            <div className="border border-warning/40 bg-warning/5 rounded-sm p-3 text-sm mb-3">Never execute unknown samples on your computer. This workspace computes a hash and previews text only. PE/ELF parsing and sandbox behavior analysis are not currently configured.</div>
            {file ? <div className="space-y-2 text-sm"><div><span className="label-mono">Sample</span><div>{file.name}</div></div><div><span className="label-mono">SHA-256</span><code className="block break-all text-xs">{file.sha256}</code></div><div><span className="label-mono">Strings / candidates</span><div>{extracted.length} candidate strings/indicators extracted from readable text (not a verdict).</div></div><div className="text-xs text-muted-foreground">Provenance: {provenance.user}. No dynamic analysis was performed.</div></div> : <Empty>Select a sample under Evidence & DFIR for safe local hashing.</Empty>}
          </Panel>}
          {section === "Incident Response" && <Panel title="Incident response workflow">
            <div className="grid sm:grid-cols-2 gap-2">{["1 · Detection", "2 · Triage", "3 · Scope", "4 · Containment", "5 · Investigation", "6 · Eradication", "7 · Recovery", "8 · Lessons learned"].map((step) => <div key={step} className="border p-3 rounded-sm text-sm">{step}<div className="text-xs text-muted-foreground mt-1">Analyst review required · not automatically executed</div></div>)}</div>
            <p className="text-xs text-muted-foreground mt-3">Containment or other external-system changes require a separate reviewed plan and explicit confirmation. No actions are sent to external systems from this page.</p>
          </Panel>}
          {section === "Threat Intel" && <Panel title="Threat intelligence & ATT&CK">
            <p className="text-sm mb-3">Map evidence to a technique only when supported by observations. A technique being possible does not prove it occurred.</p>
            <div className="space-y-2">{[["T1566.002","Spearphishing Link","Requires supporting email/link evidence"],["T1078","Valid Accounts","Requires authentication/account evidence"],["T1059","Command and Scripting Interpreter","Requires command or process evidence"],["T1046","Network Service Discovery","Requires network/process observations"]].map(([id,name,req]) => <div key={id} className="border rounded-sm p-3 flex flex-wrap justify-between gap-2"><div><div className="font-mono text-xs text-primary">{id}</div><div className="text-sm">{name}</div></div><div className="text-xs text-muted-foreground max-w-xs">{req} · NOT ASSERTED</div></div>)}</div>
          </Panel>}
          {section === "ATT&CK" && <Panel title="MITRE ATT&CK mapping">
            <p className="text-sm text-muted-foreground mb-3">Use the case audit trail to document an observation, the source, confidence, and analyst rationale before assigning a technique. These are reference examples, not detected activity.</p>
            <Link to="/indicators" className={btnGhost}>Open indicator workspace →</Link>
          </Panel>}
          {section === "Hunting" && <Panel title="Threat hunting worksheet">
            <label className="block"><span className="label-mono">Hypothesis / question</span><textarea className={input + " mt-1 min-h-24"} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Example: Are there repeated failed logins followed by a success in the supplied authentication logs?" /></label>
            <p className="text-xs text-muted-foreground mt-2">Use provided logs only. Record the data source, query, timeframe, findings, limitations and confidence in your case notes. This worksheet does not query production systems.</p>
            <button className={btn + " mt-3"} disabled={!canAnalyze || !report.trim() || addAudit.isPending} onClick={() => void addAudit.mutateAsync({ case_id: selectedCase!.id, actor, action: `Threat-hunting hypothesis: ${report}; source=USER-PROVIDED INFORMATION; status=analyst worksheet, not executed` }).then(() => setNotice("Hypothesis saved to the case audit trail. No query was executed."))}>Save hypothesis to case</button>
          </Panel>}
          {section === "Reports" && <Panel title="Report generator">
            <label className="block"><span className="label-mono">Executive summary / analyst notes</span><textarea className={input + " mt-1 min-h-36"} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Scope, methodology, evidence, findings, confidence, risk, remediation and limitations…" /></label>
            <div className="flex flex-wrap gap-2 mt-3"><button className={btn} onClick={exportReport}>Export Markdown report</button><button className={btnGhost} disabled={!selectedCase || !report.trim() || addAudit.isPending} onClick={() => void addAudit.mutateAsync({ case_id: selectedCase!.id, actor, action: `Report draft updated; summary length=${report.length}; format=Markdown; provenance=USER-PROVIDED INFORMATION` }).then(() => setNotice("Report draft logged to the case audit trail."))}>Log report draft</button></div>
          </Panel>}
          {section === "Security Labs" && <Panel title="Controlled security labs">
            <div className="grid sm:grid-cols-2 gap-3">{[["Web security","Practice input validation, sessions and secure headers in a local training app."],["Network defense","Read sample logs and reason about segmentation and anomalous traffic."],["DFIR","Build a timeline from a supplied, sanitized incident dataset."],["Authentication","Use synthetic training accounts to review MFA and password policy."],["OSINT","Compare public sources and score claims by confidence."],["Threat hunting","Write a hypothesis and validate it against a known training dataset."]].map(([name,desc]) => <div key={name} className="border rounded-sm p-3"><div className="font-mono text-sm text-primary">{name}</div><p className="text-sm text-muted-foreground mt-1">{desc}</p><div className="text-[10px] mt-2">SIMULATED LAB PLAN · NOT RUNNING</div></div>)}</div>
          </Panel>}
          {section === "Credential Safety" && <Panel title="Credential security training">
            <div className="space-y-3 text-sm"><p>Use synthetic training credentials only. Never paste production passwords, API keys, session cookies, recovery codes or private tokens into the lab.</p><ul className="list-disc pl-5 space-y-1"><li>Enable multi-factor authentication and prefer passkeys where available.</li><li>Use unique passwords with a password manager.</li><li>Review authentication logs for unusual locations, devices and repeated failures.</li><li>Redact secrets before sharing logs. This page does not test passwords against live accounts or external services.</li></ul></div>
          </Panel>}
          {notice && <div className="border border-primary/30 rounded-sm p-3 text-sm">{notice}</div>}
        </div>

        <div className="space-y-4">
          <Panel title="Selected case">
            {selectedCase ? <div className="space-y-2 text-sm"><div className="font-mono text-primary">{selectedCase.code}</div><div className="font-semibold">{selectedCase.name}</div><div className="text-xs text-muted-foreground">{selectedCase.authorization_status}</div><div><span className="label-mono">Scope</span><p className="mt-1 break-words">{selectedCase.scope || "Not defined"}</p></div><div><span className="label-mono">Authorization ref</span><p className="mt-1 break-words">{selectedCase.auth_ref || "Not provided"}</p></div><div className="text-xs text-muted-foreground">{canAnalyze ? "Scope fields present; confirm authority and permitted assets before each real-world action." : "Add scope and authorization details before analyzing artifacts."}</div></div> : <Empty>Create a case first.</Empty>}
            <Link to="/cases" className="block text-xs text-primary mt-3">Review authorization →</Link>
          </Panel>
          <Panel title="Agent team">
            <p className="text-sm text-muted-foreground">Delegate interpretation and report drafting to configured agents. Review outputs and evidence before relying on them.</p>
            <Link to="/agents" className={btnGhost + " mt-3"}>Open agent team →</Link>
          </Panel>
          <Panel title="Activity log" action={<span className="label-mono">{audit.length} events</span>}>
            <input className={input + " mb-2"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter audit events…" />
            <div className="max-h-64 overflow-auto space-y-2">{filteredAudit.slice(0, 20).map((a) => <div key={a.id} className="border-b pb-2"><div className="font-mono text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div><p className="text-xs break-words mt-1">{a.action}</p></div>)}{filteredAudit.length === 0 && <p className="text-xs text-muted-foreground">No matching audit events.</p>}</div>
          </Panel>
          {learning && <Panel title="Learning mode">
            <div className="text-sm space-y-2"><p><strong>1. Establish scope.</strong> Confirm the authorization basis, allowed assets and time window.</p><p><strong>2. Preserve evidence.</strong> Record source, acquisition context, timestamps and hashes.</p><p><strong>3. Separate facts from hypotheses.</strong> Tag source provenance and confidence.</p><p><strong>4. Verify before reporting.</strong> Correlate independent sources and state limitations.</p></div>
          </Panel>}
        </div>
      </div>
    </>
  );
}
