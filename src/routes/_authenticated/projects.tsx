import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageTitle, btn, input } from "@/components/soc/Shell";
import { useDelete, useInsert, useProjects } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [
    { title: "Projects — Eager AI" }, { name: "description", content: "Organize your work into projects." },
    { property: "og:title", content: "Projects — Eager AI" }, { property: "og:description", content: "Organize your work into projects." },
  ] }),
  component: Page,
});

function Page() {
  const { data = [] } = useProjects();
  const add = useInsert("projects", ["projects"]);
  const del = useDelete("projects", ["projects"]);
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  return (
    <>
      <PageTitle code="WS-01 // PROJECTS" title="Projects" />
      <div className="flex flex-wrap gap-2 mb-4">
        <input className={input + " max-w-xs"} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input + " max-w-md"} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className={btn} disabled={!name} onClick={async () => { await add.mutateAsync({ name, description: desc }); setName(""); setDesc(""); }}>Add</button>
      </div>
      {data.length === 0 ? <Empty>No projects yet.</Empty> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((p) => (
            <div key={p.id} className="border bg-card rounded-md p-4">
              <div className="flex justify-between"><div className="font-semibold">{p.name}</div><span className="font-mono text-xs text-success">{p.status}</span></div>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <button className="mt-3 font-mono text-xs text-destructive" onClick={() => del.mutate(p.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
