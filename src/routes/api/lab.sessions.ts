import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/integrations.server";
import { getKasmConfig, getKasmImageId, getOrCreateKasmUser, kasmPost } from "@/lib/kasm.server";

export const Route = createFileRoute("/api/lab/sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Server authentication is not configured." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (auth.email !== "ebeaver091@gmail.com" && !auth.paidAccess) return Response.json({ error: "Paid access is required. Contact the workspace owner after payment." }, { status: 403 });

        let payload: { mode?: unknown };
        try { payload = await request.json() as { mode?: unknown }; }
        catch { return Response.json({ error: "Invalid JSON request." }, { status: 400 }); }
        const mode = payload.mode;
        if (mode !== "linux-desktop" && mode !== "virtual-machine") return Response.json({ error: "Choose a supported lab environment." }, { status: 400 });

        try {
          const config = getKasmConfig();
          const imageId = getKasmImageId(mode);
          const active = await auth.db.from("cyber_lab_sessions").select("id").eq("user_id", auth.userId).in("status", ["starting", "running"]).gt("expires_at", new Date().toISOString());
          if (active.error) throw new Error("Cyber lab database setup is incomplete. Apply the latest Supabase migration.");
          if ((active.data?.length ?? 0) >= 2) return Response.json({ error: "You already have two active lab sessions. Stop or wait for one to expire." }, { status: 429 });

          const providerUserId = await getOrCreateKasmUser(auth, config);
          const session = await kasmPost(config, "request_kasm", { user_id: providerUserId, image_id: imageId, enable_sharing: false });
          const providerSessionId = String(session.kasm_id ?? "");
          if (!providerSessionId) throw new Error("Kasm did not return a session ID.");
          const saved = await auth.db.from("cyber_lab_sessions").insert({
            user_id: auth.userId,
            provider_session_id: providerSessionId,
            provider_user_id: providerUserId,
            session_mode: mode,
            status: String(session.status ?? "starting").toLowerCase(),
          }).select("id").single();
          if (saved.error || !saved.data?.id) throw new Error("Kasm session started, but its session record could not be saved. Check the Supabase migration and service-role configuration.");
          return Response.json({ sessionId: saved.data.id, status: String(session.status ?? "starting").toLowerCase() }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not start a lab session.";
          const status = /not configured|migration|permissions|api key/i.test(message) ? 503 : 502;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
