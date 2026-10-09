import { createFileRoute } from "@tanstack/react-router";
import { SAFETY, streamAI, userClient } from "@/lib/ai.server";

export const Route = createFileRoute("/api/plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = userClient(request);
        if (!u) return new Response("Unauthorized", { status: 401 });
        const { data: auth } = await u.sb.auth.getUser(u.token);
        if (!auth.user) return new Response("Unauthorized", { status: 401 });
        if (auth.user.email?.toLowerCase() !== "ebeaver091@gmail.com" && auth.user.app_metadata?.paid_access !== true) {
          return new Response("Paid access is required. Complete payment and contact the workspace owner for activation.", { status: 403 });
        }
        const body = (await request.json()) as { caseDetails?: string; indicators?: string };
        if (!body.caseDetails?.trim()) return new Response("Case details are required", { status: 400 });
        const prompt = `CASE DETAILS:\n${body.caseDetails.slice(0, 8000)}\n\nTHREAT INDICATORS:\n${(body.indicators ?? "none provided").slice(0, 8000)}\n\nProduce:\n## Evidence summary\nConcise summary of what the evidence and indicators suggest, with confidence levels.\n## Prioritized investigation steps\nA numbered list ordered by priority (P1 first). For each: action, rationale, data sources to check, and expected outcome.\n## Indicator assessment\nTable of each indicator: type, likely role, priority.\n## Containment & next decisions\nShort list.`;
        try {
          return streamAI(request, `You are a senior SOC/DFIR lead creating investigation plans. ${SAFETY}`, [{ role: "user", content: prompt }]);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "AI error", { status: 500 });
        }
      },
    },
  },
});
