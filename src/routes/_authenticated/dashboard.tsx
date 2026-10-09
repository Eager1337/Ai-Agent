import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle, Panel } from "@/components/soc/Shell";
import { alerts, indicators, labs, sevClass, timeline } from "@/lib/soc-data";
import { useCases, useAgents } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Eager AI Command Center" },
      { name: "description", content: "Live view of cases, alerts, indicators and agent activity." },
      { property: "og:title", content: "Overview — Eager AI Command Center" },
      { property: "og:description", content: "Live view of cases, alerts, indicators and agent activity." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data: cases = [] } = useCases(); const { data: agents = [] } = useAgents();
  const stats = [
    { k: "Active cases", v: cases.filter((c) => c.status !== "Closed").length },
    { k: "Open investigations", v: cases.filter((c) => c.status !== "Closed").length },
    { k: "Evidence indexed", v: 0 },
    { k: "Sample indicators", v: indicators.length },
  ];
  return (
    <>
      <PageTitle code="SEC-00 // OVERVIEW" title="Command Overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.k} className="border bg-card rounded-md p-4">
            <div className="label-mono">{s.k}</div>
            <div className="font-mono text-3xl font-bold mt-2 text-primary">{String(s.v).padStart(2, "0")}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Recent alerts" className="lg:col-span-2" action={<span className="font-mono text-xs text-muted-foreground">DEMO ALERT FEED</span>}>
          <ul className="divide-y font-mono text-xs">
            {alerts.map((a) => (
              <li key={a.t} className="flex items-center gap-3 py-2">
                <span className="text-muted-foreground">{a.t}</span>
                <span className={`border px-1.5 uppercase ${sevClass[a.sev]}`}>{a.sev}</span>
                <span className="text-muted-foreground w-14">{a.src}</span>
                <span className="text-foreground font-sans text-sm truncate">{a.msg}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Agent activity">
          <ul className="space-y-3">
            {agents.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-primary">{a.name}</span>
                  <span className={"text-muted-foreground"}>{a.role}</span>
                </div>
                <div className="text-muted-foreground">{a.instructions || "Ready"}</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Active cases" className="lg:col-span-2" action={<Link to="/cases" className="font-mono text-xs text-primary">ALL →</Link>}>
          <ul className="divide-y">
            {cases.slice(0, 4).map((c) => (
              <li key={c.id} className="py-2 flex justify-between gap-3 text-sm">
                <div><span className="font-mono text-xs text-muted-foreground mr-2">{c.code}</span>{c.name}</div>
                <span className="font-mono text-xs text-info shrink-0">{c.authorization_status}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Lab status">
          <ul className="space-y-2 text-sm">
            {labs.map((l) => (
              <li key={l.name} className="flex justify-between"><span>{l.name}</span>
                <span className={`font-mono text-xs ${l.status === "running" ? "text-success" : "text-muted-foreground"}`}>{l.status}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Investigation timeline" className="lg:col-span-2">
          <ol className="border-l ml-1">
            {timeline.slice(0, 4).map((e) => (
              <li key={e.t} className="pl-4 pb-3 relative text-sm">
                <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
                <div className="font-mono text-xs text-muted-foreground">{e.t} · {e.caseId}</div>{e.text}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Threat intelligence">
          <p className="text-sm">Sample threat-intelligence scenario for training. Validate against trusted sources before treating as a real-world incident.</p>
          <div className="mt-2 font-mono text-xs text-warning">SIMULATED SCENARIO · ATT&CK REFERENCES</div>
        </Panel>
      </div>
    </>
  );
}
