import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";
import { useAgents, useApiKeys, useInsert, useRevokeKey } from "@/lib/db";
import { sha256Hex } from "@/lib/ioc";

export const Route = createFileRoute("/_authenticated/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — Eager AI" },
      { name: "description", content: "Scoped personal keys that let external tools use selected agents." },
      { property: "og:title", content: "API Keys — Eager AI" },
      { property: "og:description", content: "Scoped personal keys that let external tools use selected agents." },
    ],
  }),
  component: ApiKeysPage,
});

function newKey() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return "eak_" + btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function ApiKeysPage() {
  const { data: agents = [] } = useAgents();
  const { data: keys = [] } = useApiKeys();
  const add = useInsert("api_keys", ["api_keys"]);
  const revoke = useRevokeKey();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [plain, setPlain] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "deleted agent";

  const create = async () => {
    setErr(null);
    try {
      const key = newKey();
      await add.mutateAsync({ name: name.trim(), prefix: key.slice(0, 10), key_hash: await sha256Hex(key), agent_ids: picked });
      setPlain(key); setName(""); setPicked([]);
    } catch { setErr("The key could not be created. Try again."); }
  };

  return (
    <>
      <PageTitle code="SYS-01 // API KEYS" title="Personal API Keys" />
      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        <Panel title="New key">
          <label className="label-mono">Name</label>
          <input className={input + " mt-1"} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier triage flow" />
          <div className="label-mono mt-4">Agents this key may use</div>
          {agents.length === 0 ? <p className="text-sm text-muted-foreground mt-1">Create an agent first.</p> : (
            <ul className="mt-2 space-y-1">{agents.map((a) => (
              <li key={a.id}><label className="flex gap-2 text-sm items-center">
                <input type="checkbox" className="accent-primary" checked={picked.includes(a.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, a.id] : picked.filter((x) => x !== a.id))} />
                {a.name} <span className="text-muted-foreground text-xs">{a.role}</span></label></li>))}</ul>
          )}
          <p className="text-xs text-muted-foreground mt-3">Keys can only send messages to the agents you tick. They cannot read your cases, notes, conversations or account.</p>
          <button className={btn + " mt-3 w-full justify-center"} disabled={!name.trim() || picked.length === 0 || add.isPending} onClick={() => void create()}>{add.isPending ? "Creating…" : "Create key"}</button>
          {err && <p role="alert" className="text-sm text-destructive mt-2">{err}</p>}
          {plain && (
            <div className="mt-4 border border-warning/60 rounded-sm p-3">
              <div className="label-mono text-warning">Copy now — shown only once</div>
              <code className="block font-mono text-xs break-all mt-2">{plain}</code>
              <div className="flex gap-2 mt-2">
                <button className={btnGhost} onClick={() => void navigator.clipboard.writeText(plain)}>Copy</button>
                <button className={btnGhost} onClick={() => setPlain(null)}>Done</button>
              </div>
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title={`${keys.length} keys`}>
            {keys.length === 0 ? <p className="text-sm text-muted-foreground">No keys yet.</p> : (
              <ul className="divide-y">{keys.map((k) => (
                <li key={k.id} className="py-2 flex justify-between gap-3 items-start">
                  <div>
                    <div className="text-sm">{k.name} <span className="font-mono text-xs text-muted-foreground">{k.prefix}…</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5">Agents: {k.agent_ids.map(agentName).join(", ")}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</div>
                  </div>
                  {k.revoked_at ? <span className="font-mono text-xs text-destructive">REVOKED</span> :
                    <button className={btnGhost} disabled={revoke.isPending} onClick={() => revoke.mutate(k.id)}>Revoke</button>}
                </li>))}</ul>
            )}
          </Panel>
          <Panel title="How to call an agent">
            <pre className="font-mono text-xs whitespace-pre-wrap bg-secondary p-3 rounded-sm">{`curl -X POST ${origin}/api/public/agents/invoke \\
  -H "Authorization: Bearer eak_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":"AGENT_ID","message":"Summarize these alerts…"}'`}</pre>
            <p className="text-xs text-muted-foreground mt-2">The reply streams back as plain text. Agent IDs:</p>
            <ul className="font-mono text-xs mt-1 space-y-0.5">{agents.map((a) => <li key={a.id}>{a.name}: {a.id}</li>)}</ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
