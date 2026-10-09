import { createFileRoute } from "@tanstack/react-router";
import { SAFETY, streamAI, userClient } from "@/lib/ai.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = userClient(request);
        if (!u) return new Response("Unauthorized. Sign in and try again.", { status: 401 });

        let payload: { threadId?: unknown; content?: unknown };
        try {
          payload = await request.json() as { threadId?: unknown; content?: unknown };
        } catch {
          return new Response("Invalid JSON request.", { status: 400 });
        }

        const threadId = typeof payload.threadId === "string" ? payload.threadId.trim() : "";
        const content = typeof payload.content === "string" ? payload.content.trim() : "";
        if (!threadId || !content) return new Response("A conversation and message are required.", { status: 400 });
        if (content.length > 20_000) return new Response("Messages must be 20,000 characters or fewer.", { status: 413 });

        try {
          // The user's bearer token is passed to Supabase; row-level security must enforce thread ownership.
          const threadResult = await u.sb.from("threads")
            .select("id, title, agent_id, agents(name, role, instructions)")
            .eq("id", threadId)
            .maybeSingle();
          if (threadResult.error) {
            console.error("Thread lookup failed for chat request.");
            return new Response("Could not verify conversation access.", { status: 500 });
          }
          const thread = threadResult.data;
          if (!thread) return new Response("Conversation not found or access denied.", { status: 404 });

          // Avoid duplicating the last user message when the client retries after a stream failure.
          const lastMessageResult = await u.sb.from("messages")
            .select("role, content")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastMessageResult.error) {
            console.error("Last message lookup failed.");
            return new Response("Could not verify conversation state. Please try again.", { status: 500 });
          }
          const isRetry = lastMessageResult.data?.role === "user" && lastMessageResult.data.content === content;
          if (!isRetry) {
            const insertResult = await u.sb.from("messages").insert({ thread_id: threadId, role: "user", content });
            if (insertResult.error) {
              console.error("User message insert failed.");
              return new Response("Could not save your message. Please try again.", { status: 500 });
            }
          }

          if (thread.title === "New conversation") {
            const titleResult = await u.sb.from("threads").update({ title: content.slice(0, 60) }).eq("id", threadId);
            if (titleResult.error) console.error("Conversation title update failed.");
          }

          const historyResult = await u.sb.from("messages")
            .select("role, content")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true });
          if (historyResult.error) {
            console.error("Chat history lookup failed.");
            return new Response("Message saved, but conversation history could not be loaded. Please retry.", { status: 500 });
          }

          const relation = thread.agents as unknown as { name: string; role: string; instructions: string } | { name: string; role: string; instructions: string }[] | null;
          const agent = Array.isArray(relation) ? relation[0] ?? null : relation;
          const system = `You are ${agent?.name ?? "an agent"}, a specialist ${agent?.role ?? "assistant"} in the Eager AI workspace. Act as a senior expert in this specialty: be precise, structured, and actionable; state assumptions and confidence; finish tasks end to end rather than describing what you would do.
${agent?.instructions ? `Operator instructions: ${agent.instructions}\n` : ""}${SAFETY}`;

          return streamAI(
            request,
            system,
            (historyResult.data ?? []).map((m) => ({
              role: m.role === "assistant" ? "assistant" as const : "user" as const,
              content: m.content,
            })),
            async (text) => {
              const saveAssistant = await u.sb.from("messages").insert({ thread_id: threadId, role: "assistant", content: text });
              if (saveAssistant.error) {
                console.error("Assistant message persistence failed.");
                return;
              }
              const touchThread = await u.sb.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
              if (touchThread.error) console.error("Conversation timestamp update failed.");
            },
          );
        } catch {
          console.error("Chat request failed before streaming.");
          return new Response("The AI service could not start this response. Please try again.", { status: 500 });
        }
      },
    },
  },
});
