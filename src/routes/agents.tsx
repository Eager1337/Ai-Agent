import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { AGENT_ROLES } from "@/lib/soc-data";
import { useSoc } from "@/lib/soc-store";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Team — Eager AI Command Center" },
      { name: "description", content: "Specialized security agents: SOC, forensics, malware, threat intel." },
      { property: "og:title", content: "Agent Team — Eager AI Command Center" },
      { property: "og:description", content: "Specialized security agents: SOC, forensics, malware, threat intel." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { agents, addAgent } = useSoc();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(AGENT_ROLES[0]!);
  return (
    <>
      <PageTitle code="SEC-16 // AGENT TEAM" title="Agent Team">
        <button className={btn} onClick={() => setOpen(!open)}>+ Deploy agent</button>
      </PageTitle>
      {open && (
        <Panel title="New agent" className="mb-4">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label><span className="label-mono">Callsign</span><input className={input + " mt-1"} value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="e.g. HAWK" /></label>
            <label><span className="label-mono">Specialization</span>
              <select className={input + " mt-1"} value={role} onChange={(e) => setRole(e.target.value)}>{AGENT_ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <div className="flex gap-2">
              <button className={btn} disabled={!name} onClick={() => { addAgent({ id: crypto.randomUUID(), name, role, focus: [], status: "idle", lastTask: "Awaiting assignment" }); setName(""); setOpen(false); }}>Deploy</button>
              <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </Panel>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((a) => (
          <div key={a.id} className="border bg-card rounded-md p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="size-10 grid place-items-center border border-primary/50 bg-accent font-mono font-bold text-accent-foreground">{a.name.slice(0, 2)}</div>
                <div><div className="font-mono font-bold">{a.name}</div><div className="text-xs text-muted-foreground">{a.role}</div></div>
              </div>
              <span className={`font-mono text-xs ${a.status === "active" ? "text-success" : "text-muted-foreground"}`}>● {a.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">{a.focus.map((f) => <span key={f} className="font-mono text-[10px] border px-1.5 py-0.5 text-muted-foreground">{f}</span>)}</div>
            <div className="mt-3 border-t pt-2 text-sm"><span className="label-mono">Last task</span><div>{a.lastTask}</div></div>
          </div>
        ))}
      </div>
    </>
  );
}
