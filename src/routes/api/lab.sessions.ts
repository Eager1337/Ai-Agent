import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/lab/sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Lab hosting is not configured on the server." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Sign in to start a lab session." }, { status: 401 });
        let payload: { mode?: unknown };
        try { payload = await request.json() as { mode?: unknown }; }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const mode = payload.mode === "linux-desktop" || payload.mode === "virtual-machine" ? payload.mode : null;
        if (!mode) return Response.json({ error: "Choose a supported lab mode." }, { status: 400 });

        const base = process.env["KASM_URL"];
        const apiKey = process.env["KASM_API_KEY"];
        const apiSecret = process.env["KASM_API_KEY_SECRET"];
        const imageId = mode === "linux-desktop" ? process.env["KASM_LINUX_IMAGE_ID"] : process.env["KASM_VM_IMAGE_ID"];
        if (!base || !apiKey || !apiSecret || !imageId) {
          return Response.json({ error: mode === "linux-desktop" ? "Browser Linux desktop hosting is not configured yet." : "Virtual-machine hosting is not configured yet." }, { status: 503 });
        }
        let origin: URL;
        try { origin = new URL(base); }
        catch { return Response.json({ error: "KASM_URL is invalid." }, { status: 503 }); }
        if (origin.protocol !== "https:") return Response.json({ error: "KASM_URL must use HTTPS." }, { status: 503 });

        const active = await auth.db.from("cyber_lab_sessions").select("id").eq("user_id", auth.userId).eq("status", "running").gt("expires_at", new Date().toISOString());
        if (active.error) return Response.json({ error: "Could not check existing lab sessions." }, { status: 503 });
        if ((active.data ?? []).length >= 2) return Response.json({ error: "You already have two active lab sessions. Stop one before starting another." }, { status: 429 });

        try {
          const response = await fetch(new URL("/api/public/request_kasm", origin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, api_key_secret: apiSecret, image_id: imageId, enable_sharing: false, persistent_profile_mode: "Disabled", client_timezone: "UTC" }),
            signal: AbortSignal.timeout(15000),
          });
          const body = await response.json() as Record<string, unknown>;
          if (!response.ok || typeof body["kasm_id"] !== "string" || typeof body["user_id"] !== "string") {
            console.error("Kasm session request failed", response.status);
            return Response.json({ error: "The lab provider could not create a session. Check Kasm image configuration and API permissions." }, { status: 502 });
          }
          const inserted = await auth.db.from("cyber_lab_sessions").insert({
            user_id: auth.userId,
            provider_session_id: body["kasm_id"],
            provider_user_id: body["user_id"],
            session_mode: mode,
            status: "starting",
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }).select("id").single();
          if (inserted.error || !inserted.data) {
            console.error("Lab session tracking insert failed");
            return Response.json({ error: "The lab started but its session could not be safely registered. Contact the administrator to clean up the orphaned session." }, { status: 500 });
          }
          return Response.json({ sessionId: inserted.data.id, status: "starting", mode, expiresInMinutes: 60 }, { status: 202 });
        } catch (error) {
          console.error("Lab session request failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ error: "Could not reach the lab provider." }, { status: 502 });
        }
      },
    },
  },
});
