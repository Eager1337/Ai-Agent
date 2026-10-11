import { createFileRoute } from "@tanstack/react-router";
import { SAFETY, streamAI } from "@/lib/ai.server";

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

/**
 * External agent invocation. Auth: `Authorization: Bearer eak_...` personal key.
 * A key can only reach the agents it was scoped to; it cannot read cases, notes or other data.
 */
export const Route = createFileRoute("/api/public/agents/invoke")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!key?.startsWith("eak_") || key.length < 30) return json(401, "Missing or invalid API key.");
        let body: { agent_id?: unknown; message?: unknown };
        try { body = await request.json(); } catch { return json(400, "Invalid JSON body."); }
        const agentId = typeof body.agent_id === "string" ? body.agent_id : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (!agentId || !message) return json(400, "agent_id and message are required.");
        if (message.length > 20000) return json(413, "message must be 20,000 characters or fewer.");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const hash = await sha256Hex(key);
        const { data: k } = await supabaseAdmin.from("api_keys").select("id, user_id, agent_ids, revoked_at").eq("key_hash", hash).maybeSingle();
        if (!k || k.revoked_at) return json(401, "Missing or invalid API key.");
        if (!k.agent_ids.includes(agentId)) return json(403, "This key is not allowed to use that agent.");

        const { data: owner } = await supabaseAdmin.auth.admin.getUserById(k.user_id);
        const u = owner?.user;
        if (!u || (u.email?.toLowerCase() !== "ebeaver091@gmail.com" && u.app_metadata?.["paid_access"] !== true)) {
          return json(403, "The key owner's account does not have paid access.");
        }
        const { data: agent } = await supabaseAdmin.from("agents").select("name, role, instructions").eq("id", agentId).eq("user_id", k.user_id).maybeSingle();
        if (!agent) return json(404, "Agent not found.");

        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
        const system = `You are ${agent.name}, a specialist ${agent.role} in the Eager AI workspace, answering a request from an external tool. Be precise, structured and actionable.
${agent.instructions ? `Operator instructions: ${agent.instructions}\n` : ""}${SAFETY}`;
        try {
          return streamAI(request, system, [{ role: "user", content: message }]);
        } catch {
          return json(500, "AI is not configured.");
        }
      },
    },
  },
});
