import { supabase } from "@/integrations/supabase/client";

export async function streamPost(
  url: string,
  body: unknown,
  onText: (full: string) => void,
  signal?: AbortSignal,
) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your session has expired. Sign in again, then retry your message.");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const message = (await res.text()).trim();
    const safeMessage = res.status === 401 ? "Your session has expired. Sign in again."
      : res.status === 404 ? "This conversation is unavailable or you do not have access to it."
      : res.status === 429 ? "The AI service is busy. Wait a moment and try again."
      : res.status >= 500 ? "The AI service could not complete this response. Your conversation is saved; please retry."
      : message || `Request failed (${res.status})`;
    throw new Error(safeMessage);
  }
  if (!res.body) throw new Error("The AI service returned an empty response. Please try again.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      onText(full);
    }
    full += decoder.decode();
    if (full) onText(full);
    if (!full.trim()) throw new Error("The AI service returned no text. Please retry your message.");
    return full;
  } catch (error) {
    if (signal?.aborted) throw new Error("Response cancelled.");
    throw error;
  } finally {
    try { reader.releaseLock(); } catch { /* stream already closed */ }
  }
}
