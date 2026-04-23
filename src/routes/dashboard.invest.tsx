import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Check, X, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/invest")({
  head: () => ({ meta: [{ title: "Invest — Gold Empire" }] }),
  component: InvestPage,
});

type Plan = {
  id: string; name: string; tier: string;
  min_amount: number; max_amount: number;
  daily_roi_pct: number; duration_days: number;
};

function InvestPage() {
  const { profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setPlans((data as Plan[]) || []);
      setLoading(false);
    });
  }, []);

  const close = () => { setPicked(null); setAmount(""); setDone(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("create_investment", { _plan_id: picked.id, _amount: Number(amount) });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    setDone(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">Investment plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a plan, set your amount, start earning daily ROI.</p>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-3 text-xs text-foreground/85">
        <span className="text-muted-foreground">Available balance: </span>
        <span className="font-semibold text-primary">{formatCurrency(profile?.balance ?? 0)}</span>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPicked(p)}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-5 text-left backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-gold"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{p.tier}</div>
                {p.tier === "diamond" && <Crown size={14} className="text-primary" />}
              </div>
              <h3 className="mt-1 font-display text-2xl text-gradient-gold">{p.name}</h3>
              <div className="mt-3 font-display text-3xl">{p.daily_roi_pct}%<span className="text-sm text-muted-foreground"> /day</span></div>
              <div className="mt-3 text-xs text-muted-foreground">
                {formatCurrency(p.min_amount)} — {formatCurrency(p.max_amount)}
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] text-foreground/80">
                <li className="flex items-start gap-1.5"><Check size={11} className="mt-0.5 shrink-0 text-primary" />{p.duration_days}-day cycle</li>
                <li className="flex items-start gap-1.5"><Check size={11} className="mt-0.5 shrink-0 text-primary" />Auto-credit daily</li>
              </ul>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Invest in {picked.name}</h3>
              <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"><X size={16} /></button>
            </div>

            {done ? (
              <div className="mt-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 size={28} /></div>
                <h4 className="mt-4 font-display text-xl">Investment activated</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Earning {picked.daily_roi_pct}% daily on {formatCurrency(+amount)}.
                </p>
                <button onClick={close} className="mt-5 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="rounded-xl bg-background/40 p-3 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Daily ROI</span><span className="font-semibold text-success">+{picked.daily_roi_pct}%</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Duration</span><span>{picked.duration_days} days</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Range</span><span>{formatCurrency(picked.min_amount)} — {formatCurrency(picked.max_amount)}</span></div>
                </div>
                <div>
                  <label className="text-xs font-medium">Amount in USD</label>
                  <input required type="number" min={picked.min_amount} max={Math.min(Number(picked.max_amount), Number(profile?.balance ?? 0))}
                    placeholder={`${picked.min_amount}`} value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-lg font-display outline-none focus:border-primary" />
                </div>
                {amount && +amount >= picked.min_amount && (
                  <div className="rounded-xl bg-gradient-emerald p-1">
                    <div className="rounded-[calc(0.75rem-4px)] bg-card/80 p-3 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Daily earnings</span>
                        <span className="font-mono font-semibold text-success">+{formatCurrency(+amount * picked.daily_roi_pct / 100)}</span></div>
                      <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Total ROI ({picked.duration_days}d)</span>
                        <span className="font-mono font-semibold text-gradient-gold">{formatCurrency(+amount * picked.daily_roi_pct / 100 * picked.duration_days)}</span></div>
                    </div>
                  </div>
                )}
                <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Activate investment
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
