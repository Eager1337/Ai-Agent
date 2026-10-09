import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { streamPost } from "@/lib/stream";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [
    { title: "Conversation — Eager AI" }, { name: "description", content: "Saved agent conversation." },
    { property: "og:title", content: "Conversation — Eager AI" }, { property: "og:description", content: "Saved agent conversation." },
  ] }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  return <Chat key={threadId} threadId={threadId} />;
}

function Chat({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const threadQuery = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      const result = await supabase.from("threads").select("id,title,agent_id,agents(name,role,instructions)").eq("id", threadId).maybeSingle();
      if (result.error) throw new Error("Could not load this conversation. Check your sign-in and access permissions.");
      if (!result.data) throw new Error("This conversation was not found or you do not have access to it.");
      const raw = result.data as unknown as { id: string; title: string; agent_id: string; agents: { name: string; role: string; instructions: string } | { name: string; role: string; instructions: string }[] | null };
      return { ...raw, agent: Array.isArray(raw.agents) ? raw.agents[0] ?? null : raw.agents };
    },
  });
  const { data: msgs = [], isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const result = await supabase.from("messages").select("id,role,content,created_at").eq("thread_id", threadId).order("created_at");
      if (result.error) throw new Error("Could not load messages. Check your sign-in and database permissions.");
      return result.data ?? [];
    },
  });

  const send = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setText(""); setPending(content); setReply(""); setBusy(true); setErr(null);
    try {
      await streamPost("/api/chat", { threadId, content }, setReply);
    } catch (e) {
      setText(content);
      setErr(e instanceof Error ? e.message : "The assistant response failed. Please try again.");
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["messages", threadId] }),
        qc.invalidateQueries({ queryKey: ["threads"] }),
        qc.invalidateQueries({ queryKey: ["saved-conversations"] }),
        qc.invalidateQueries({ queryKey: ["thread", threadId] }),
      ]);
      setPending(null); setReply(""); setBusy(false); inputRef.current?.focus();
    }
  };
  const agent = threadQuery.data?.agent;

  return (
    <>
      <PageTitle code="AGENT // THREAD" title={threadQuery.data?.title || "Conversation"}>
        <div className="flex gap-3"><Link to="/conversations" className="font-mono text-xs text-primary">Saved conversations</Link><Link to="/agents" className="font-mono text-xs text-primary">← Agents</Link></div>
      </PageTitle>
      {threadQuery.isLoading ? <div className="h-16 animate-pulse bg-muted rounded-md mb-4" /> : threadQuery.error ? <div className="border border-destructive/40 p-3 rounded-sm text-sm text-destructive mb-4">{threadQuery.error.message}</div> : (
        <Panel title={agent?.name ?? "Agent details"} action={<span className="font-mono text-xs text-primary">{agent?.role ?? "Assistant"}</span>}>
          <p className="text-sm text-muted-foreground">{agent?.instructions?.trim() || "This agent has no additional operator instructions configured."}</p>
        </Panel>
      )}
      <Panel title="Messages" >
        <div className="space-y-4 min-h-40">
          {messagesLoading && <p className="text-xs text-muted-foreground">Loading conversation…</p>}
          {messagesError && <p className="text-sm text-destructive">{messagesError.message}</p>}
          {msgs.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
          {pending && !msgs.some((m) => m.content === pending && m.role === "user") && <Bubble role="user" content={pending} />}
          {busy && (reply ? <Bubble role="assistant" content={reply} /> : <p className="font-mono text-xs text-muted-foreground live-dot">Agent is working…</p>)}
          {msgs.length === 0 && !busy && !messagesLoading && !messagesError && <p className="text-sm text-muted-foreground">Give your agent a task to begin.</p>}
          {err && <div className="border border-destructive/40 rounded-sm p-3 text-sm text-destructive">{err} Your draft has been restored; review it and press Send to retry.</div>}
        </div>
        <div className="flex gap-2 mt-4 items-end">
          <textarea ref={inputRef} rows={2} className={input + " resize-none"} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Describe a task…" />
          <button className={btn} onClick={() => void send()} disabled={busy || !threadQuery.data}>Send</button>
        </div>
      </Panel>
    </>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  return role === "user"
    ? <div className="ml-auto max-w-[80%] w-fit rounded-md bg-accent text-accent-foreground px-3 py-2 text-sm whitespace-pre-wrap">{content}</div>
    : <div className="text-sm leading-relaxed [&_h1]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_code]:font-mono [&_code]:text-primary [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:overflow-x-auto [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:px-2"><ReactMarkdown>{content}</ReactMarkdown></div>;
}
