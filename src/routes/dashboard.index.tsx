import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine, ArrowUpToLine, Repeat, TrendingUp, Sparkles, ShieldCheck, Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DepositModal } from "@/components/dashboard/DepositModal";
import { WithdrawModal } from "@/components/dashboard/WithdrawModal";
import { ReinvestModal } from "@/components/dashboard/ReinvestModal";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

type Inv = {
  id: string;
  amount: number;
  daily_roi_pct: number;
  duration_days: number;
  started_at: string;
  ends_at: string;
  status: string;
  plans: { name: string } | null;
};

function DashboardHome() {
  const { profile, user, refreshProfile } = useAuth();
  const [modal, setModal] = useState<"deposit" | "withdraw" | "reinvest" | null>(null);
  const [investments, setInvestments] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("investments")
      .select("id, amount, daily_roi_pct, duration_days, started_at, ends_at, status, plans(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setInvestments((data as unknown as Inv[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const onAction = async () => {
    setModal(null);
    await refreshProfile();
    await load();
  };

  const totalProfit = investments.reduce((sum, i) => {
    const start = new Date(i.started_at).getTime();
    const end = new Date(i.ends_at).getTime();
    const elapsed = Math.max(0, (Math.min(Date.now(), end) - start) / 86400000);
    return sum + (Number(i.amount) * Number(i.daily_roi_pct) / 100) * elapsed;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl lg:text-4xl">{profile?.full_name || "Investor"}</h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {profile?.country} · {profile?.email}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs text-success">
          <ShieldCheck size={13} /> Account verified
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-emerald p-1 shadow-emerald">
        <div className="rounded-[calc(1.5rem-4px)] bg-card/80 p-7 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Sparkles size={12} className="text-primary" /> Total balance
              </div>
              <div className="mt-2 font-display text-5xl text-gradient-gold lg:text-6xl">
                {formatCurrency(profile?.balance ?? 0)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-success">
                <TrendingUp size={14} /> +{formatCurrency(totalProfit)} live profit
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
              <Stat label="Invested" value={formatCurrency(profile?.total_invested ?? 0)} />
              <Stat label="Profit" value={formatCurrency(totalProfit)} positive />
              <Stat label="Bonus ROI" value={`+${profile?.custom_roi_bonus ?? 0}%`} />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <ActionButton onClick={() => setModal("deposit")} icon={ArrowDownToLine} label="Deposit" primary />
            <ActionButton onClick={() => setModal("withdraw")} icon={ArrowUpToLine} label="Withdraw" />
            <ActionButton onClick={() => setModal("reinvest")} icon={Repeat} label="Reinvest" />
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Active investments</h2>
            <p className="text-sm text-muted-foreground">Your money working across markets.</p>
          </div>
          <Link to="/dashboard/invest" className="text-sm font-semibold text-primary hover:underline">
            New investment →
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 grid place-items-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : investments.filter(i => i.status === "active").length === 0 ? (
          <div className="mt-5 rounded-3xl border border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No active investments yet. <Link to="/dashboard/invest" className="text-primary font-semibold">Start your first plan →</Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {investments.filter((i) => i.status === "active").map((inv) => {
              const start = new Date(inv.started_at).getTime();
              const elapsedDays = Math.max(0, (Date.now() - start) / 86400000);
              const earned = (Number(inv.amount) * Number(inv.daily_roi_pct) / 100) * elapsedDays;
              const progress = Math.min(100, (elapsedDays / inv.duration_days) * 100);
              return (
                <div key={inv.id} className="rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{inv.plans?.name} plan</div>
                      <div className="mt-1 font-display text-2xl text-gradient-gold">{formatCurrency(inv.amount)}</div>
                    </div>
                    <div className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      +{inv.daily_roi_pct}% / day
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Earned so far</span>
                      <span className="font-mono font-semibold text-success">+{formatCurrency(earned)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
                      <div className="h-full rounded-full bg-gradient-gold shimmer" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Day {Math.floor(elapsedDays)} / {inv.duration_days}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modal === "deposit" && <DepositModal onClose={onAction} />}
      {modal === "withdraw" && <WithdrawModal onClose={onAction} />}
      {modal === "reinvest" && <ReinvestModal onClose={onAction} />}
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl bg-background/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold ${positive ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary }: { icon: typeof ArrowDownToLine; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-4 text-xs font-semibold transition-transform hover:scale-[1.02] ${
        primary
          ? "bg-gradient-gold text-primary-foreground shadow-gold"
          : "border border-border bg-background/50 text-foreground hover:border-primary"
      }`}
    >
      <Icon size={20} /> {label}
    </button>
  );
}
