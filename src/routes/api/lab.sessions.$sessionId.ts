import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/lab/sessions/$sessionId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Lab hosting is not configured on the server." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const sessionId = params.sessionId;
        const result = await auth.db.from("cyber_lab_sessions").select("id,provider_session_id,provider_user_id,session_mode,status,expires_at").eq("id", sessionId).eq("user_id", auth.userId).maybeSingle();
        if (result.error) return Response.json({ error: "Could not retrieve lab session." }, { status: 503 });
        if (!result.data) return Response.json({ error: "Lab session not found." }, { status: 404 });
        const session = result.data as { id: string; provider_session_id: string; provider_user_id: string; session_mode: string; status: string; expires_at: string };
        if (Date.parse(session.expires_at) < Date.now()) {
          await auth.db.from("cyber_lab_sessions").update({ status: "expired" }).eq("id", session.id).eq("user_id", auth.userId);
          return Response.json({ status: "expired", message: "This lab session has expired." }, { status: 410 });
        }
        const base = process.env["KASM_URL"];
        const apiKey = process.env["KASM_API_KEY"];
        const apiSecret = process.env["KASM_API_KEY_SECRET"];
        if (!base || !apiKey || !apiSecret) return Response.json({ error: "Lab hosting is not configured." }, { status: 503 });
        try {
          const origin = new URL(base);
          if (origin.protocol !== "https:") return Response.json({ error: "KASM_URL must use HTTPS." }, { status: 503 });
          const response = await fetch(new URL("/api/public/get_kasm_status", origin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, api_key_secret: apiSecret, user_id: session.provider_user_id, kasm_id: session.provider_session_id }),
            signal: AbortSignal.timeout(12000),
          });
          const body = await response.json() as Record<string, unknown>;
          if (!response.ok) return Response.json({ error: "The lab provider could not verify session status." }, { status: 502 });
          const kasm = body["kasm"] && typeof body["kasm"] === "object" ? body["kasm"] as Record<string, unknown> : null;
          const operational = String(kasm?.["operational_status"] ?? body["operational_status"] ?? "starting").toLowerCase();
          if (operational === "running" && typeof body["kasm_url"] === "string") {
            await auth.db.from("cyber_lab_sessions").update({ status: "running" }).eq("id", session.id).eq("user_id", auth.userId);
            return Response.json({ status: "running", mode: session.session_mode, launchUrl: new URL(body["kasm_url"], origin).toString(), expiresAt: session.expires_at });
          }
          if (["stopped", "terminated", "deleted", "error"].includes(operational)) {
            await auth.db.from("cyber_lab_sessions").update({ status: "stopped" }).eq("id", session.id).eq("user_id", auth.userId);
            return Response.json({ status: "stopped", message: "The lab provider stopped this session." }, { status: 410 });
          }
          return Response.json({ status: "starting", progress: typeof body["operational_progress"] === "number" ? body["operational_progress"] : null, message: typeof body["operational_message"] === "string" ? body["operational_message"] : "Waiting for isolated workspace to start." }, { status: 202 });
        } catch (error) {
          console.error("Lab status check failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ error: "Could not reach the lab provider to check status." }, { status: 502 });
        }
      },
    },
  },
});
