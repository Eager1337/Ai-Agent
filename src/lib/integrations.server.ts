import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Snaptrade } from "snaptrade-typescript-sdk";
import { userClient } from "@/lib/ai.server";

export type AuthenticatedRequest = { userId: string; db: ReturnType<typeof createClient> };

export async function authenticateRequest(request: Request): Promise<AuthenticatedRequest | null> {
  const user = userClient(request);
  if (!user) return null;
  const { data, error } = await user.sb.auth.getUser(user.token);
  if (error || !data.user) return null;
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server");
  return { userId: data.user.id, db: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

function encryptionKey(): Buffer {
  const value = process.env["TRADING_ENCRYPTION_KEY"] ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error("TRADING_ENCRYPTION_KEY must be a 64-character hex-encoded 32-byte key");
  return Buffer.from(value, "hex");
}

export function encryptSecret(secret: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptSecret(record: { ciphertext: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function getSnapTradeClient() {
  const clientId = process.env["SNAPTRADE_CLIENT_ID"];
  const consumerKey = process.env["SNAPTRADE_CONSUMER_KEY"];
  if (!clientId || !consumerKey) throw new Error("SnapTrade server credentials are not configured");
  return new Snaptrade({ clientId, consumerKey }) as unknown as {
    authentication: {
      registerSnapTradeUser: (params: { userId: string }) => Promise<unknown>;
      loginSnapTradeUser: (params: { userId: string; userSecret: string }, options: { connectionType: "read"; customRedirect: string }) => Promise<unknown>;
    };
    accountInformation: {
      listUserAccounts: (params: { userId: string; userSecret: string }) => Promise<unknown>;
      getAccountActivities: (params: { accountId: string; userId: string; userSecret: string }) => Promise<unknown>;
    };
  };
}

export function unwrapData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const outer = value as Record<string, unknown>;
  const inner = outer["data"];
  if (Array.isArray(inner)) return { data: inner };
  return inner && typeof inner === "object" ? inner as Record<string, unknown> : outer;
}

export function signLabTicket(payload: string): string {
  const key = process.env["LAB_SESSION_SIGNING_KEY"];
  if (!key || key.length < 32) throw new Error("LAB_SESSION_SIGNING_KEY must be at least 32 characters");
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function verifyLabTicket(payload: string, signature: string): boolean {
  const expected = Buffer.from(signLabTicket(payload), "hex");
  let received: Buffer;
  try { received = Buffer.from(signature, "hex"); } catch { return false; }
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createOpaqueId(): string {
  return randomBytes(18).toString("hex");
}
