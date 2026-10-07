export type Severity = "critical" | "high" | "medium" | "low";
export type AuthState =
  | "Training Lab" | "University Assignment" | "CTF" | "Authorized Security Assessment"
  | "Incident Response" | "Research" | "Other Approved Activity";

export const AUTH_STATES: AuthState[] = [
  "Training Lab", "University Assignment", "CTF", "Authorized Security Assessment",
  "Incident Response", "Research", "Other Approved Activity",
];

export interface AuditEntry { at: string; actor: string; action: string }
export interface Case {
  id: string; name: string; description: string; organization: string;
  authorization: AuthState; authRef: string; scope: string; targets: string;
  start: string; end: string; investigator: string; team: string;
  classification: "TLP:CLEAR" | "TLP:GREEN" | "TLP:AMBER" | "TLP:RED";
  status: "Open" | "Active" | "Review" | "Closed"; audit: AuditEntry[];
}

export const MODULES = [
  { slug: "investigations", name: "Investigations", desc: "Structured investigation workspaces linked to cases, hypotheses and findings." },
  { slug: "osint", name: "OSINT", desc: "Open-source collection for authorized subjects: domains, public records, social footprint." },
  { slug: "forensics", name: "Digital Forensics", desc: "Evidence indexing, hashing, metadata extraction and artifact timelines." },
  { slug: "incident-response", name: "Incident Response", desc: "Playbooks, containment checklists and response coordination." },
  { slug: "malware", name: "Malware Analysis", desc: "Static triage of samples in isolated labs: strings, imports, YARA matches." },
  { slug: "threat-intel", name: "Threat Intelligence", desc: "Actors, campaigns, TTP mapping to MITRE ATT&CK." },
  { slug: "network", name: "Network Analysis", desc: "PCAP summaries, flow analysis and anomaly detection." },
  { slug: "vuln-research", name: "Vulnerability Research", desc: "CVE tracking, scoped assessment findings and remediation." },
  { slug: "labs", name: "Security Labs", desc: "Cyber ranges, CTF environments and training sandboxes." },
  { slug: "evidence", name: "Evidence", desc: "Chain-of-custody evidence locker with hashes and handling log." },
  { slug: "reports", name: "Reports", desc: "Executive, technical and forensic reports generated from case data." },
  { slug: "tools", name: "Tools", desc: "Approved tool catalog: hash calculators, decoders, parsers." },
] as const;

export const seedCases: Case[] = [
  {
    id: "CASE-2026-0142", name: "Phishing campaign — finance dept.", description: "Credential-harvest emails targeting AP staff.",
    organization: "Northbridge University", authorization: "Incident Response", authRef: "IR-AUTH-7731",
    scope: "Mail gateway logs, 3 endpoints", targets: "mx1.northbridge.edu, WS-FIN-04..06", start: "2026-10-02", end: "2026-10-20",
    investigator: "A. Kamara", team: "SOC Analyst, Forensics Analyst", classification: "TLP:AMBER", status: "Active",
    audit: [{ at: "2026-10-02 09:14", actor: "A. Kamara", action: "Case opened; authorization IR-AUTH-7731 confirmed" }],
  },
  {
    id: "CASE-2026-0139", name: "CS-447 memory forensics lab", description: "Coursework: Volatility analysis of provided memory image.",
    organization: "CS-447", authorization: "University Assignment", authRef: "CS447-HW4", scope: "Provided .raw image only",
    targets: "lab-image-04.raw", start: "2026-09-28", end: "2026-10-12", investigator: "A. Kamara", team: "Forensics Analyst",
    classification: "TLP:CLEAR", status: "Review", audit: [{ at: "2026-09-28 18:02", actor: "A. Kamara", action: "Lab case created" }],
  },
  {
    id: "CASE-2026-0131", name: "Regional CTF — web track", description: "Jeopardy CTF web challenges.",
    organization: "WACTF 2026", authorization: "CTF", authRef: "WACTF-TEAM-19", scope: "*.ctf.wactf.org",
    targets: "Challenge hosts", start: "2026-09-20", end: "2026-09-22", investigator: "A. Kamara", team: "Vulnerability Researcher",
    classification: "TLP:GREEN", status: "Closed", audit: [{ at: "2026-09-20 08:00", actor: "A. Kamara", action: "CTF scope registered" }],
  },
];

export const alerts: { t: string; sev: Severity; src: string; msg: string }[] = [
  { t: "19:58:12", sev: "critical", src: "EDR", msg: "Suspicious PowerShell encoded command on WS-FIN-05" },
  { t: "19:51:40", sev: "high", src: "Mail GW", msg: "14 messages matched phishing IOC set PH-0142" },
  { t: "19:33:07", sev: "medium", src: "IdP", msg: "Impossible travel: j.conteh (Freetown → Frankfurt)" },
  { t: "19:12:55", sev: "low", src: "IDS", msg: "Port scan from lab subnet 10.40.2.0/24 (expected — Lab 3)" },
  { t: "18:47:21", sev: "high", src: "DNS", msg: "Resolution of newly registered domain northbr1dge-pay.com" },
];

export const indicators: { type: string; value: string; sev: Severity; caseId: string; first: string }[] = [
  { type: "domain", value: "northbr1dge-pay.com", sev: "high", caseId: "CASE-2026-0142", first: "2026-10-02" },
  { type: "ipv4", value: "185.199.44.17", sev: "high", caseId: "CASE-2026-0142", first: "2026-10-02" },
  { type: "sha256", value: "9f2c…a71e4b", sev: "critical", caseId: "CASE-2026-0142", first: "2026-10-03" },
  { type: "email", value: "ap-billing@northbr1dge-pay.com", sev: "medium", caseId: "CASE-2026-0142", first: "2026-10-02" },
  { type: "url", value: "hxxps://northbr1dge-pay[.]com/sso", sev: "high", caseId: "CASE-2026-0142", first: "2026-10-02" },
];

export const timeline: { t: string; caseId: string; text: string }[] = [
  { t: "Oct 07 19:58", caseId: "CASE-2026-0142", text: "EDR alert on WS-FIN-05 linked to case" },
  { t: "Oct 07 14:20", caseId: "CASE-2026-0142", text: "Forensics Analyst hashed 3 email attachments" },
  { t: "Oct 06 10:05", caseId: "CASE-2026-0139", text: "Report draft submitted for review" },
  { t: "Oct 03 16:41", caseId: "CASE-2026-0142", text: "Malicious payload identified — SHA256 9f2c…" },
  { t: "Oct 02 09:14", caseId: "CASE-2026-0142", text: "Case opened under IR-AUTH-7731" },
];

export interface Agent { id: string; name: string; role: string; focus: string[]; status: "active" | "idle"; lastTask: string }
export const seedAgents: Agent[] = [
  { id: "a1", name: "SENTRY", role: "SOC Analyst", focus: ["Alerts", "Logs", "Auth events", "Network activity"], status: "active", lastTask: "Triaging 14 mail gateway hits" },
  { id: "a2", name: "LEDGER", role: "Digital Forensics Analyst", focus: ["Hashing", "Metadata", "Timelines", "Correlation"], status: "active", lastTask: "Building artifact timeline for WS-FIN-05" },
  { id: "a3", name: "VECTOR", role: "Malware Analysis Agent", focus: ["Static triage", "Strings", "YARA", "Behavior notes"], status: "idle", lastTask: "Static report on 9f2c…a71e4b" },
  { id: "a4", name: "ATLAS", role: "Threat Intelligence Analyst", focus: ["Actors", "Campaigns", "ATT&CK mapping"], status: "idle", lastTask: "Mapped campaign to T1566.002" },
];

export const AGENT_ROLES = [
  "SOC Analyst", "Digital Forensics Analyst", "Malware Analysis Agent", "Threat Intelligence Analyst",
  "OSINT Investigator", "Incident Responder", "Network Analyst", "Vulnerability Researcher", "Report Writer",
];

export const labs = [
  { name: "Lab 3 — Windows AD range", status: "running" },
  { name: "Malware sandbox (isolated)", status: "running" },
  { name: "CTF web practice", status: "stopped" },
];

export const sevClass: Record<Severity, string> = {
  critical: "text-destructive border-destructive/50 bg-destructive/10",
  high: "text-warning border-warning/50 bg-warning/10",
  medium: "text-info border-info/50 bg-info/10",
  low: "text-muted-foreground border-border bg-muted",
};
