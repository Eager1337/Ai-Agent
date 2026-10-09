import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, decryptSecret, getSnapTradeClient, unwrapData } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/trading/accounts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Trading integration is not configured on the server." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (auth.email !== "ebeaver091@gmail.com" && !auth.paidAccess) return Response.json({ error: "Paid access is required. Contact the workspace owner after payment." }, { status: 403 });
        try {
          const stored = await auth.db.from("trading_provider_users").select("provider_user_id,user_secret_ciphertext,user_secret_iv,user_secret_tag").eq("user_id", auth.userId).maybeSingle();
          if (stored.error) throw new Error("Could not read connector state");
          if (!stored.data) return Response.json({ accounts: [], connected: false });
          const record = stored.data as { provider_user_id: string; user_secret_ciphertext: string; user_secret_iv: string; user_secret_tag: string };
          const userSecret = decryptSecret({ ciphertext: record.user_secret_ciphertext, iv: record.user_secret_iv, tag: record.user_secret_tag });
          const client = getSnapTradeClient();
          const response = unwrapData(await client.accountInformation.listUserAccounts({ userId: record.provider_user_id, userSecret }));
          const list = Array.isArray(response["accounts"]) ? response["accounts"] : Array.isArray(response["data"]) ? response["data"] : [];
          const safeAccounts = list.map((value) => {
            const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
            const institution = item["institution_name"] ?? item["institutionName"] ?? item["brokerage_name"];
            return {
              id: String(item["id"] ?? item["accountId"] ?? ""),
              name: String(item["name"] ?? item["number"] ?? "Brokerage account"),
              institution: typeof institution === "string" ? institution : "Brokerage",
              currency: typeof item["currency"] === "string" ? item["currency"] : ((item["currency"] && typeof item["currency"] === "object" && "code" in item["currency"]) ? String((item["currency"] as Record<string, unknown>)["code"]) : "—"),
              type: typeof item["type"] === "string" ? item["type"] : "Account",
            };
          }).filter((account) => account.id);
          return Response.json({ connected: true, permission: "read-only", accounts: safeAccounts });
        } catch (error) {
          console.error("Broker account read failed", error instanceof Error ? error.message : "unknown error");
          return Response.json({ error: "Could not retrieve brokerage accounts. The provider may still be authorizing the connection." }, { status: 502 });
        }
      },
    },
  },
});
