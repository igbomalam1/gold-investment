import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Coins, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/history")({
  head: () => ({ meta: [{ title: "History — Admin" }] }),
  component: AdminHistoryPage,
});

type Activity = {
  id: string;
  type: "deposit" | "withdrawal" | "investment";
  label: string;
  sub: string;
  amount: number;
  date: string;
  status: string;
};

const ICONS = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpToLine,
  investment: Coins,
};

function AdminHistoryPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [stats, setStats] = useState({ users: 0, deposits: 0, withdrawals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: deps }, { data: wds }, { data: invs }, { count: usersCount }] =
        await Promise.all([
          supabase
            .from("deposits")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("withdrawals")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("investments")
            .select("*, plans(name)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
        ]);

      const userIds = Array.from(
        new Set([
          ...(deps ?? []).map((d) => d.user_id),
          ...(wds ?? []).map((w) => w.user_id),
          ...(invs ?? []).map((i) => i.user_id),
        ]),
      );

      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || "User"]));

      const merged: Activity[] = [
        ...(deps ?? []).map((d) => ({
          id: `d-${d.id}`,
          type: "deposit" as const,
          label: `${nameMap.get(d.user_id) || "User"} deposited`,
          sub: `${d.token} on ${d.network}`,
          amount: Number(d.amount),
          date: d.created_at,
          status: d.status,
        })),
        ...(wds ?? []).map((w) => ({
          id: `w-${w.id}`,
          type: "withdrawal" as const,
          label: `${nameMap.get(w.user_id) || "User"} withdrew`,
          sub: `${w.token} on ${w.network}`,
          amount: Number(w.amount),
          date: w.created_at,
          status: w.status,
        })),
        ...(invs ?? []).map((i: any) => ({
          id: `i-${i.id}`,
          type: "investment" as const,
          label: `${nameMap.get(i.user_id) || "User"} invested`,
          sub: `${i.plans?.name ?? "Plan"} · ${i.daily_roi_pct}%/day`,
          amount: Number(i.amount),
          date: i.created_at,
          status: i.status,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivity(merged);
      setStats({
        users: usersCount ?? 0,
        deposits: (deps ?? [])
          .filter((d) => d.status === "received")
          .reduce((s, d) => s + Number(d.amount), 0),
        withdrawals: (wds ?? [])
          .filter((w) => w.status === "approved")
          .reduce((s, w) => s + Number(w.amount), 0),
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">Platform history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every deposit, withdrawal and investment, in one ledger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Total users" value={stats.users.toString()} icon={Users} />
        <Card
          label="Total deposits credited"
          value={formatCurrency(stats.deposits)}
          icon={ArrowDownToLine}
        />
        <Card
          label="Total withdrawals approved"
          value={formatCurrency(stats.withdrawals)}
          icon={ArrowUpToLine}
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <div className="divide-y divide-border/50">
            {activity.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              activity.map((a) => {
                const Icon = ICONS[a.type];
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{a.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {a.sub} · {formatDateTime(a.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-gradient-gold">
                        {formatCurrency(a.amount)}
                      </div>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          a.status === "received" ||
                          a.status === "approved" ||
                          a.status === "active" ||
                          a.status === "completed"
                            ? "bg-success/15 text-success"
                            : a.status === "rejected"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon size={18} />
      </div>
      <div className="mt-4 font-display text-2xl text-gradient-gold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
