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
  const { data = [], isLoading, error } = useNotes();
  const add = useInsert("notes", ["notes"]);
  const del = useDelete("notes", ["notes"]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  return (
    <>
      <PageTitle code="WS-02 // NOTES" title="Notes" />
      {error && <p role="alert" className="border border-destructive/40 p-3 mb-4 text-sm text-destructive">Notes could not be loaded. Check your sign-in and database permissions.</p>}
      {formError && <p role="alert" className="border border-destructive/40 p-3 mb-4 text-sm text-destructive">{formError}</p>}
      {del.error && <p role="alert" className="text-sm text-destructive mb-3">Could not delete the note. Try again.</p>}
      <div className="border bg-card rounded-md p-3 mb-4 space-y-2">
        <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={input + " h-24"} placeholder="Write a note…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className={btn} disabled={!title.trim() || add.isPending} onClick={async () => { setFormError(null); try { await add.mutateAsync({ title: title.trim(), body }); setTitle(""); setBody(""); } catch { setFormError("Could not save the note. Check your connection and try again."); } }}>{add.isPending ? "Saving…" : "Save note"}</button>
      </div>
      {isLoading ? <div className="h-24 animate-pulse bg-muted rounded-md" /> : data.length === 0 ? <Empty>No notes yet.</Empty> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.map((n) => (
            <div key={n.id} className="border bg-card rounded-md p-4">
              <div className="font-semibold">{n.title}</div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
              <button className="mt-3 font-mono text-xs text-destructive disabled:opacity-40" disabled={del.isPending} onClick={() => void del.mutateAsync(n.id).catch(() => undefined)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
