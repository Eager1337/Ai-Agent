import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { PageTitle, Panel, btnGhost } from "@/components/soc/Shell";
import { MODULES } from "@/lib/soc-data";
import { useSoc } from "@/lib/soc-store";

export const Route = createFileRoute("/m/$module")({
  loader: ({ params }) => {
    const mod = MODULES.find((m) => m.slug === params.module);
    if (!mod) throw notFound();
    return { mod: { ...mod } };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.mod.name} — Eager AI Command Center` : "Not found";
    const d = loaderData?.mod.desc ?? "Module not found";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  notFoundComponent: () => <div className="p-6">Module not found. <Link to="/" className="text-primary">Back</Link></div>,
  component: ModulePage,
});

function ModulePage() {
  const { mod } = Route.useLoaderData();
  const { cases } = useSoc();
  const idx = MODULES.findIndex((m) => m.slug === mod.slug) + 2;
  return (
    <>
      <PageTitle code={`SEC-${String(idx).padStart(2, "0")} // ${mod.name.toUpperCase()}`} title={mod.name} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Module brief" className="lg:col-span-2">
          <p className="text-sm">{mod.desc}</p>
          <p className="text-sm text-muted-foreground mt-3">Every operation in this module runs inside an authorized case. Select a case to begin.</p>
        </Panel>
        <Panel title="Attach to case">
          <ul className="space-y-2">
            {cases.filter((c) => c.status !== "Closed").map((c) => (
              <li key={c.id}><Link to="/cases" className={btnGhost + " w-full justify-between"}><span>{c.id}</span><span className="text-muted-foreground normal-case">{c.authorization}</span></Link></li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
