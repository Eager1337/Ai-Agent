import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, btn, input } from "@/components/soc/Shell";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [
    { title: "Conversation — Eager AI" }, { name: "description", content: "Saved agent conversation." },
    { property: "og:title", content: "Conversation — Eager AI" }, { property: "og:description", content: "Saved agent conversation." },
  ] }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: msgs = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => (await supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at")).data ?? [],
  });
  const send = async () => {
    const content = text.trim(); if (!content) return;
    setText("");
    await supabase.from("messages").insert({ thread_id: threadId, role: "user", content });
    if (msgs.length === 0) await supabase.from("threads").update({ title: content.slice(0, 60) }).eq("id", threadId);
    qc.invalidateQueries({ queryKey: ["messages", threadId] });
    qc.invalidateQueries({ queryKey: ["threads"] });
  };
  return (
    <>
      <PageTitle code="AGENT // THREAD" title="Conversation"><Link to="/agents" className="font-mono text-xs text-primary">← Agents</Link></PageTitle>
      <Panel title="Messages">
        <div className="space-y-3 min-h-40">
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm w-fit" : "text-sm"}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          ))}
          {msgs.length === 0 && <p className="text-sm text-muted-foreground">Start the conversation. AI replies are not connected yet.</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <input autoFocus className={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message…" />
          <button className={btn} onClick={send}>Send</button>
        </div>
      </Panel>
    </>
  );
}
