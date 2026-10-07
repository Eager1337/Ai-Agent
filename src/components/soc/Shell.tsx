import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MODULES } from "@/lib/soc-data";

const core = [
  { to: "/", label: "Overview" },
  { to: "/cases", label: "Cases" },
  { to: "/indicators", label: "Indicators" },
  { to: "/timeline", label: "Timeline" },
  { to: "/agents", label: "Agent Team" },
] as const;

const linkCls = "block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border-l-2 border-transparent";
const activeCls = "!text-accent-foreground !border-primary bg-accent";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-panel">
        <div className="px-4 py-4 border-b">
          <div className="font-mono text-sm font-bold text-primary">EAGER//AI</div>
          <div className="label-mono mt-1">Intel Command Center</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="label-mono px-3 pb-1">Command</div>
          {core.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls} activeProps={{ className: activeCls }} activeOptions={{ exact: l.to === "/" }}>{l.label}</Link>
          ))}
          <div className="label-mono px-3 pb-1 pt-4">Modules</div>
          {MODULES.map((m) => (
            <Link key={m.slug} to="/m/$module" params={{ module: m.slug }} className={linkCls} activeProps={{ className: activeCls }}>{m.name}</Link>
          ))}
        </nav>
        <div className="border-t p-3 font-mono text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-success live-dot mr-2" />Authorized use only
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-panel">
          <div className="md:hidden font-mono text-sm font-bold text-primary">EAGER//AI</div>
          <div className="hidden md:block label-mono">Analyst: A. Kamara · Shift: Night</div>
          <div className="font-mono text-xs text-muted-foreground">UTC {new Date().toISOString().slice(0, 10)}</div>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b px-2 py-1 bg-panel">
          {core.map((l) => <Link key={l.to} to={l.to} className="px-2 py-1 text-xs whitespace-nowrap text-muted-foreground" activeProps={{ className: "!text-primary" }} activeOptions={{ exact: l.to === "/" }}>{l.label}</Link>)}
        </nav>
        <main className="flex-1 p-4 md:p-6 grid-bg">{children}</main>
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border bg-card rounded-md ${className}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="label-mono">{title}</h2>{action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function PageTitle({ code, title, children }: { code: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><div className="label-mono text-primary">{code}</div><h1 className="text-2xl font-semibold mt-1">{title}</h1></div>
      {children}
    </div>
  );
}

export const btn = "inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-40";
export const btnGhost = "inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-secondary";
export const input = "w-full rounded-sm border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary";
