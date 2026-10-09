import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Panel } from "@/components/soc/Shell";
import { timeline } from "@/lib/soc-data";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Eager AI Command Center" },
      { name: "description", content: "Chronological record of investigation events across cases." },
      { property: "og:title", content: "Timeline — Eager AI Command Center" },
      { property: "og:description", content: "Chronological record of investigation events across cases." },
    ],
  }),
  component: () => (
    <>
      <PageTitle code="SEC-13 // TIMELINE" title="Investigation Timeline"><span className="border border-warning/40 bg-warning/5 rounded-sm px-2 py-1 font-mono text-[10px] text-warning">SIMULATED LAB DATA</span></PageTitle>
      <Panel title="Sample events">
        <p className="text-xs text-muted-foreground mb-3">Illustrative events for interface preview only. These entries are not connected to a live SIEM or case event stream.</p>
        <ol className="border-l ml-1">
          {timeline.map((e) => (
            <li key={e.t} className="pl-5 pb-5 relative">
              <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
              <div className="font-mono text-xs text-muted-foreground">{e.t} · <span className="text-info">{e.caseId}</span></div>
              <div className="mt-0.5">{e.text}</div>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  ),
});
