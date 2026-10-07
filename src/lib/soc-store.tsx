import { createContext, useContext, useState, type ReactNode } from "react";
import { seedAgents, seedCases, type Agent, type Case } from "./soc-data";

interface Store {
  cases: Case[]; agents: Agent[];
  addCase: (c: Case) => void;
  logAudit: (id: string, action: string) => void;
  addAgent: (a: Agent) => void;
}
const Ctx = createContext<Store | null>(null);

export function SocProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState(seedCases);
  const [agents, setAgents] = useState(seedAgents);
  const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");
  return (
    <Ctx.Provider value={{
      cases, agents,
      addCase: (c) => setCases((p) => [c, ...p]),
      addAgent: (a) => setAgents((p) => [...p, a]),
      logAudit: (id, action) => setCases((p) => p.map((c) => c.id === id ? { ...c, audit: [{ at: now(), actor: "A. Kamara", action }, ...c.audit] } : c)),
    }}>{children}</Ctx.Provider>
  );
}
export const useSoc = () => { const v = useContext(Ctx); if (!v) throw new Error("SocProvider missing"); return v; };
