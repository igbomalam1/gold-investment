import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Coins, Loader2 } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const TABS = ["All", "Deposits", "Withdrawals", "Investments"] as const;

export const Route = createFileRoute("/dashboard/history")({
  head: () => ({ meta: [{ title: "History — Gold Empire" }] }),
  component: HistoryPage,
});

type Row = { id: string; type: "deposit" | "withdrawal" | "investment"; amount: number; status: string; meta: string; date: string };

function HistoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]>("All");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: deps }, { data: wdrs }, { data: invs }] = await Promise.all([
        supabase.from("deposits").select("id, amount, status, token, network, created_at").eq("user_id", user.id),
        supabase.from("withdrawals").select("id, amount, status, token, created_at").eq("user_id", user.id),
        supabase.from("investments").select("id, amount, status, daily_roi_pct, created_at, plans(name)").eq("user_id", user.id),
      ]);
      const all: Row[] = [
        ...(deps || []).map((d: any) => ({ id: d.id, type: "deposit" as const, amount: Number(d.amount), status: d.status, meta: `${d.token} · ${d.network}`, date: d.created_at })),
        ...(wdrs || []).map((w: any) => ({ id: w.id, type: "withdrawal" as const, amount: Number(w.amount), status: w.status, meta: w.token, date: w.created_at })),
        ...(invs || []).map((i: any) => ({ id: i.id, type: "investment" as const, amount: Number(i.amount), status: i.status, meta: `${i.plans?.name} · ${i.daily_roi_pct}%/d`, date: i.created_at })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      setRows(all);
      setLoading(false);
    })();
  }, [user]);

  const filtered = rows.filter((t) => {
    if (tab === "All") return true;
    if (tab === "Deposits") return t.type === "deposit";
    if (tab === "Withdrawals") return t.type === "withdrawal";
    if (tab === "Investments") return t.type === "investment";
    return true;
  });

  const ICONS = { deposit: ArrowDownToLine, withdrawal: ArrowUpToLine, investment: Coins };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">All your activity, fully transparent.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === t ? "bg-gradient-gold text-primary-foreground shadow-gold" : "border border-border bg-background/40 text-foreground/80 hover:border-primary"
            }`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <div className="divide-y divide-border/50">
            {filtered.map((t) => {
              const Icon = ICONS[t.type];
              const sign = t.type === "withdrawal" || t.type === "investment" ? "-" : "+";
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Icon size={16} /></div>
                    <div>
                      <div className="text-sm font-semibold capitalize">{t.type} · {t.meta}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(t.date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{sign}{formatCurrency(t.amount)}</div>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      t.status === "received" || t.status === "approved" || t.status === "active" || t.status === "completed" ? "bg-success/15 text-success" :
                      t.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                    }`}>{t.status}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">No transactions in this view.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
