import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { MODULES } from "@/lib/soc-data";
import { useCases } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/m/$module")({
  loader: ({ params }) => {
    const mod = MODULES.find((m) => m.slug === params.module);
    if (!mod) throw notFound();
    return { mod: { ...mod } };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.mod.name} — Eager AI Command Center` : "Not found";
    const d = loaderData?.mod.desc ?? "Module not found";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  notFoundComponent: () => <div className="p-6">Module not found. <Link to="/" className="text-primary">Back</Link></div>,
  component: ModulePage,
});

type ToolKind = "investigations" | "osint" | "forensics" | "incident-response" | "malware" | "threat-intel" | "network" | "vuln-research" | "labs" | "evidence" | "reports" | "tools";

const descriptions: Record<ToolKind, { label: string; placeholder: string; help: string }> = {
  investigations: { label: "Investigation question / lead", placeholder: "Describe the lead, claim, or hypothesis…", help: "Create a structured lead record with questions, evidence needs, and next steps." },
  osint: { label: "Public URL or domain", placeholder: "https://example.com", help: "Normalize a public URL and produce a collection checklist. No target is contacted." },
  forensics: { label: "Artifact notes or file", placeholder: "Describe the artifact or choose a file to hash…", help: "Calculate a SHA-256 hash locally in your browser, or structure artifact notes." },
  "incident-response": { label: "Incident summary", placeholder: "What was detected, where, and when?", help: "Build a response checklist for triage, containment, evidence preservation, and recovery." },
  malware: { label: "Static triage notes", placeholder: "Paste strings, file metadata, or scan results…", help: "Organize supplied static observations. This does not execute or detonate samples." },
  "threat-intel": { label: "Indicator (domain, IP, URL, or hash)", placeholder: "Paste one indicator…", help: "Normalize an indicator and produce a review checklist. No external enrichment is implied." },
  network: { label: "Network log lines / CSV", placeholder: "timestamp,src_ip,dst_ip,port,protocol,bytes…", help: "Summarize supplied text/CSV network logs locally; this is not live capture or a full PCAP decoder." },
  "vuln-research": { label: "CVE ID or finding notes", placeholder: "CVE-2026-0000 or finding summary…", help: "Structure a scoped finding and remediation notes. No target is scanned." },
  labs: { label: "Exercise objective", placeholder: "e.g. inspect HTTP headers in a provided sample", help: "Create a safe lab exercise plan. Real VM launch is available only when a lab provider is configured." },
  evidence: { label: "Evidence description", placeholder: "Item, source, collector, and acquisition time…", help: "Create a chain-of-custody entry and calculate file hashes locally." },
  reports: { label: "Report brief", placeholder: "Audience, case, scope, findings, and recommendations…", help: "Generate a structured report draft from supplied notes; verify all facts before sharing." },
  tools: { label: "Text / encoded value", placeholder: "Paste text, Base64, URL, or hex…", help: "Use safe local encoders and decoders. Inputs remain in this browser session." },
};

function ModulePage() {
  const { mod } = Route.useLoaderData();
  const { data: cases = [], isLoading: casesLoading, error: casesError } = useCases();
  const [textValue, setTextValue] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [checklist, setChecklist] = useState<string[]>([]);
  const idx = MODULES.findIndex((m) => m.slug === mod.slug) + 2;
  const kind = mod.slug as ToolKind;
  const spec = descriptions[kind];
  const activeCases = useMemo(() => cases.filter((c) => c.status.toLowerCase() !== "closed"), [cases]);

  async function runTool() {
    setBusy(true);
    setResult("");
    try {
      const value = textValue.trim();
      if (!value && !fileName) { setResult("Enter an input or choose a file first."); return; }
      let output = "";
      switch (kind) {
        case "osint": {
          let parsed: URL;
          try { parsed = new URL(value.includes("://") ? value : "https://" + value); }
          catch { setResult("That is not a valid public URL or domain."); return; }
          if (!["http:", "https:"].includes(parsed.protocol)) { setResult("Only HTTP and HTTPS URLs are accepted."); return; }
          output = [
            "PUBLIC-SOURCE COLLECTION PLAN",
            "Normalized URL: " + parsed.toString(),
            "Hostname: " + parsed.hostname,
            "Scheme: " + parsed.protocol.replace(":", ""),
            "Path: " + (parsed.pathname || "/"),
            "",
            "Next steps:",
            "1. Record the collection time and public source.",
            "2. Review the site's published legal/contact information.",
            "3. Save screenshots or source references with timestamps.",
            "4. Corroborate claims with an independent source.",
            "",
            "No network request was made by this tool.",
          ].join("\n");
          break;
        }
        case "forensics":
        case "evidence": {
          output = fileName
            ? `FILE SELECTED\nName: ${fileName}\nSize: ${fileSize.toLocaleString()} bytes\n\nChoose a file below to calculate SHA-256. File contents are read locally and are not uploaded.`
            : `EVIDENCE / ARTIFACT NOTE\n${value}\n\nHandling checklist:\n- Record source and acquisition time.\n- Preserve the original as read-only.\n- Calculate a cryptographic hash.\n- Work from a verified copy.\n- Record each transfer and handler.`;
          break;
        }
        case "incident-response":
          output = `INCIDENT RESPONSE CHECKLIST\n\nIncident: ${value}\n\n1. TRIAGE — verify alert, affected assets, severity, and scope.\n2. CONTAIN — follow the approved playbook; document each action.\n3. PRESERVE — retain logs, timestamps, and original evidence.\n4. INVESTIGATE — build a timeline and validate indicators.\n5. ERADICATE — remove confirmed cause after approval.\n6. RECOVER — restore from trusted state and monitor.\n7. REVIEW — record impact, decisions, owners, and lessons learned.\n\nDo not destroy evidence or isolate critical systems without authorization.`;
          break;
        case "malware":
          output = `STATIC TRIAGE SUMMARY\n\nInput notes:\n${value}\n\nReview: file type and size; SHA-256; digital signature; strings and imports; YARA/AV results; creation and modification timestamps; known-good comparison.\n\nDo not execute the sample on a normal workstation. This tool did not run or scan the sample.`;
          break;
        case "threat-intel": {
          const normalized = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
          output = `INDICATOR REVIEW\nOriginal: ${value}\nNormalized: ${normalized}\n\nRecord source and first-seen time. Check formatting, deduplicate, add confidence and expiry, correlate with case evidence, and corroborate against trusted intelligence before blocking.\n\nNo reputation lookup or external enrichment was performed.`;
          break;
        }
        case "network": {
          const lines = value.split(/\r?\n/).filter(Boolean);
          const headers = lines[0]?.split(/[;,\t]/).map(s => s.trim().toLowerCase()) ?? [];
          const protoIndex = headers.findIndex(h => ["protocol", "proto", "transport"].includes(h));
          const srcIndex = headers.findIndex(h => ["src_ip", "source", "source_ip", "src"].includes(h));
          const dstIndex = headers.findIndex(h => ["dst_ip", "destination", "destination_ip", "dst"].includes(h));
          const counts = new Map<string, number>();
          for (const line of lines.slice(1)) {
            const cols = line.split(/[;,\t]/).map(s => s.trim());
            const proto = protoIndex >= 0 ? cols[protoIndex] || "unknown" : "unparsed";
            counts.set(proto, (counts.get(proto) ?? 0) + 1);
          }
          output = `NETWORK LOG SUMMARY\nRows (excluding header): ${Math.max(0, lines.length - 1)}\nSource column: ${srcIndex >= 0 ? headers[srcIndex] : "not detected"}\nDestination column: ${dstIndex >= 0 ? headers[dstIndex] : "not detected"}\nProtocol counts:\n${[...counts.entries()].map(([k,v]) => `- ${k}: ${v}`).join("\n") || "- No rows parsed"}\n\nThis is a lightweight CSV/text summary, not packet capture or full PCAP analysis.`;
          break;
        }
        case "vuln-research": {
          const cve = value.match(/\bCVE-\d{4}-\d{4,}\b/i)?.[0]?.toUpperCase();
          output = `SCOPED FINDING WORKSHEET\nIdentifier: ${cve ?? "Not detected"}\nInput: ${value}\n\nDocument affected product/version, evidence, prerequisites, reproducible steps within approved scope, business impact, severity rationale, mitigations, patch status, and retest results.\n\nNo live scan or CVE database lookup was performed.`;
          break;
        }
        case "labs":
          output = `LAB EXERCISE PLAN\nObjective: ${value}\n\n1. Confirm written authorization and lab scope.\n2. Start a disposable isolated training workspace.\n3. Use only provided targets and test data.\n4. Capture commands and observations.\n5. Restore/reset the environment after the exercise.\n6. Write findings and remediation.\n\nReal desktops require Kasm server credentials, workspace image IDs, and database migration setup.`;
          break;
        case "reports":
        case "investigations":
          output = `WORKING DRAFT — VERIFY BEFORE USE\n\nTopic: ${value}\n\nSummary\n- Question / objective: ${value}\n- Known facts: [add sourced facts]\n- Hypotheses: [separate from verified facts]\n- Evidence reviewed: [list artifacts and source links]\n- Gaps and confidence: [document limitations]\n- Findings: [state supported conclusions]\n- Recommended next steps: [owner, priority, due date]\n\nKeep a source reference for every material factual claim.`;
          break;
        case "tools": {
          if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0) {
            try { output = "Base64 decode:\n" + atob(value); } catch { output = "Input looks like Base64 but could not be decoded."; }
          } else {
            output = "Input characters: " + value.length + "\nUTF-8 bytes: " + new TextEncoder().encode(value).length + "\nBase64: " + btoa(unescape(encodeURIComponent(value))) + "\nURL encoded: " + encodeURIComponent(value);
          }
          break;
        }
        default:
          output = "Add a scoped task and supporting evidence to begin.";
      }
      setResult(output);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Tool failed. Check the input and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function hashFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setBusy(true);
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      setResult(`SHA-256: ${hash}\nFile: ${file.name}\nBytes: ${file.size}\n\nThe file was hashed locally in this browser session; it was not uploaded.`);
    } catch {
      setResult("The browser could not hash this file. Try a secure HTTPS page or a smaller file.");
    } finally { setBusy(false); }
  }

  const steps = kind === "incident-response"
    ? ["Confirm scope and authorization", "Preserve logs and evidence", "Assess impact and affected assets", "Contain using the approved playbook", "Recover and monitor", "Document lessons learned"]
    : kind === "forensics" || kind === "evidence"
      ? ["Record collector and acquisition time", "Preserve the original", "Calculate SHA-256", "Record custody transfers", "Analyze a verified copy"]
      : kind === "osint"
        ? ["Define a lawful public-source question", "Record collection time and URL", "Capture source references", "Corroborate with an independent source", "Document uncertainty"]
        : ["Confirm authorization and case scope", "Collect source material", "Record observations and timestamps", "Separate facts from assumptions", "Review findings and remediation"];

  return (
    <>
      <PageTitle code={`SEC-${String(idx).padStart(2, "0")} // ${mod.name.toUpperCase()}`} title={mod.name} />
      <div className="grid xl:grid-cols-3 gap-4">
        <Panel title="Module brief" className="xl:col-span-2">
          <p className="text-sm">{mod.desc}</p>
          <p className="text-sm text-muted-foreground mt-2">Use this workbench to process supplied material, record findings, and prepare next steps. External scans, live packet capture, sample execution, and VM control are not simulated as real capabilities.</p>
          <div className="mt-5 border rounded-md p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{kind === "tools" ? "Local utility" : kind === "network" ? "Network log analyzer" : kind === "forensics" || kind === "evidence" ? "Artifact workbench" : `${mod.name} workbench`}</h2>
              <span className="label-mono">LOCAL PROCESSING</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{spec.help}</p>
            <label className="block text-sm mt-4">{spec.label}
              <textarea className={input + " mt-1 min-h-32 w-full"} value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={spec.placeholder} />
            </label>
            {(kind === "forensics" || kind === "evidence") && <label className="block text-sm mt-3">Choose a file to calculate SHA-256
              <input className={input + " mt-1"} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void hashFile(f); }} />
            </label>}
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className={btn} disabled={busy} onClick={() => void runTool()}>{busy ? "Working…" : "Run workbench"}</button>
              <button type="button" className={btnGhost} onClick={() => { setTextValue(""); setResult(""); setFileName(""); setFileSize(0); }}>Clear</button>
            </div>
            {result && <div className="mt-4">
              <div className="text-sm font-medium mb-2">Result</div>
              <pre className="whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs leading-relaxed">{result}</pre>
              <button type="button" className={btnGhost + " mt-2"} onClick={() => void navigator.clipboard?.writeText(result)}>Copy result</button>
            </div>}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Workflow checklist">
            <div className="space-y-3">
              {steps.map((step) => <label key={step} className="flex gap-2 items-start text-sm"><input type="checkbox" checked={checklist.includes(step)} onChange={(e) => setChecklist(old => e.target.checked ? [...old, step] : old.filter(s => s !== step))} className="mt-1" /><span>{step}</span></label>)}
            </div>
            <div className="text-xs text-muted-foreground mt-3">{checklist.length} of {steps.length} steps complete</div>
          </Panel>
          <Panel title="Attach to case">
            {casesLoading ? <p className="text-sm text-muted-foreground">Loading cases…</p> : casesError ? <p className="text-sm text-destructive">Cases could not be loaded. Check database access and retry.</p> : activeCases.length ? <ul className="space-y-2">{activeCases.map((c) => <li key={c.id}><Link to="/cases" className={btnGhost + " w-full justify-between gap-2"}><span className="truncate">{c.code} · {c.name}</span><span className="text-muted-foreground normal-case">{c.authorization_status}</span></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No open cases yet. Create a case to track evidence and findings.</p>}
            <Link to="/cases" className={btnGhost + " mt-3 w-full justify-center"}>Open case manager</Link>
          </Panel>
          <Panel title="Module links">
            <ul className="space-y-2">
              {MODULES.filter((m) => m.slug !== mod.slug).slice(0, 5).map((m) => <li key={m.slug}><Link to="/m/$module" params={{ module: m.slug }} className="text-sm text-primary hover:underline">{m.name} →</Link></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
