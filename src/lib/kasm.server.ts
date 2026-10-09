import { randomBytes } from "node:crypto";
import type { AuthenticatedRequest } from "@/lib/integrations.server";

type KasmConfig = { baseUrl: string; apiKey: string; apiSecret: string };
type KasmPayload = Record<string, unknown>;
type KasmResponse = Record<string, any>;

export function getKasmConfig(): KasmConfig {
  const raw = process.env["KASM_URL"] ?? "";
  const apiKey = process.env["KASM_API_KEY"] ?? "";
  const apiSecret = process.env["KASM_API_KEY_SECRET"] ?? "";
  if (!raw || !apiKey || !apiSecret) throw new Error("Kasm provider is not configured. Set KASM_URL, KASM_API_KEY and KASM_API_KEY_SECRET on the server.");
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("KASM_URL must be a valid HTTPS URL."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("KASM_URL must be a clean HTTPS origin without credentials, query, or fragment.");
  }
  return { baseUrl: parsed.origin, apiKey, apiSecret };
}

export async function kasmPost(config: KasmConfig, endpoint: string, payload: KasmPayload = {}): Promise<KasmResponse> {
  const response = await fetch(new URL("/api/public/" + endpoint, config.baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: config.apiKey, api_key_secret: config.apiSecret, ...payload }),
    redirect: "error",
  });
  const data = await response.json().catch(() => ({})) as KasmResponse;
  if (!response.ok || data.error_message) {
    const message = typeof data.error_message === "string" ? data.error_message : "Kasm provider request failed.";
    throw new Error(message.slice(0, 300));
  }
  return data;
}

export async function getOrCreateKasmUser(auth: AuthenticatedRequest, config: KasmConfig): Promise<string> {
  const mapping = await auth.db.from("cyber_lab_provider_users").select("provider_user_id").eq("user_id", auth.userId).maybeSingle();
  if (mapping.error) throw new Error("Cyber lab database setup is incomplete. Apply the latest Supabase migration.");
  if (mapping.data?.provider_user_id) return String(mapping.data.provider_user_id);

  const username = "eager-" + auth.userId.replace(/-/g, "") + "@workspace.local";
  let providerUserId = "";
  try {
    const found = await kasmPost(config, "get_user", { target_user: { username } });
    providerUserId = String(found.user?.user_id ?? "");
  } catch {
    const password = randomBytes(32).toString("base64url") + "aA1!";
    const created = await kasmPost(config, "create_user", {
      target_user: { username, first_name: "Eager", last_name: "Workspace", locked: false, disabled: false, password },
    });
    providerUserId = String(created.user?.user_id ?? "");
  }
  if (!providerUserId) throw new Error("Kasm did not return a user ID. Check the API key permissions for Users View and Users Create.");
  const saved = await auth.db.from("cyber_lab_provider_users").insert({ user_id: auth.userId, provider_user_id: providerUserId });
  if (saved.error) {
    const retry = await auth.db.from("cyber_lab_provider_users").select("provider_user_id").eq("user_id", auth.userId).maybeSingle();
    if (retry.data?.provider_user_id) return String(retry.data.provider_user_id);
    throw new Error("Could not save the private Kasm user mapping. Apply the latest Supabase migration.");
  }
  return providerUserId;
}

export function getKasmImageId(mode: string): string {
  const image = mode === "linux-desktop" ? process.env["KASM_LINUX_IMAGE_ID"] : mode === "virtual-machine" ? process.env["KASM_VM_IMAGE_ID"] : "";
  if (!image) throw new Error(mode === "linux-desktop" ? "KASM_LINUX_IMAGE_ID is not configured." : "KASM_VM_IMAGE_ID is not configured.");
  return image;
}

export function makeLaunchUrl(baseUrl: string, path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) throw new Error("Kasm returned an invalid session URL.");
  const url = new URL(path, baseUrl);
  if (url.origin !== baseUrl) throw new Error("Kasm returned a session URL outside the configured provider.");
  return url.toString();
}
