import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { btn, btnGhost, input } from "@/components/soc/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Eager AI" },
      { name: "description", content: "Sign in to the Eager AI workspace and intelligence command center." },
      { property: "og:title", content: "Sign in — Eager AI" },
      { property: "og:description", content: "Sign in to the Eager AI workspace and intelligence command center." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) nav({ to: "/" }); });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Check your email to confirm your account.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg(r.error.message);
  };

  return (
    <div className="min-h-screen grid place-items-center grid-bg px-4">
      <div className="w-full max-w-sm border bg-card rounded-md p-6">
        <div className="font-mono text-sm font-bold text-primary">EAGER//AI</div>
        <h1 className="text-xl font-semibold mt-2">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Authorized use only.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className={btn + " w-full justify-center"} disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</button>
        </form>
        <button className={btnGhost + " w-full justify-center mt-2"} onClick={google}>Continue with Google</button>
        {msg && <p className="text-sm text-warning mt-3">{msg}</p>}
        <button className="mt-4 text-xs text-muted-foreground hover:text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
