import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { AGENT_ROLES } from "@/lib/soc-data";
import { useAgents, useInsert, useThreads, type AgentRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "Agent Team — Eager AI" },
      { name: "description", content: "Create specialized AI agents and chat with them in saved threads." },
      { property: "og:title", content: "Agent Team — Eager AI" },
      { property: "og:description", content: "Create specialized AI agents and chat with them in saved threads." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data: agents = [], isLoading, error: agentsError } = useAgents();
  const addAgent = useInsert("agents", ["agents"]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(AGENT_ROLES[0]!);
  const [instructions, setInstructions] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <>
      <PageTitle code="SEC-16 // AGENT TEAM" title="Agent Team">
        <button className={btn} onClick={() => setOpen(!open)}>+ Create agent</button>
      </PageTitle>
      {agentsError && <p role="alert" className="border border-destructive/40 rounded-sm p-3 mb-4 text-sm text-destructive">Agents could not be loaded. Check your sign-in and database permissions, then refresh.</p>}
      {open && (
        <Panel title="New agent" className="mb-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label><span className="label-mono">Name</span><input className={input + " mt-1"} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="e.g. SENTRY" /></label>
            <label><span className="label-mono">Role</span>
              <select className={input + " mt-1"} value={role} onChange={(e) => setRole(e.target.value)}>{AGENT_ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="label-mono">Instructions (optional)</span>
              <textarea className={input + " mt-1 h-20"} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Tone, focus areas, report format…" /></label>
          </div>
          <div className="flex gap-2 mt-3">
            <button className={btn} disabled={!name.trim() || addAgent.isPending} onClick={async () => {
              setFormError(null);
              try {
                await addAgent.mutateAsync({ name: name.trim(), role, instructions: instructions.trim() });
                setName(""); setInstructions(""); setOpen(false);
              } catch {
                setFormError("The agent could not be saved. Check your connection and database permissions, then try again.");
              }
            }}>{addAgent.isPending ? "Saving…" : "Create"}</button>
            <button className={btnGhost} onClick={() => { setOpen(false); setFormError(null); }}>Cancel</button>
          </div>
          {formError && <p role="alert" className="text-sm text-destructive mt-3">{formError}</p>}
        </Panel>
      )}
      {isLoading ? <div className="h-32 animate-pulse bg-muted rounded-md" /> : agents.length === 0 ? (
        <Empty>No agents yet. Create a SOC Analyst or Forensics Analyst to get started.</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((a) => <AgentCard key={a.id} a={a} />)}
        </div>
      )}
    </>
  );
}

function AgentCard({ a }: { a: AgentRow }) {
  const { data: threads = [] } = useThreads(a.id);
  const addThread = useInsert("threads", ["threads"]);
  const nav = useNavigate();
  const [threadError, setThreadError] = useState<string | null>(null);
  return (
    <div className="border bg-card rounded-md p-4 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="size-10 grid place-items-center border border-primary/50 bg-accent font-mono font-bold text-accent-foreground">{a.name.slice(0, 2)}</div>
        <div><div className="font-mono font-bold">{a.name}</div><div className="text-xs text-muted-foreground">{a.role}</div></div>
      </div>
      {a.instructions && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{a.instructions}</p>}
      <div className="mt-3 border-t pt-2 flex-1">
        <span className="label-mono">Threads</span>
        <ul className="mt-1 space-y-0.5">
          {threads.slice(0, 4).map((t) => (
            <li key={t.id}><Link to="/chat/$threadId" params={{ threadId: t.id }} className="block truncate text-sm hover:text-primary">› {t.title}</Link></li>
          ))}
          {threads.length === 0 && <li className="text-xs text-muted-foreground">No conversations yet</li>}
        </ul>
      </div>
      <button className={btn + " mt-3 justify-center"} disabled={addThread.isPending}
        onClick={async () => {
          setThreadError(null);
          try {
            const t = await addThread.mutateAsync({ agent_id: a.id, title: "New conversation" });
            nav({ to: "/chat/$threadId", params: { threadId: t.id } });
          } catch {
            setThreadError("Could not create a conversation. Check your sign-in and database permissions, then retry.");
          }
        }}>
        {addThread.isPending ? "Creating…" : "New conversation"}
      </button>
      {threadError && <p role="alert" className="text-xs text-destructive mt-2">{threadError}</p>}
    </div>
  );
}
