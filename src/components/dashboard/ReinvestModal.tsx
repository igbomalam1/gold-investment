import { useEffect, useState } from "react";
import { X, Repeat, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Plan = { id: string; name: string; daily_roi_pct: number; min_amount: number; max_amount: number };

export function ReinvestModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("plans").select("id, name, daily_roi_pct, min_amount, max_amount").eq("is_active", true).order("sort_order").then(({ data }) => {
      const p = (data || []) as Plan[];
      setPlans(p);
      if (p[0]) setPlanId(p[0].id);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc("create_investment", { _plan_id: planId, _amount: Number(amount) });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-2xl">
            <Repeat size={20} className="text-primary" /> Reinvest
          </h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"><X size={16} /></button>
        </div>

        {done ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 size={28} /></div>
            <h4 className="mt-4 font-display text-xl">Reinvested!</h4>
            <p className="mt-1 text-sm text-muted-foreground">Your funds are now compounding.</p>
            <button onClick={onClose} className="mt-5 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="rounded-xl bg-background/40 p-3 text-xs">
              <div className="text-muted-foreground">Available balance</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-success">{formatCurrency(profile?.balance ?? 0)}</div>
            </div>

            <div>
              <label className="text-xs font-medium">Amount</label>
              <input required type="number" min={10} max={Number(profile?.balance ?? 0)} value={amount} onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>

            <div>
              <label className="text-xs font-medium">Compound into plan</label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary">
                {plans.map((p) => (<option key={p.id} value={p.id}>{p.name} — {p.daily_roi_pct}%/day</option>))}
              </select>
            </div>

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Reinvest profits
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
