import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, input } from "@/components/soc/Shell";
import { indicators, sevClass } from "@/lib/soc-data";

export const Route = createFileRoute("/indicators")({
  head: () => ({
    meta: [
      { title: "Indicators — Eager AI Command Center" },
      { name: "description", content: "Indicators of compromise linked to cases." },
      { property: "og:title", content: "Indicators — Eager AI Command Center" },
      { property: "og:description", content: "Indicators of compromise linked to cases." },
    ],
  }),
  component: IndicatorsPage,
});

function IndicatorsPage() {
  const [q, setQ] = useState("");
  const rows = indicators.filter((i) => (i.value + i.type).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageTitle code="SEC-14 // INDICATORS" title="Indicators of Compromise">
        <input className={input + " w-64"} placeholder="Filter indicators…" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageTitle>
      <Panel title={`${rows.length} indicators`}>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead><tr className="text-left text-muted-foreground border-b">{["Type", "Value", "Severity", "Case", "First seen"].map((h) => <th key={h} className="py-2 pr-4 font-normal uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>{rows.map((i) => (
              <tr key={i.value} className="border-b last:border-0 hover:bg-secondary">
                <td className="py-2 pr-4 text-info">{i.type}</td><td className="pr-4">{i.value}</td>
                <td className="pr-4"><span className={`border px-1.5 uppercase ${sevClass[i.sev]}`}>{i.sev}</span></td>
                <td className="pr-4 text-muted-foreground">{i.caseId}</td><td className="text-muted-foreground">{i.first}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
