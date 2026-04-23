import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Wallet, TrendingUp, Bell, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

type RecentDeposit = {
  id: string;
  user_id: string;
  amount: number;
  token: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
};

function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    aum: 0,
    activeInvestments: 0,
    pending: 0,
  });
  const [recent, setRecent] = useState<RecentDeposit[]>([]);

  useEffect(() => {
    (async () => {
      const [
        { count: usersCount },
        { data: profileSums },
        { count: invCount },
        { data: pendingDeps },
        { data: recentDeps },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("balance, total_invested"),
        supabase
          .from("investments")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("deposits").select("id").eq("status", "pending"),
        supabase
          .from("deposits")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const aum =
        (profileSums ?? []).reduce(
          (s, p: any) => s + Number(p.balance ?? 0) + Number(p.total_invested ?? 0),
          0,
        ) ?? 0;

      let merged: RecentDeposit[] = recentDeps ?? [];
      if (merged.length) {
        const ids = Array.from(new Set(merged.map((d) => d.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p]));
        merged = merged.map((d) => ({ ...d, profile: map.get(d.user_id) ?? undefined }));
      }

      setStats({
        users: usersCount ?? 0,
        aum,
        activeInvestments: invCount ?? 0,
        pending: pendingDeps?.length ?? 0,
      });
      setRecent(merged);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Operations</p>
        <h1 className="mt-1 font-display text-3xl lg:text-4xl">Command center</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total users" value={stats.users.toString()} icon={Users} />
        <Kpi
          label="Assets under management"
          value={formatCurrency(stats.aum)}
          icon={Wallet}
        />
        <Kpi
          label="Active investments"
          value={stats.activeInvestments.toString()}
          icon={TrendingUp}
        />
        <Kpi
          label="Pending deposits"
          value={stats.pending.toString()}
          icon={Bell}
          alert={stats.pending > 0}
        />
      </div>

      {stats.pending > 0 && (
        <div className="rounded-3xl border border-warning/40 bg-warning/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-warning/20 text-warning">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="font-display text-lg">
                  {stats.pending} deposit{stats.pending === 1 ? "" : "s"} awaiting confirmation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review and approve to credit user accounts.
                </p>
              </div>
            </div>
            <Link
              to="/admin/deposits"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-xs font-semibold text-primary-foreground shadow-gold"
            >
              Review now <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      <section>
        <h2 className="font-display text-xl">Recent deposit activity</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <div className="divide-y divide-border/50">
            {recent.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No deposits yet.
              </div>
            ) : (
              recent.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {d.profile?.full_name || "Unknown user"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.profile?.email} · {d.token} · {formatDateTime(d.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {formatCurrency(d.amount)}
                    </div>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        d.status === "received"
                          ? "bg-success/15 text-success"
                          : d.status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 backdrop-blur ${alert ? "border-warning/40 bg-warning/5" : "border-border/60 bg-card/60"}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`grid h-10 w-10 place-items-center rounded-xl ${alert ? "bg-warning/20 text-warning" : "bg-primary/15 text-primary"}`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 font-display text-2xl text-gradient-gold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
