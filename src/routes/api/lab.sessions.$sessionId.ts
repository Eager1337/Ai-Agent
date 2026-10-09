import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/integrations.server";
import { getKasmConfig, kasmPost, makeLaunchUrl } from "@/lib/kasm.server";

export const Route = createFileRoute("/api/lab/sessions/$sessionId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Server authentication is not configured." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (auth.email !== "ebeaver091@gmail.com" && !auth.paidAccess) return Response.json({ error: "Paid access is required. Contact the workspace owner after payment." }, { status: 403 });

        const found = await auth.db.from("cyber_lab_sessions")
          .select("id,provider_session_id,provider_user_id,status,expires_at")
          .eq("id", params.sessionId).eq("user_id", auth.userId).maybeSingle();
        if (found.error) return Response.json({ error: "Cyber lab database setup is incomplete. Apply the latest Supabase migration." }, { status: 503 });
        if (!found.data) return Response.json({ error: "Lab session not found." }, { status: 404 });
        if (Date.parse(found.data.expires_at) <= Date.now()) {
          await auth.db.from("cyber_lab_sessions").update({ status: "expired" }).eq("id", found.data.id).eq("user_id", auth.userId);
          return Response.json({ status: "expired", message: "This lab session expired. Start a new session." }, { status: 410 });
        }

        try {
          const config = getKasmConfig();
          const state = await kasmPost(config, "get_kasm_status", { user_id: found.data.provider_user_id, kasm_id: found.data.provider_session_id });
          const kasm = state.kasm && typeof state.kasm === "object" ? state.kasm as Record<string, unknown> : {};
          const status = String(kasm.operational_status ?? state.operational_status ?? state.status ?? "starting").toLowerCase();
          const progressValue = state.operational_progress;
          const progress = typeof progressValue === "number" ? progressValue : null;
          const message = typeof state.operational_message === "string" ? state.operational_message : "Waiting for the isolated workspace to become ready.";
          await auth.db.from("cyber_lab_sessions").update({ status }).eq("id", found.data.id).eq("user_id", auth.userId);
          if (status === "running") {
            const launchUrl = makeLaunchUrl(config.baseUrl, state.kasm_url);
            return Response.json({ status, launchUrl, progress: 100, message });
          }
          return Response.json({ status, progress, message }, { status: 202 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not check lab session status.";
          const status = /not configured|migration|permissions|api key/i.test(message) ? 503 : 502;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
