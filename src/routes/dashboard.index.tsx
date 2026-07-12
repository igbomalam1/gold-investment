import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Repeat,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Loader2,
  Copy,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

type Referral = {
  id: string;
  joined_at: string;
  masked_identity: string;
};

function DashboardHome() {
  const { profile, user, refreshProfile } = useAuth();
  const [modal, setModal] = useState<"deposit" | "withdraw" | "reinvest" | null>(null);
  const [investments, setInvestments] = useState<Inv[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralsLoading, setReferralsLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setInvestments([]);
      setReferrals([]);
      setLoading(false);
      setReferralsLoading(false);
      return;
    }

    setLoading(true);
    setReferralsLoading(true);

    const [
      { data: investmentData, error: investmentError },
      { data: referralData, error: referralError },
    ] = await Promise.all([
      supabase
        .from("investments")
        .select(
          "id, amount, daily_roi_pct, duration_days, started_at, ends_at, status, plans(name)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_my_referrals"),
    ]);

    if (investmentError) {
      toast.error("We couldn't load your investments right now.");
      console.error(investmentError);
    }

    if (referralError) {
      console.error(referralError);
    }

    setInvestments((investmentData as unknown as Inv[]) || []);
    setReferrals(referralData || []);
    setLoading(false);
    setReferralsLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const onAction = async () => {
    setModal(null);
    await refreshProfile();
    await load();
  };

  const totalProfit = investments.reduce((sum, i) => {
    if (i.status !== "active") return sum;
    const start = new Date(i.started_at).getTime();
    const end = new Date(i.ends_at).getTime();
    const elapsed = Math.max(0, (Math.min(Date.now(), end) - start) / 86400000);
    return sum + ((Number(i.amount) * Number(i.daily_roi_pct)) / 100) * elapsed;
  }, 0);

  // Total withdrawable balance includes both balance and available_yield
  const withdrawableBalance = (profile?.balance ?? 0) + (profile?.available_yield ?? 0);
  const referralLink = profile
    ? `${window.location.origin}/signup?ref=${profile.referral_code || profile.id}`
    : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl lg:text-4xl">
            {profile?.full_name || "Investor"}
          </h1>
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
                {formatCurrency(withdrawableBalance)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-success">
                <TrendingUp size={14} /> +{formatCurrency(totalProfit)} live profit
              </div>
              {(profile?.available_yield ?? 0) > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Includes {formatCurrency(profile?.available_yield ?? 0)} from yield earnings
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
              <Stat label="Invested" value={formatCurrency(profile?.total_invested ?? 0)} />
              <Stat label="Yield Earned" value={formatCurrency(profile?.available_yield ?? 0)} positive />
              <Stat label="Bonus ROI" value={`+${profile?.custom_roi_bonus ?? 0}%`} />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <ActionButton
              onClick={() => setModal("deposit")}
              icon={ArrowDownToLine}
              label="Deposit"
              primary
            />
            <ActionButton
              onClick={() => setModal("withdraw")}
              icon={ArrowUpToLine}
              label="Withdraw"
            />
            <ActionButton onClick={() => setModal("reinvest")} icon={Repeat} label="Reinvest" />
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur">
        <h3 className="font-display text-2xl text-gradient-gold">Invite Friends & Earn</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Earn $1 for every friend you refer! You'll receive $1 when your friend makes their first
          investment of $10 or more, and an additional $1 for every subsequent investment they make
          of $50 or more.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-0 rounded-xl border border-border bg-background/60 px-4 py-3 font-mono text-sm break-all whitespace-normal overflow-x-auto">
            {referralLink}
          </div>
          <button
            onClick={() => {
              if (!referralLink) return;
              navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied!");
            }}
            className="w-full rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold sm:w-auto"
          >
            <span className="flex items-center justify-center gap-2">
              <Copy size={16} /> Copy Link
            </span>
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users size={16} className="text-primary" /> My downline
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your referred users are masked for privacy.
              </p>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {formatReferralCount(referrals.length)}
            </div>
          </div>

          {referralsLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-primary" />
              Loading your downline...
            </div>
          ) : referrals.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
              No referrals have joined with your link yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="rounded-xl border border-border/60 bg-card/50 px-4 py-3"
                >
                  <div className="font-medium text-foreground">{referral.masked_identity}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Joined {formatJoinDate(referral.joined_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Active investments</h2>
            <p className="text-sm text-muted-foreground">Your money working across markets.</p>
          </div>
          <Link
            to="/dashboard/invest"
            className="text-sm font-semibold text-primary hover:underline"
          >
            New investment →
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 grid place-items-center py-10">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : investments.filter((i) => i.status === "active").length === 0 ? (
          <div className="mt-5 rounded-3xl border border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No active investments yet.{" "}
            <Link to="/dashboard/invest" className="text-primary font-semibold">
              Start your first plan →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {investments
              .filter((i) => i.status === "active")
              .map((inv) => {
                const start = new Date(inv.started_at).getTime();
                const elapsedDays = Math.max(0, (Date.now() - start) / 86400000);
                const earned =
                  ((Number(inv.amount) * Number(inv.daily_roi_pct)) / 100) * elapsedDays;
                const progress = Math.min(100, (elapsedDays / inv.duration_days) * 100);
                return (
                  <div
                    key={inv.id}
                    className="rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {inv.plans?.name} plan
                        </div>
                        <div className="mt-1 font-display text-2xl text-gradient-gold">
                          {formatCurrency(inv.amount)}
                        </div>
                      </div>
                      <div className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                        +{inv.daily_roi_pct}% / day
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Earned so far</span>
                        <span className="font-mono font-semibold text-success">
                          +{formatCurrency(earned)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
                        <div
                          className="h-full rounded-full bg-gradient-gold shimmer"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>
                          Day {Math.floor(elapsedDays)} / {inv.duration_days}
                        </span>
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
      <div className={`mt-0.5 font-mono text-sm font-semibold ${positive ? "text-success" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
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

function formatJoinDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatReferralCount(count: number) {
  return `${count} referral${count === 1 ? "" : "s"}`;
}
