import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, PageTitle, Panel, btnGhost, input } from "@/components/soc/Shell";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Saved Conversations — Eager AI" }, { name: "description", content: "Search and reopen your saved agent conversations." }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-conversations"],
    queryFn: async () => {
      const [threadResult, messageResult] = await Promise.all([
        supabase.from("threads").select("id,title,agent_id,created_at,updated_at,agents(name,role)").order("updated_at", { ascending: false }),
        supabase.from("messages").select("thread_id"),
      ]);
      if (threadResult.error) throw new Error("Could not load saved conversations. Check your sign-in and database permissions.");
      if (messageResult.error) throw new Error("Conversations loaded, but message counts could not be retrieved.");
      const counts = new Map<string, number>();
      for (const message of messageResult.data ?? []) counts.set(message.thread_id, (counts.get(message.thread_id) ?? 0) + 1);
      return (threadResult.data ?? []).map((thread) => ({
        ...thread,
        agent: Array.isArray(thread.agents) ? thread.agents[0] : thread.agents,
        messageCount: counts.get(thread.id) ?? 0,
      }));
    },
    staleTime: 15_000,
  });
  const rows = useMemo(() => (data ?? []).filter((t) => [t.title, t.agent?.name, t.agent?.role].some((v) => v?.toLowerCase().includes(search.toLowerCase()))), [data, search]);

  return <>
    <PageTitle code="WORKSPACE // SAVED THREADS" title="Saved Conversations">
      <input className={input + " w-56"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or agent…" />
    </PageTitle>
    <Panel title={`${rows.length} saved conversations`}>
      {isLoading ? <div className="h-28 animate-pulse rounded bg-muted" /> : error ? <p className="text-sm text-destructive">{error.message}</p> : rows.length === 0 ? <Empty>{data?.length ? "No conversations match your search." : "Your saved agent conversations will appear here. Start a chat from the Agent Team."}</Empty> : (
        <div className="space-y-2">
          {rows.map((thread) => <div key={thread.id} className="border rounded-sm p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="size-10 shrink-0 border border-primary/40 bg-accent grid place-items-center font-mono text-xs text-primary">{(thread.agent?.name ?? "AI").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{thread.title || "Untitled conversation"}</div>
              <div className="text-sm text-muted-foreground">{thread.agent?.name ?? "Agent unavailable"} · {thread.agent?.role ?? "Role unavailable"}</div>
              <div className="font-mono text-[11px] text-muted-foreground mt-1">{thread.messageCount} messages · Updated {new Date(thread.updated_at).toLocaleString()}</div>
            </div>
            <Link to="/chat/$threadId" params={{ threadId: thread.id }} className={btnGhost}>Open conversation →</Link>
          </div>)}
        </div>
      )}
    </Panel>
  </>;
}
