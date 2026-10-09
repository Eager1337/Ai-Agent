import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btn, btnGhost, input } from "@/components/soc/Shell";

const OWNER_EMAIL = "ebeaver091@gmail.com";
const AFRIMONEY_NUMBER = "033695803";
const plans = [
  { name: "Starter", price: "NLe 50", period: "per month", detail: "Core AI workspace" },
  { name: "Pro", price: "NLe 150", period: "per month", detail: "AI workspace, trading analytics and cyber training" },
  { name: "Annual Pro", price: "NLe 1,200", period: "per year", detail: "Pro access for 12 months" },
];

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Eager AI" }, { name: "description", content: "Private Eager AI workspace sign-in and service pricing." }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive || !data.session) return;
      const user = data.session.user;
      if (user.email?.toLowerCase() === OWNER_EMAIL || user.app_metadata?.paid_access === true) {
        nav({ to: "/dashboard", replace: true });
      } else {
        await supabase.auth.signOut();
        if (alive) setShowPrices(true);
      }
    });
    return () => { alive = false; };
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "up") {
        if (normalizedEmail === OWNER_EMAIL) {
          setMessage("The owner account already has a reserved identity. Sign in instead.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Account request created, but workspace access stays locked until your payment is verified and the owner activates paid access. Keep your Afrimoney transaction reference.");
          setShowPrices(true);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) {
        setMessage(normalizedEmail === OWNER_EMAIL
          ? "Owner sign-in failed. Confirm that this email and password are set in the connected Supabase Auth project."
          : "Man, come on — you gotta pay for the services. Choose a plan below and pay with Afrimoney.");
        setShowPrices(normalizedEmail !== OWNER_EMAIL);
        return;
      }
      const isOwner = data.user.email?.toLowerCase() === OWNER_EMAIL;
      const hasPaidAccess = data.user.app_metadata?.paid_access === true;
      if (isOwner || hasPaidAccess) {
        nav({ to: "/dashboard", replace: true });
      } else {
        await supabase.auth.signOut();
        setMessage("Payment is required before you can use the workspace. After paying, keep your transaction reference and contact the owner for verification and activation.");
        setShowPrices(true);
      }
    } catch {
      setMessage("We could not complete that request. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center grid-bg px-4 py-8">
      <div className="w-full max-w-2xl border bg-card rounded-md p-6">
        <div className="font-mono text-sm font-bold text-primary">EAGER//AI</div>
        <h1 className="text-2xl font-semibold mt-3">Private workspace</h1>
        <p className="text-sm text-muted-foreground mt-2">The owner account is free. All other accounts require a paid plan and verified payment before access is activated.</p>
        <div className="flex gap-2 mt-5">
          <button type="button" className={mode === "in" ? btn : btnGhost} onClick={() => { setMode("in"); setMessage(""); }}>Sign in</button>
          <button type="button" className={mode === "up" ? btn : btnGhost} onClick={() => { setMode("up"); setShowPrices(true); setMessage("Create an account request after reviewing the plans. Account creation does not unlock access."); }}>Create account</button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm">Email
            <input className={input + " mt-1"} type="email" required autoComplete="username" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">Password
            <input className={input + " mt-1"} type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Your account password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className={btn + " w-full justify-center"} disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account request"}</button>
        </form>
        {message && <div role="status" className="mt-4 border rounded-md p-3 text-sm">{message}</div>}
        {showPrices && <section className="mt-6">
          <h2 className="font-semibold">Service prices</h2>
          <p className="text-xs text-muted-foreground mt-1">Prices are shown in new Sierra Leone leones (NLe).</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {plans.map(p => <div key={p.name} className="border rounded-md p-3">
              <div className="label-mono">{p.name}</div><div className="text-xl font-semibold mt-2">{p.price}</div>
              <div className="text-xs text-muted-foreground">{p.period}</div><p className="text-xs mt-2">{p.detail}</p>
            </div>)}
          </div>
          <div className="border rounded-md p-4 mt-3">
            <div className="font-medium">Afrimoney payment</div>
            <div className="font-mono text-xl mt-1">{AFRIMONEY_NUMBER}</div>
            <p className="text-sm mt-2">Pay the exact amount for your chosen plan, keep your transaction reference, and contact the workspace owner to verify payment and activate your account. Never share your wallet PIN.</p>
            <p className="text-xs text-muted-foreground mt-2">Automatic Afrimoney confirmation is not configured. Payment alone will not unlock the workspace until verified and activated by the owner.</p>
            <a className="text-sm text-primary underline inline-block mt-2" href="https://www.africell.sl/afrimoney_services/merchant-payments/" target="_blank" rel="noreferrer">Official Afrimoney merchant payment information</a>
          </div>
        </section>}
        <p className="text-xs text-muted-foreground mt-5">Passwords are validated by Supabase Auth and are never embedded in frontend source code. Change any password shared in a chat.</p>
      </div>
    </div>
  );
}
