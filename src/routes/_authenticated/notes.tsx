import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageTitle, btn, input } from "@/components/soc/Shell";
import { useDelete, useInsert, useNotes } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [
    { title: "Notes — Eager AI" }, { name: "description", content: "Save findings and important answers as notes." },
    { property: "og:title", content: "Notes — Eager AI" }, { property: "og:description", content: "Save findings and important answers as notes." },
  ] }),
  component: Page,
});

function Page() {
  const { data = [] } = useNotes();
  const add = useInsert("notes", ["notes"]);
  const del = useDelete("notes", ["notes"]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  return (
    <>
      <PageTitle code="WS-02 // NOTES" title="Notes" />
      <div className="border bg-card rounded-md p-3 mb-4 space-y-2">
        <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={input + " h-24"} placeholder="Write a note…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className={btn} disabled={!title} onClick={async () => { await add.mutateAsync({ title, body }); setTitle(""); setBody(""); }}>Save note</button>
      </div>
      {data.length === 0 ? <Empty>No notes yet.</Empty> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.map((n) => (
            <div key={n.id} className="border bg-card rounded-md p-4">
              <div className="font-semibold">{n.title}</div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
              <button className="mt-3 font-mono text-xs text-destructive" onClick={() => del.mutate(n.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
