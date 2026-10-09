import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, decryptSecret, getSnapTradeClient, unwrapData } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/trading/activities")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Trading integration is not configured on the server." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (auth.email !== "ebeaver091@gmail.com" && !auth.paidAccess) return Response.json({ error: "Paid access is required. Contact the workspace owner after payment." }, { status: 403 });
        let payload: { accountId?: unknown };
        try { payload = await request.json() as { accountId?: unknown }; }
        catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const accountId = typeof payload.accountId === "string" ? payload.accountId.trim() : "";
        if (!accountId || accountId.length > 200) return Response.json({ error: "A valid account ID is required" }, { status: 400 });
        try {
          const stored = await auth.db.from("trading_provider_users").select("provider_user_id,user_secret_ciphertext,user_secret_iv,user_secret_tag").eq("user_id", auth.userId).maybeSingle();
          if (stored.error || !stored.data) return Response.json({ error: "Connect a brokerage account first." }, { status: 409 });
          const record = stored.data as { provider_user_id: string; user_secret_ciphertext: string; user_secret_iv: string; user_secret_tag: string };
          const userSecret = decryptSecret({ ciphertext: record.user_secret_ciphertext, iv: record.user_secret_iv, tag: record.user_secret_tag });
          const client = getSnapTradeClient();
          const accounts = unwrapData(await client.accountInformation.listUserAccounts({ userId: record.provider_user_id, userSecret }));
          const list = Array.isArray(accounts["accounts"]) ? accounts["accounts"] : Array.isArray(accounts["data"]) ? accounts["data"] : [];
          const belongsToUser = list.some((value) => value && typeof value === "object" && String((value as Record<string, unknown>)["id"] ?? (value as Record<string, unknown>)["accountId"] ?? "") === accountId);
          if (!belongsToUser) return Response.json({ error: "That account is not connected to this user." }, { status: 404 });
          const response = unwrapData(await client.accountInformation.getAccountActivities({ accountId, userId: record.provider_user_id, userSecret }));
          const listActivities = Array.isArray(response["activities"]) ? response["activities"] : Array.isArray(response["data"]) ? response["data"] : [];
          const safeActivities = listActivities.slice(0, 500).map((value) => {
            const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
            return {
              date: String(item["trade_date"] ?? item["date"] ?? item["settlement_date"] ?? ""),
              type: String(item["type"] ?? item["activity_type"] ?? "Activity"),
              symbol: String(item["symbol"] ?? item["description"] ?? "—"),
              quantity: item["units"] ?? item["quantity"] ?? null,
              amount: item["amount"] ?? item["net_amount"] ?? null,
              currency: String(item["currency"] ?? ""),
            };
          });
          return Response.json({ activities: safeActivities, count: safeActivities.length, readOnly: true, freshness: "Broker/provider availability varies; activity data may be delayed." });
        } catch (error) {
          console.error("Broker activity read failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ error: "Could not retrieve account activity." }, { status: 502 });
        }
      },
    },
  },
});
