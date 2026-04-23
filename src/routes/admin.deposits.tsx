import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/deposits")({
  head: () => ({ meta: [{ title: "Deposits — Admin" }] }),
  component: AdminDepositsPage,
});

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  token: string;
  network: string;
  wallet_address: string;
  status: string;
  created_at: string;
  expires_at: string;
  notes: string | null;
  profile?: { full_name: string | null; email: string | null };
};

type StatusFilter = "pending" | "received" | "rejected" | "all";

function AdminDepositsPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [items, setItems] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: deps } = await supabase
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });
    if (deps && deps.length) {
      const ids = Array.from(new Set(deps.map((d) => d.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      setItems(deps.map((d) => ({ ...d, profile: map.get(d.user_id) ?? undefined })) as Deposit[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((d) => filter === "all" || d.status === filter);

  const counts = {
    pending: items.filter((d) => d.status === "pending").length,
    received: items.filter((d) => d.status === "received").length,
    rejected: items.filter((d) => d.status === "rejected").length,
    all: items.length,
  };

  const review = async (d: Deposit, action: "approve" | "reject") => {
    setActionId(d.id);
    const { error } =
      action === "approve"
        ? await supabase.rpc("admin_credit_deposit", { _deposit_id: d.id })
        : await supabase.rpc("admin_reject_deposit", {
            _deposit_id: d.id,
            _reason: "Payment not received — please make the payment again.",
          });
    setActionId(null);
    if (error) return toast.error(error.message);
    toast.success(action === "approve" ? "Credited to user" : "Rejected and user notified");

    // Fire transactional email (non-blocking)
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: action === "approve" ? "deposit_approved" : "deposit_rejected",
        deposit_id: d.id,
      }),
    }).catch(() => {});

    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">Deposit queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review user crypto deposits and credit balances on confirmation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "received", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? "bg-gradient-gold text-primary-foreground shadow-gold"
                : "border border-border bg-background/40 text-foreground/80 hover:border-primary"
            }`}
          >
            {f}{" "}
            <span className="rounded-full bg-background/40 px-2 py-0.5 text-[10px]">
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-border/60 bg-card/40 p-5 backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{d.profile?.full_name || "Unknown user"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      · {d.profile?.email}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{formatDateTime(d.created_at)}</span>
                    <span>·</span>
                    <span>
                      {d.token} on {d.network}
                    </span>
                  </div>
                  <div className="mt-2 break-all rounded-lg bg-background/50 px-3 py-1.5 font-mono text-[11px]">
                    {d.wallet_address}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-display text-2xl text-gradient-gold">
                    {formatCurrency(d.amount)}
                  </div>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
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

              {d.status === "pending" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={actionId === d.id}
                    onClick={() => review(d, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-4 py-2 text-xs font-semibold text-success hover:bg-success/25 disabled:opacity-60"
                  >
                    {actionId === d.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}{" "}
                    Received — credit user
                  </button>
                  <button
                    disabled={actionId === d.id}
                    onClick={() => review(d, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-60"
                  >
                    <XCircle size={13} /> Reject — notify user
                  </button>
                  {d.profile?.email && (
                    <a
                      href={`mailto:${d.profile.email}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary"
                    >
                      <Mail size={13} /> Email user
                    </a>
                  )}
                </div>
              )}
              {d.notes && d.status === "rejected" && (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                  Reason: {d.notes}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-3xl border border-border/60 bg-card/40 px-5 py-12 text-center text-sm text-muted-foreground">
              Nothing in this queue.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
