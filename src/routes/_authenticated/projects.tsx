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
  const { data = [], isLoading, error } = useProjects();
  const add = useInsert("projects", ["projects"]);
  const del = useDelete("projects", ["projects"]);
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  return (
    <>
      <PageTitle code="WS-01 // PROJECTS" title="Projects" />
      {error && <p role="alert" className="border border-destructive/40 p-3 mb-4 text-sm text-destructive">Projects could not be loaded. Check your sign-in and database permissions.</p>}
      {formError && <p role="alert" className="border border-destructive/40 p-3 mb-4 text-sm text-destructive">{formError}</p>}
      {add.error && <p role="alert" className="text-sm text-destructive mb-3">Could not create the project. Try again.</p>}
      {del.error && <p role="alert" className="text-sm text-destructive mb-3">Could not delete the project. Try again.</p>}
      <div className="flex flex-wrap gap-2 mb-4">
        <input className={input + " max-w-xs"} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input + " max-w-md"} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className={btn} disabled={!name.trim() || add.isPending} onClick={async () => { setFormError(null); try { await add.mutateAsync({ name: name.trim(), description: desc.trim() }); setName(""); setDesc(""); } catch { setFormError("Could not save the project. Check your connection and try again."); } }}>{add.isPending ? "Saving…" : "Add"}</button>
      </div>
      {isLoading ? <div className="h-24 animate-pulse bg-muted rounded-md" /> : data.length === 0 ? <Empty>No projects yet.</Empty> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((p) => (
            <div key={p.id} className="border bg-card rounded-md p-4">
              <div className="flex justify-between"><div className="font-semibold">{p.name}</div><span className="font-mono text-xs text-success">{p.status}</span></div>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <button className="mt-3 font-mono text-xs text-destructive disabled:opacity-40" disabled={del.isPending} onClick={() => void del.mutateAsync(p.id).catch(() => undefined)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
