import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, encryptSecret, getSnapTradeClient, unwrapData } from "@/lib/integrations.server";

export const Route = createFileRoute("/api/trading/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth;
        try { auth = await authenticateRequest(request); }
        catch { return Response.json({ error: "Trading integration is not configured on the server." }, { status: 503 }); }
        if (!auth) return Response.json({ error: "Sign in to connect a brokerage." }, { status: 401 });
        if (auth.email !== "ebeaver091@gmail.com" && !auth.paidAccess) return Response.json({ error: "Paid access is required. Contact the workspace owner after payment." }, { status: 403 });
        try {
          const client = getSnapTradeClient();
          const providerUserId = "eager_" + auth.userId.replace(/-/g, "");
          const existing = await auth.db.from("trading_provider_users").select("provider_user_id,user_secret_ciphertext,user_secret_iv,user_secret_tag").eq("user_id", auth.userId).maybeSingle();
          let providerUser = existing.data as { provider_user_id: string; user_secret_ciphertext: string; user_secret_iv: string; user_secret_tag: string } | null;
          if (existing.error) throw new Error("Could not read private connection state");
          if (!providerUser) {
            const registered = unwrapData(await client.authentication.registerSnapTradeUser({ userId: providerUserId }));
            const secret = registered["userSecret"] ?? registered["user_secret"];
            if (typeof secret !== "string" || !secret) throw new Error("SnapTrade did not return the expected user secret");
            const encrypted = encryptSecret(secret);
            const saved = await auth.db.from("trading_provider_users").insert({
              user_id: auth.userId,
              provider_user_id: providerUserId,
              user_secret_ciphertext: encrypted.ciphertext,
              user_secret_iv: encrypted.iv,
              user_secret_tag: encrypted.tag,
            }).select("provider_user_id,user_secret_ciphertext,user_secret_iv,user_secret_tag").single();
            if (saved.error || !saved.data) throw new Error("Could not securely save the brokerage connector");
            providerUser = saved.data as typeof providerUser;
          }
          const { decryptSecret } = await import("@/lib/integrations.server");
          const userSecret = decryptSecret({ ciphertext: providerUser.user_secret_ciphertext, iv: providerUser.user_secret_iv, tag: providerUser.user_secret_tag });
          const callback = new URL("/trading?connection=complete", new URL(request.url).origin).toString();
          const portal = unwrapData(await client.authentication.loginSnapTradeUser(
            { userId: providerUser.provider_user_id, userSecret },
            { connectionType: "read", customRedirect: callback },
          ));
          const redirectURI = portal["redirectURI"] ?? portal["redirectUri"] ?? portal["redirect_uri"] ?? portal["url"];
          if (typeof redirectURI !== "string" || !redirectURI.startsWith("https://")) throw new Error("SnapTrade did not return a valid secure connection portal URL");
          return Response.json({ redirectUrl: redirectURI, permission: "read-only" });
        } catch (error) {
          console.error("Broker connection could not be started", error instanceof Error ? error.message : "unknown error");
          return Response.json({ error: "Could not start the secure read-only broker connection. Check server configuration and SnapTrade access." }, { status: 502 });
        }
      },
    },
  },
});
