import { createFileRoute } from "@tanstack/react-router";
import { SAFETY, streamAI, userClient } from "@/lib/ai.server";

const TASKS: Record<string, string> = {
  osint: `Act as an OSINT / threat-intelligence analyst. For the case's indicators produce:
## Indicator assessment
Table: indicator, type, likely role, risk (High/Med/Low), confidence.
## Relationships & clusters
Which indicators likely belong together and why.
## Passive collection plan
Prioritized numbered list of passive, public-source pivots for each indicator (WHOIS, passive DNS, certificate transparency, reputation services), staying inside the authorized scope.
## Gaps & next decisions`,
  forensics: `Act as a digital forensics analyst. For the case's evidence items produce:
## Evidence inventory
Table: item, category (disk/memory/log/document/browser/email/executable/other), size, SHA-256 (short), notes.
## Artifact timeline
Chronological list using the modified/collected times given.
## Anomalies & correlations
Including links to the case indicators.
## Recommended examination steps
Prioritized numbered list with tools/techniques (e.g. Volatility, Plaso, Autopsy) and expected findings.
## Chain-of-custody notes`,
  plan: `Act as a senior SOC/DFIR lead. Produce:
## Evidence summary
What the evidence and indicators suggest, with confidence levels.
## Prioritized investigation steps
Numbered, P1 first. For each: action, rationale, data sources, expected outcome.
## Indicator assessment
Table of each indicator: type, likely role, priority.
## Containment & next decisions`,
};

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = userClient(request);
        if (!u) return new Response("Unauthorized", { status: 401 });
        const { data: auth } = await u.sb.auth.getUser(u.token);
        if (!auth.user) return new Response("Unauthorized", { status: 401 });
        if (auth.user.email?.toLowerCase() !== "ebeaver091@gmail.com" && auth.user.app_metadata?.["paid_access"] !== true) {
          return new Response("Paid access is required.", { status: 403 });
        }
        let body: { caseId?: string; mode?: string; extra?: string };
        try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const task = TASKS[body.mode ?? ""];
        if (!body.caseId || !task) return new Response("A case and analysis type are required.", { status: 400 });

        const { data: c } = await u.sb.from("cases").select("*").eq("id", body.caseId).maybeSingle();
        if (!c) return new Response("Case not found or access denied.", { status: 404 });
        const { data: items = [] } = await u.sb.from("case_items").select("*").eq("case_id", c.id).order("created_at").limit(300);
        const iocs = (items ?? []).filter((i) => i.kind === "indicator").map((i) => `- [${i.item_type}] ${i.value}${i.notes ? ` — ${i.notes}` : ""}`).join("\n") || "none";
        const ev = (items ?? []).filter((i) => i.kind === "evidence").map((i) =>
          `- ${i.value} | type ${i.item_type} | ${i.mime ?? "?"} | ${i.size_bytes ?? "?"} bytes | modified ${i.modified_at ?? "?"} | collected ${i.created_at} | sha256 ${i.sha256 ?? "n/a"}${i.notes ? ` | ${i.notes}` : ""}`).join("\n") || "none";

        if (body.mode !== "plan" && !(items ?? []).some((i) => i.kind === (body.mode === "osint" ? "indicator" : "evidence"))) {
          return new Response(body.mode === "osint" ? "Add at least one indicator first." : "Add at least one evidence item first.", { status: 400 });
        }

        await u.sb.from("case_audit").insert({ case_id: c.id, actor: auth.user.email ?? "analyst", action: `AI ${body.mode} analysis requested (no external system contacted)` });

        const prompt = `CASE ${c.code} — ${c.name}
Organization: ${c.organization}
Authorization: ${c.authorization_status} (ref ${c.auth_ref || "n/a"})
Scope: ${c.scope}
Targets: ${c.targets}
Window: ${c.start_date ?? "?"} → ${c.end_date ?? "?"}
Description: ${c.description}

INDICATORS:
${iocs}

EVIDENCE:
${ev}
${body.extra?.trim() ? `\nANALYST NOTES:\n${body.extra.slice(0, 8000)}` : ""}

${task}`;
        try {
          return streamAI(request, `You support authorized investigations in the Eager AI Command Center. ${SAFETY}`, [{ role: "user", content: prompt.slice(0, 60000) }]);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "AI error", { status: 500 });
        }
      },
    },
  },
});
