import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const MODEL = "openai/gpt-6-astra";

export function userClient(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return {
    token,
    sb: createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
  };
}

export function streamAI(request: Request, system: string, messages: ModelMessage[], onFinish?: (text: string) => Promise<void>) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  let runId = request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers: h });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    system,
    messages,
    abortSignal: request.signal,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
    onFinish: async ({ text }) => { if (onFinish && text) await onFinish(text); },
    onError: ({ error }) => console.error("AI error", error),
  });
  return result.toTextStreamResponse();
}

export const SAFETY = `You operate inside an educational and professional cybersecurity workspace for authorized coursework, CTFs, research, incident response and approved assessments. Focus on defensive analysis, investigation, documentation and remediation. Do not produce working malware, exploit code against real third-party systems, or instructions for unauthorized access. Use markdown with clear headings and lists.`;
