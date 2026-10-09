import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageTitle, Panel, btn, btnGhost, input } from "@/components/soc/Shell";

export const Route = createFileRoute("/_authenticated/trading")({
  head: () => ({ meta: [{ title: "Trading Intelligence — Eager AI" }, { name: "description", content: "Private trade journal and risk analytics workspace." }] }),
  component: TradingPage,
});

type Trade = { date: string; symbol: string; side: string; pnl: number; raw: Record<string, string> };
const number = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const normalize = (v: string) => v.trim().toLowerCase().replace(/[ _-]/g, "");

function parseCsv(text: string): Trade[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
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
  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    return { count: trades.length, wins: wins.length, losses: losses.length, net: trades.reduce((sum, t) => sum + t.pnl, 0), winRate: trades.length ? wins.length / trades.length * 100 : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, avg: trades.length ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0 };
  }, [trades]);

  async function importFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setMessage("Please export your trade history as a CSV file."); return; }
    const parsed = parseCsv(await file.text());
    if (!parsed.length) { setMessage("No trades imported. The CSV needs a P&L/Profit column (for example: date,symbol,side,pnl)."); return; }
    setTrades(parsed); setFileName(file.name); setMessage(`Imported ${parsed.length} rows locally in this browser session.`);
  }
  const money = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

  return <>
    <PageTitle code="FIN-01 // TRADE ANALYTICS" title="Trading Intelligence">
      <label className={btn + " cursor-pointer"}>Import trade CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importFile(e.target.files?.[0])} /></label>
    </PageTitle>
    <div className="border border-warning/40 bg-warning/5 p-3 rounded-md text-sm mb-4"><strong>Privacy & permissions:</strong> This version analyzes a CSV you choose. No broker account is connected yet, and it cannot place, edit, or cancel orders. Never paste passwords, API secrets, or seed phrases into chat.</div>
    {message && <p role="status" className="text-sm mb-4 text-muted-foreground">{message}</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      {[["Trades analyzed", String(stats.count)], ["Net P&L", money(stats.net)], ["Win rate", stats.count ? stats.winRate.toFixed(1) + "%" : "—"], ["Profit factor", stats.count ? (Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞") : "—"]].map(([label, value]) => <div key={label} className="border bg-card rounded-md p-4"><div className="label-mono">{label}</div><div className="text-2xl font-mono font-semibold mt-2">{value}</div></div>)}
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="Account connections" action={<span className="label-mono">NOT CONNECTED</span>}>
        <p className="text-sm text-muted-foreground mb-3">Choose your broker/exchange so the correct official OAuth or read-only API integration can be built. Broker support and permissions vary.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {["MetaTrader 4 / 5", "Binance", "Bybit", "Interactive Brokers", "OANDA", "Other broker"].map((name) => <button key={name} className={btnGhost + " justify-start"} onClick={() => setMessage(`Selected ${name}. Live connection is not configured yet; use CSV import until its official secure connector is implemented.`)}>{name}<span className="ml-auto text-xs text-muted-foreground">Select</span></button>)}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Future live connectors must use the provider’s official authorization flow and minimum read-only permissions. Secrets belong in a protected server-side vault, never browser storage.</p>
      </Panel>
      <Panel title="Performance snapshot" action={<span className="label-mono">FROM IMPORTED DATA</span>}>
        {trades.length ? <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Winning trades</span><span>{stats.wins}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Losing trades</span><span>{stats.losses}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Average P&L per row</span><span>{money(stats.avg)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Imported file</span><span className="truncate ml-4 max-w-48">{fileName}</span></div>
          <button className={btnGhost} onClick={() => setShowRows(!showRows)}>{showRows ? "Hide imported rows" : "Review imported rows"}</button>
        </div> : <p className="text-sm text-muted-foreground">Import your broker’s trade-history CSV to calculate win rate, net P&L, profit factor, and average result. The data stays in this page’s browser session and is not uploaded by this feature.</p>}
      </Panel>
    </div>
    {showRows && <Panel title="Imported trades" className="mt-4"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Date</th><th className="p-2">Symbol</th><th className="p-2">Side</th><th className="p-2 text-right">P&L</th></tr></thead><tbody>{trades.map((t, i) => <tr key={i} className="border-b last:border-0"><td className="p-2">{t.date || "—"}</td><td className="p-2">{t.symbol}</td><td className="p-2">{t.side || "—"}</td><td className={"p-2 text-right font-mono " + (t.pnl >= 0 ? "text-success" : "text-destructive")}>{money(t.pnl)}</td></tr>)}</tbody></table></div></Panel>}
    <p className="text-xs text-muted-foreground mt-4">Analytics are descriptive, not financial advice. Confirm your broker’s CSV column definitions and account currency before relying on these calculations.</p>
  </>;
}
