import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageTitle, Panel, btn, btnGhost } from "@/components/soc/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/trading")({
  head: () => ({ meta: [{ title: "Trading Intelligence — Eager AI" }, { name: "description", content: "Read-only brokerage connection and trade analytics." }] }),
  component: TradingPage,
});

type Trade = { date: string; symbol: string; side: string; pnl: number; raw: Record<string, string> };
type BrokerAccount = { id: string; name: string; institution: string; currency: string; type: string };
type Activity = { date: string; type: string; symbol: string; quantity: unknown; amount: unknown; currency: string };
type ConnectorStatus = { configured: boolean; connected: boolean; provider?: string; permission?: string; reason?: string };

const number = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[,$%\\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const normalize = (v: string) => v.trim().toLowerCase().replace(/[ _-]/g, "");

function parseCsv(text: string): Trade[] {
  const lines = text.replace(/^\\uFEFF/, "").split(/\\r?\\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const parseLine = (line: string) => {
    const out: string[] = []; let cell = ""; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { out.push(cell.trim()); cell = ""; }
      else cell += ch;
    }
    out.push(cell.trim()); return out;
  };
  const headers = parseLine(lines[0]!).map(normalize);
  const find = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const pnlIdx = find("pnl", "profit", "netpnl", "realizedpnl", "profitloss", "pl");
  const symbolIdx = find("symbol", "ticker", "instrument", "asset");
  const dateIdx = find("date", "time", "datetime", "opentime", "closedat");
  const sideIdx = find("side", "direction", "type");
  if (pnlIdx < 0) return [];
  return lines.slice(1).map((line) => {
    const cells = parseLine(line); const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = cells[i] ?? ""; });
    return { date: dateIdx >= 0 ? cells[dateIdx] ?? "" : "", symbol: symbolIdx >= 0 ? cells[symbolIdx] ?? "Unknown" : "Unknown", side: sideIdx >= 0 ? cells[sideIdx] ?? "" : "", pnl: number(cells[pnlIdx]), raw };
  }).filter((t) => Object.values(t.raw).some(Boolean));
}

function TradingPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [showRows, setShowRows] = useState(false);
  const [connector, setConnector] = useState<ConnectorStatus | null>(null);
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const apiFetch = async (url: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Your session has expired. Sign in again.");
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
  };

  async function refreshConnection() {
    try {
      const statusResponse = await apiFetch("/api/trading/status");
      const status = await statusResponse.json() as ConnectorStatus;
      setConnector(status);
      if (status.connected) {
        const accountResponse = await apiFetch("/api/trading/accounts");
        const result = await accountResponse.json() as { accounts?: BrokerAccount[]; error?: string };
        if (!accountResponse.ok) throw new Error(result.error ?? "Could not load accounts.");
        setAccounts(result.accounts ?? []);
        if (result.accounts?.length) setSelectedAccount((old) => result.accounts!.some((a) => a.id === old) ? old : result.accounts![0]!.id);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not check broker connection."); }
  }

  useEffect(() => { void refreshConnection(); }, []);

  async function connectBroker() {
    setBusy(true); setMessage("");
    try {
      const response = await apiFetch("/api/trading/connect", { method: "POST", body: JSON.stringify({ permission: "read-only" }) });
      const result = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !result.redirectUrl) throw new Error(result.error ?? "Could not start the connection.");
      window.location.assign(result.redirectUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start the broker connection."); setBusy(false); }
  }

  async function loadActivities() {
    if (!selectedAccount) return;
    setBusy(true); setMessage("");
    try {
      const response = await apiFetch("/api/trading/activities", { method: "POST", body: JSON.stringify({ accountId: selectedAccount }) });
      const result = await response.json() as { activities?: Activity[]; error?: string; freshness?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load account activity.");
      setActivities(result.activities ?? []);
      setMessage(`Loaded ${result.activities?.length ?? 0} recent account activities. ${result.freshness ?? ""}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load account activity."); }
    finally { setBusy(false); }
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setMessage("Please export your trade history as a CSV file."); return; }
    const parsed = parseCsv(await file.text());
    if (!parsed.length) { setMessage("No trades imported. The CSV needs a P&L/Profit column (for example: date,symbol,side,pnl)."); return; }
    setTrades(parsed); setFileName(file.name); setMessage(`Imported ${parsed.length} rows locally in this browser session.`);
  }
  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const net = trades.reduce((sum, t) => sum + t.pnl, 0);
    return { count: trades.length, wins: wins.length, losses: losses.length, net, winRate: trades.length ? wins.length / trades.length * 100 : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, avg: trades.length ? net / trades.length : 0 };
  }, [trades]);
  const money = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

  return <>
    <PageTitle code="FIN-01 // TRADE ANALYTICS" title="Trading Intelligence">
      <label className={btn + " cursor-pointer"}>Import trade CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])} /></label>
    </PageTitle>
    <div className="border border-warning/40 bg-warning/5 p-3 rounded-md text-sm mb-4"><strong>Read-only safeguards:</strong> Eager AI requests read access only. It cannot place, edit, or cancel orders. Your broker password is entered only in the provider’s authorization portal, never in Eager AI.</div>
    {message && <p role="status" className="text-sm mb-4 text-muted-foreground">{message}</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      {[[ "CSV trades analyzed", String(stats.count) ], [ "CSV net P&L", money(stats.net) ], [ "CSV win rate", stats.count ? stats.winRate.toFixed(1) + "%" : "—" ], [ "CSV profit factor", stats.count ? (Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞") : "—" ]].map(([label, value]) => <div key={label} className="border bg-card rounded-md p-4"><div className="label-mono">{label}</div><div className="text-2xl font-mono font-semibold mt-2">{value}</div></div>)}
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="Broker connection" action={<span className="label-mono">{connector?.connected ? "CONNECTED" : connector?.configured ? "READY TO CONNECT" : "SETUP REQUIRED"}</span>}>
        <p className="text-sm text-muted-foreground mb-3">Connect through SnapTrade’s official brokerage portal. Broker availability depends on the provider and region; only read permissions are requested.</p>
        <div className="border rounded-sm p-3 mb-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Connector</span><span>{connector?.provider ?? "SnapTrade"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Permission mode</span><span>Read-only</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Connection state</span><span>{connector?.connected ? "Connected" : connector?.configured ? "Not connected" : "Server setup needed"}</span></div>
        </div>
        <button className={btn} disabled={busy || !connector?.configured} onClick={() => void connectBroker()}>{busy ? "Working…" : connector?.connected ? "Connect another / reconnect" : "Connect trading account"}</button>
        {!connector?.configured && <p className="text-xs text-muted-foreground mt-3">The server administrator must configure SnapTrade credentials, apply the included database migration, and set the encryption key before live account connections can start.</p>}
        {accounts.length > 0 && <div className="mt-4 space-y-2"><label className="label-mono block" htmlFor="broker-account">CONNECTED ACCOUNTS</label><select id="broker-account" className="w-full border rounded-sm bg-background p-2 text-sm" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.institution} · {a.name} · {a.currency}</option>)}</select><button className={btnGhost} disabled={busy || !selectedAccount} onClick={() => void loadActivities()}>{busy ? "Loading…" : "Read account activity"}</button></div>}
      </Panel>
      <Panel title="Recent account activity" action={<span className="label-mono">READ-ONLY DATA</span>}>
        {activities.length ? <div className="max-h-80 overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Date</th><th className="p-2">Type / Symbol</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{activities.map((a, i) => <tr key={i} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{a.date || "—"}</td><td className="p-2"><div>{a.type}</div><div className="text-xs text-muted-foreground">{a.symbol}</div></td><td className="p-2 text-right whitespace-nowrap">{a.amount == null ? "—" : String(a.amount) + (a.currency ? " " + a.currency : "")}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Once a broker is connected, select an account to read its available account activity. Activity records are not the same as realized trade P&L, so use your broker’s trade export for the P&L summary.</p>}
      </Panel>
    </div>
    {trades.length > 0 && <Panel title="Imported trade rows" className="mt-4" action={<span className="label-mono">{fileName}</span>}>
      <div className="flex flex-wrap gap-4 text-sm mb-3"><span>Wins: {stats.wins}</span><span>Losses: {stats.losses}</span><span>Average P&L: {money(stats.avg)}</span><button className="text-primary underline" onClick={() => setShowRows(!showRows)}>{showRows ? "Hide rows" : "Review rows"}</button></div>
      {showRows && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Date</th><th className="p-2">Symbol</th><th className="p-2">Side</th><th className="p-2 text-right">P&L</th></tr></thead><tbody>{trades.map((t, i) => <tr key={i} className="border-b last:border-0"><td className="p-2">{t.date || "—"}</td><td className="p-2">{t.symbol}</td><td className="p-2">{t.side || "—"}</td><td className={"p-2 text-right font-mono " + (t.pnl >= 0 ? "text-success" : "text-destructive")}>{money(t.pnl)}</td></tr>)}</tbody></table></div>}
    </Panel>}
    <p className="text-xs text-muted-foreground mt-4">Analytics are descriptive, not financial advice. Some broker activity feeds may be delayed and may not include realized P&L. Verify currency and field definitions before making decisions.</p>
  </>;
}
