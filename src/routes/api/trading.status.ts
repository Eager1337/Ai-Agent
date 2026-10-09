import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, decryptSecret, getSnapTradeClient, unwrapData } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/trading/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ configured: false, connected: false, reason: "server-configuration" }, { status: 200 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const configured = Boolean(process.env["SNAPTRADE_CLIENT_ID"] && process.env["SNAPTRADE_CONSUMER_KEY"] && process.env["TRADING_ENCRYPTION_KEY"]);
        if (!configured) return Response.json({ configured: false, connected: false, provider: "SnapTrade", permission: "read-only" });
        const result = await auth.db.from("trading_provider_users").select("provider_user_id,user_secret_ciphertext,user_secret_iv,user_secret_tag").eq("user_id", auth.userId).maybeSingle();
        if (result.error) return Response.json({ configured, connected: false, reason: "storage-unavailable" }, { status: 503 });
        if (!result.data) return Response.json({ configured, connected: false, provider: "SnapTrade", permission: "read-only" });
        try {
          const row = result.data as { provider_user_id: string; user_secret_ciphertext: string; user_secret_iv: string; user_secret_tag: string };
          const userSecret = decryptSecret({ ciphertext: row.user_secret_ciphertext, iv: row.user_secret_iv, tag: row.user_secret_tag });
          const response = unwrapData(await getSnapTradeClient().accountInformation.listUserAccounts({ userId: row.provider_user_id, userSecret }));
          const accounts = Array.isArray(response["accounts"]) ? response["accounts"] : Array.isArray(response["data"]) ? response["data"] : [];
          return Response.json({ configured, connected: accounts.length > 0, provider: "SnapTrade", permission: "read-only", accountCount: accounts.length });
        } catch (error) {
          console.error("Broker status check failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ configured, connected: false, provider: "SnapTrade", permission: "read-only", reason: "provider-check-failed" }, { status: 502 });
        }
      },
    },
  },
});
