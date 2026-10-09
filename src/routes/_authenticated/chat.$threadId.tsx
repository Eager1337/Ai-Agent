import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, btn, input } from "@/components/soc/Shell";
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
  const [reply, setReply] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: msgs = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => (await supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at")).data ?? [],
  });

  const send = async () => {
    const content = text.trim(); if (!content || busy) return;
    setText(""); setPending(content); setReply(""); setBusy(true); setErr(null);
    try {
      await streamPost("/api/chat", { threadId, content }, setReply);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    await qc.invalidateQueries({ queryKey: ["messages", threadId] });
    qc.invalidateQueries({ queryKey: ["threads"] });
    setPending(null); setReply(""); setBusy(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <PageTitle code="AGENT // THREAD" title="Conversation"><Link to="/agents" className="font-mono text-xs text-primary">← Agents</Link></PageTitle>
      <Panel title="Messages">
        <div className="space-y-4 min-h-40">
          {msgs.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
          {pending && !msgs.some((m) => m.content === pending && m.role === "user") && <Bubble role="user" content={pending} />}
          {busy && (reply ? <Bubble role="assistant" content={reply} /> : <p className="font-mono text-xs text-muted-foreground live-dot">Agent is working…</p>)}
          {msgs.length === 0 && !busy && <p className="text-sm text-muted-foreground">Give your agent a task to begin.</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <div className="flex gap-2 mt-4 items-end">
          <textarea ref={inputRef} autoFocus rows={2} className={input + " resize-none"} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Describe a task…" />
          <button className={btn} onClick={send} disabled={busy}>Send</button>
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
