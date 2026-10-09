import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/trading/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ configured: false, connected: false, reason: "server-configuration" }, { status: 200 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const result = await auth.db.from("trading_provider_users").select("created_at").eq("user_id", auth.userId).maybeSingle();
        if (result.error) return Response.json({ configured: true, connected: false, reason: "storage-unavailable" }, { status: 503 });
        return Response.json({
          configured: Boolean(process.env["SNAPTRADE_CLIENT_ID"] && process.env["SNAPTRADE_CONSUMER_KEY"] && process.env["TRADING_ENCRYPTION_KEY"]),
          connected: Boolean(result.data),
          provider: "SnapTrade",
          permission: "read-only",
        });
      },
    },
  },
});
