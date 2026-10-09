import { createFileRoute } from "@tanstack/react-router";
import { SAFETY, streamAI, userClient } from "@/lib/ai.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = userClient(request);
        if (!u) return new Response("Unauthorized", { status: 401 });
        const { threadId, content } = (await request.json()) as { threadId?: string; content?: string };
        if (!threadId || !content?.trim()) return new Response("Bad request", { status: 400 });

        const { data: thread } = await u.sb.from("threads").select("id, title, agent_id, agents(name, role, instructions)").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Not found", { status: 404 });

        const { error } = await u.sb.from("messages").insert({ thread_id: threadId, role: "user", content });
        if (error) return new Response(error.message, { status: 500 });
        if (thread.title === "New conversation") await u.sb.from("threads").update({ title: content.slice(0, 60) }).eq("id", threadId);

        const { data: history = [] } = await u.sb.from("messages").select("role, content").eq("thread_id", threadId).order("created_at");
        const agent = thread.agents as unknown as { name: string; role: string; instructions: string } | null;
        const system = `You are ${agent?.name ?? "an agent"}, a specialist ${agent?.role ?? "assistant"} in the Eager AI workspace. Act as a senior expert in this specialty: be precise, structured, and actionable; state assumptions and confidence; finish tasks end to end rather than describing what you would do.\n${agent?.instructions ? `Operator instructions: ${agent.instructions}\n` : ""}${SAFETY}`;

        try {
          return streamAI(request, system, (history ?? []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })), async (text) => {
            await u.sb.from("messages").insert({ thread_id: threadId, role: "assistant", content: text });
            await u.sb.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
          });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "AI error", { status: 500 });
        }
      },
    },
  },
});
