import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const stats = [
  { label: "Active agents", value: "48" },
  { label: "Research saved", value: "1.2k" },
  { label: "Tasks automated", value: "860" },
  { label: "Uptime", value: "99.9%" },
];

const features = [
  { title: "AI Agents", description: "Deploy specialists for research, academia, coding, operations, and strategy." },
  { title: "Research Workspace", description: "Track sources, build evidence maps, compare findings, and cite uncertainty clearly." },
  { title: "Project Control", description: "Coordinate deliverables, tasks, notes, and files in one shared workspace." },
  { title: "Knowledge Library", description: "Turn documents, notes, and sources into reusable knowledge bases." },
  { title: "Academic Systems", description: "Organize subjects, courses, assignments, flashcards, and study planning." },
  { title: "Automation", description: "Trigger workflows when files arrive, tasks change, or research is completed." },
];

const workflow = [
  "Research brief",
  "Documents & sources",
  "Agent planning",
  "Project execution",
  "Approval & delivery",
];

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For solo exploration and lightweight knowledge work.",
    features: ["3 agents", "30 GB storage", "Basic research", "Limited automations"],
  },
  {
    name: "Pro",
    price: "$29",
    description: "For high-output teams and advanced workflows.",
    features: ["Unlimited agents", "Advanced research", "Priority execution", "Custom knowledge bases"],
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    description: "For distributed teams with governance and shared context.",
    features: ["Team workspaces", "Shared knowledge", "Role permissions", "Admin insights"],
  },
];

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Eager AI — Your AI Team. One Workspace." },
      { name: "description", content: "Build and orchestrate AI agents, research, projects, notes, and knowledge in one workspace." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs font-bold tracking-[0.18em] text-primary">
              EAGER//AI
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#platform" className="transition hover:text-foreground">Platform</a>
            <a href="#agents" className="transition hover:text-foreground">Agents</a>
            <a href="#research" className="transition hover:text-foreground">Research</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground transition hover:text-foreground">
              Sign in
            </Link>
            <Link to="/auth">
              <Button size="lg">Start Building</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <section className="grid items-center gap-10 pb-12 pt-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              AI operations for modern teams
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI team. <span className="text-primary">One workspace.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Create intelligent agents that research, organize, analyze, build, study, and help your team move from ideas to execution.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg">Start Building</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Explore Agents
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Research</span>
              <span>Projects</span>
              <span>Knowledge</span>
              <span>Academic</span>
              <span>Code</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
                  <div className="mt-1 text-lg font-semibold">Agent command center</div>
                </div>
                <div className="rounded-full border border-success/40 bg-success/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-success">
                  Live
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {workflow.map((step, idx) => (
                  <div key={step} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-sm text-foreground">{step}</div>
                    <div className="h-2.5 w-2.5 rounded-full bg-success" />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Priority</div>
                  <div className="mt-2 text-2xl font-semibold text-primary">12</div>
                  <div className="text-xs text-muted-foreground">Open tasks</div>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Insights</div>
                  <div className="mt-2 text-2xl font-semibold text-primary">8</div>
                  <div className="text-xs text-muted-foreground">Key findings</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-y border-border py-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-3xl font-semibold text-primary">{item.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </section>

        <section id="platform" className="py-20">
          <div className="mb-8 max-w-2xl">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">Platform</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything your AI team needs to move faster.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full border-border bg-card/70">
                <CardHeader>
                  <div className="mb-3 h-10 w-10 rounded-md bg-primary/10" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-6 text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="agents" className="grid gap-6 pb-20 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">AI agents</div>
            <h3 className="mt-3 text-3xl font-semibold">Specialized roles without the chaos.</h3>
            <p className="mt-4 text-muted-foreground">
              Give each agent a role, memory, capability set, and access boundaries. Keep humans in control while the system executes at speed.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Research Analyst",
                "Academic Tutor",
                "Project Manager",
                "Coding Agent",
                "Business Assistant",
                "Document Analyst",
              ].map((agent) => (
                <span key={agent} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-foreground">
                  {agent}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Research", text: "Gather evidence, classify sources, and surface contradictions." },
              { title: "Academic", text: "Turn lecture material into structured learning systems." },
              { title: "Projects", text: "Track tasks, risks, blockers, and project momentum." },
              { title: "Code", text: "Explain, debug, review, and generate production code safely." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">{item.title}</div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="research" className="pb-20">
          <div className="mb-8 max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Research</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Organize facts, references, and decisions with confidence.</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              "Source collection with credibility indicators",
              "Evidence maps and contradiction tracking",
              "Reports, findings, and safe decision support",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="pb-20">
          <div className="mb-8 max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Choose the plan that matches your workflow.</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`${plan.featured ? "border-primary bg-primary/5" : "border-border bg-card"} rounded-2xl border p-6`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.featured && (
                    <span className="rounded-full border border-primary bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-primary">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>

                <ul className="mt-5 space-y-3 text-sm text-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Link to="/auth">
                    <Button className="w-full" variant={plan.featured ? "default" : "outline"}>
                      Get started
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
