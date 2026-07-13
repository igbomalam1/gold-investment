import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users - Admin" }] }),
  component: AdminUsersPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  balance: number;
  total_invested: number;
  total_profit: number;
  custom_roi_bonus: number;
  created_at: string;
};

type ManagedInvestment = {
  id: string;
  amount: number;
  created_at: string;
  daily_roi_pct: number;
  duration_days: number;
  ends_at: string;
  started_at: string;
  status: string;
  plans: { name: string } | null;
};

type BalanceAction = "credit" | "debit";

const EMPTY_COUNTS = { deposits: 0, withdrawals: 0 };

function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingRoi, setSavingRoi] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [adjustingBalance, setAdjustingBalance] = useState(false);
  const [investmentActionKey, setInvestmentActionKey] = useState<string | null>(null);
  const [balanceAction, setBalanceAction] = useState<BalanceAction | null>(null);
  const [userInvestments, setUserInvestments] = useState<ManagedInvestment[]>([]);
  const [userCounts, setUserCounts] = useState(EMPTY_COUNTS);

  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  const loadUsers = async () => {
    setLoading(true);
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

    if (profilesError) {
      toast.error("We could not load the users list.");
      console.error(profilesError);
    }

    if (rolesError) {
      toast.error("We could not load user roles.");
      console.error(rolesError);
    }

    setUsers((profiles as Profile[]) ?? []);
    setAdminIds(
      new Set((roles ?? []).filter((role) => role.role === "admin").map((role) => role.user_id)),
    );
    setLoading(false);
  };

  const loadUserDetails = async (userId: string) => {
    setDetailLoading(true);
    const [
      { data: investments, error: investmentsError },
      { count: depositsCount, error: depositsError },
      { count: withdrawalsCount, error: withdrawalsError },
    ] = await Promise.all([
      supabase
        .from("investments")
        .select(
          "id, amount, created_at, daily_roi_pct, duration_days, ends_at, started_at, status, plans(name)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("deposits").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (investmentsError) {
      toast.error("We could not load this user's investments.");
      console.error(investmentsError);
    }

    if (depositsError || withdrawalsError) {
      console.error(depositsError ?? withdrawalsError);
    }

    setUserInvestments((investments as ManagedInvestment[]) ?? []);
    setUserCounts({
      deposits: depositsCount ?? 0,
      withdrawals: withdrawalsCount ?? 0,
    });
    setDetailLoading(false);
  };

  const updateUserInState = (nextUser: Profile) => {
    setUsers((current) =>
      current.map((user) => (user.id === nextUser.id ? { ...user, ...nextUser } : user)),
    );
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      setUserInvestments([]);
      setUserCounts(EMPTY_COUNTS);
      setDetailLoading(false);
      return;
    }

    void loadUserDetails(activeUserId);
  }, [activeUserId]);

  const filtered = users.filter((user) => {
    const query = q.toLowerCase();
    return (
      (user.full_name ?? "").toLowerCase().includes(query) ||
      (user.email ?? "").toLowerCase().includes(query) ||
      (user.country ?? "").toLowerCase().includes(query)
    );
  });

  const currentInvestments = userInvestments.filter(
    (investment) => investment.status !== "completed",
  );
  const completedInvestments = userInvestments.length - currentInvestments.length;
  const activeInvestments = userInvestments.filter(
    (investment) => investment.status === "active",
  ).length;
  const suspendedInvestments = userInvestments.filter(
    (investment) => investment.status === "suspended",
  ).length;

  const closeUserDialog = () => {
    setActiveUserId(null);
    setBalanceAction(null);
    setUserInvestments([]);
    setUserCounts(EMPTY_COUNTS);
  };

  const handleDeleteProfile = async () => {
    if (!activeUser) return;
    if (!confirm("Delete this user profile record? The auth account will remain.")) return;

    setDeletingProfile(true);
    const { error } = await supabase.from("profiles").delete().eq("id", activeUser.id);
    setDeletingProfile(false);

    if (error) return toast.error(error.message);

    toast.success("User profile deleted");
    setUsers((current) => current.filter((user) => user.id !== activeUser.id));
    closeUserDialog();
  };

  const handleSaveRoi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeUser) return;

    const fd = new FormData(e.currentTarget);
    const roiBonus = Number(fd.get("roi_bonus"));

    if (Number.isNaN(roiBonus)) {
      toast.error("Enter a valid ROI bonus.");
      return;
    }

    setSavingRoi(true);
    const { data, error } = await supabase.rpc("admin_update_user", {
      _user_id: activeUser.id,
      _balance: activeUser.balance,
      _roi_bonus: roiBonus,
    });
    setSavingRoi(false);

    if (error) return toast.error(error.message);

    updateUserInState(data as Profile);
    toast.success("ROI bonus updated");
  };

  const handleBalanceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeUser || !balanceAction) return;

    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const noteValue = String(fd.get("note") ?? "").trim();

    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }

    setAdjustingBalance(true);
    const { data, error } = await supabase.rpc("admin_adjust_user_balance", {
      _user_id: activeUser.id,
      _action: balanceAction,
      _amount: amount,
      _note: noteValue || null,
    });
    setAdjustingBalance(false);

    if (error) return toast.error(error.message);

    updateUserInState(data as Profile);
    toast.success(`Balance ${balanceAction}ed successfully`);
    setBalanceAction(null);
  };

  const handleInvestmentAction = async (
    investmentId: string,
    action: "suspend" | "activate" | "delete",
  ) => {
    if (!activeUserId) return;

    const confirmationMessage =
      action === "delete"
        ? "Delete this investment record? This cannot be undone."
        : action === "suspend"
          ? "Suspend this investment now?"
          : "Reactivate this investment now?";

    if (!confirm(confirmationMessage)) return;

    const actionKey = `${investmentId}:${action}`;
    setInvestmentActionKey(actionKey);
    const { error } = await supabase.rpc("admin_manage_investment", {
      _investment_id: investmentId,
      _action: action,
    });
    setInvestmentActionKey(null);

    if (error) return toast.error(error.message);

    toast.success(
      action === "delete"
        ? "Investment deleted"
        : action === "suspend"
          ? "Investment suspended"
          : "Investment reactivated",
    );

    await Promise.all([loadUsers(), loadUserDetails(activeUserId)]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} accounts on the platform. Select a user to open full account controls.
          </p>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/60 px-4 py-3">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            Search users
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email or country"
            className="mt-2 w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <div className="border-b border-border/50 bg-background/30 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            User list
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No users match this search.
            </div>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setActiveUserId(user.id)}
                className="w-full border-b border-border/30 px-5 py-4 text-left transition-colors hover:bg-accent/20 last:border-0"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {user.full_name || "Unnamed user"}
                      </span>
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {adminIds.has(user.id) ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className="mt-1 break-all text-sm text-muted-foreground">
                      {user.email || "-"}
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-4 lg:min-w-[560px]">
                    <InlineDetail label="Country" value={user.country || "-"} />
                    <InlineDetail label="Joined" value={formatDateTime(user.created_at)} />
                    <InlineDetail label="Balance" value={formatCurrency(user.balance)} emphasized />
                    <InlineDetail label="Total Profit" value={formatCurrency(user.total_profit)} emphasized />
                  </div>

                  <div className="text-sm font-semibold text-primary">Open details</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {activeUser && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
          <div className="w-full max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary">User management</p>
                <h2 className="mt-1 font-display text-3xl">
                  {activeUser.full_name || activeUser.email || "User account"}
                </h2>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {activeUser.email || "No email on file"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUserDialog}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="mt-6 max-h-[76vh] space-y-6 overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    label="Current balance"
                    value={formatCurrency(activeUser.balance)}
                    sub="Available for deposits, withdrawals and admin actions."
                  />
                  <SummaryCard
                    label="Total profit"
                    value={formatCurrency(activeUser.total_profit)}
                    sub="Lifetime yield earnings credited to balance."
                  />
                  <SummaryCard
                    label="Total invested"
                    value={formatCurrency(activeUser.total_invested)}
                    sub={`${activeInvestments} active and ${suspendedInvestments} suspended investments.`}
                  />
                  <SummaryCard
                    label="Recorded activity"
                    value={`${userCounts.deposits} deposits / ${userCounts.withdrawals} withdrawals`}
                    sub="Counts across the transaction history for this user."
                  />
                  <SummaryCard
                    label="Joined account"
                    value={formatDate(activeUser.created_at)}
                    sub={`${userInvestments.length} total investment records.`}
                  />
                </div>

                <SectionCard
                  title="Profile details"
                  description="Identity, account role and lifecycle details for this user."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DetailField label="Full name" value={activeUser.full_name || "Not provided"} />
                    <DetailField label="Email" value={activeUser.email || "Not provided"} />
                    <DetailField label="Country" value={activeUser.country || "Not provided"} />
                    <DetailField
                      label="Account role"
                      value={adminIds.has(activeUser.id) ? "Administrator" : "Standard user"}
                    />
                    <DetailField label="Joined" value={formatDateTime(activeUser.created_at)} />
                    <DetailField label="User ID" value={activeUser.id} mono />
                  </div>
                </SectionCard>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <SectionCard
                    title="Balance management"
                    description="Apply immediate credit or debit actions to the user's live balance."
                  >
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          Current balance
                        </div>
                        <div className="mt-1 font-display text-3xl text-gradient-gold">
                          {formatCurrency(activeUser.balance)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setBalanceAction("credit")}
                          className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground shadow-gold"
                        >
                          Credit balance
                        </button>
                        <button
                          type="button"
                          onClick={() => setBalanceAction("debit")}
                          className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
                        >
                          Debit balance
                        </button>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="ROI and profile controls"
                    description="Update the bonus ROI for future investments and handle profile-level actions."
                  >
                    <form onSubmit={handleSaveRoi} className="space-y-4">
                      <div>
                        <label className="text-xs font-medium">Custom ROI bonus (%)</label>
                        <input
                          name="roi_bonus"
                          type="number"
                          step="0.1"
                          defaultValue={activeUser.custom_roi_bonus}
                          className={inputCls}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Applied on top of the plan ROI for each new investment the user opens.
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={savingRoi}
                        className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
                      >
                        {savingRoi ? "Saving ROI bonus..." : "Save ROI bonus"}
                      </button>
                    </form>

                    <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="text-sm font-semibold text-foreground">Danger zone</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Deleting the profile removes this record from the app, but not the auth
                        account.
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteProfile}
                        disabled={deletingProfile}
                        className="mt-3 rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {deletingProfile ? "Deleting profile..." : "Delete profile record"}
                      </button>
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  title="Current investments"
                  description="Suspend, reactivate or delete investment records for this user."
                >
                  <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{currentInvestments.length} current</span>
                    <span>{completedInvestments} completed</span>
                    <span>{formatCurrency(activeUser.total_profit)} recorded profit</span>
                  </div>

                  {currentInvestments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                      No current investments for this user.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentInvestments.map((investment) => {
                        const toggleAction =
                          investment.status === "active"
                            ? "suspend"
                            : investment.status === "suspended"
                              ? "activate"
                              : null;
                        const actionBusy = (action: string) =>
                          investmentActionKey === `${investment.id}:${action}`;

                        return (
                          <div
                            key={investment.id}
                            className="rounded-2xl border border-border/60 bg-background/40 p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-semibold text-foreground">
                                    {investment.plans?.name || "Plan"} investment
                                  </div>
                                  <StatusBadge status={investment.status} />
                                </div>
                                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                                  <DetailField
                                    label="Amount"
                                    value={formatCurrency(investment.amount)}
                                  />
                                  <DetailField
                                    label="Daily ROI"
                                    value={`${investment.daily_roi_pct}% / day`}
                                  />
                                  <DetailField
                                    label="Started"
                                    value={formatDateTime(investment.started_at)}
                                  />
                                  <DetailField
                                    label="Ends"
                                    value={formatDateTime(investment.ends_at)}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                {toggleAction && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInvestmentAction(investment.id, toggleAction)
                                    }
                                    disabled={actionBusy(toggleAction)}
                                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
                                  >
                                    {actionBusy(toggleAction)
                                      ? toggleAction === "suspend"
                                        ? "Suspending..."
                                        : "Reactivating..."
                                      : toggleAction === "suspend"
                                        ? "Suspend investment"
                                        : "Reactivate investment"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleInvestmentAction(investment.id, "delete")}
                                  disabled={actionBusy("delete")}
                                  className="rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                                >
                                  {actionBusy("delete") ? "Deleting..." : "Delete investment"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}
          </div>
        </div>
      )}

      {activeUser && balanceAction && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/75 p-4 backdrop-blur sm:items-center">
          <form
            onSubmit={handleBalanceSubmit}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-primary">
                  Balance action
                </div>
                <h3 className="mt-1 font-display text-2xl">
                  {balanceAction === "credit" ? "Credit user balance" : "Debit user balance"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This updates {activeUser.full_name || activeUser.email || "this user"}{" "}
                  immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBalanceAction(null)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium">Amount (USD)</label>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Note (optional)</label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Why are you making this adjustment?"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <button
                type="submit"
                disabled={adjustingBalance}
                className="w-full rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
              >
                {adjustingBalance
                  ? balanceAction === "credit"
                    ? "Crediting balance..."
                    : "Debiting balance..."
                  : balanceAction === "credit"
                    ? "Apply credit"
                    : "Apply debit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary";

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-3 font-display text-2xl text-gradient-gold">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-5 backdrop-blur">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm text-foreground ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function InlineDetail({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 ${emphasized ? "font-semibold text-foreground" : ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "suspended"
        ? "bg-warning/15 text-warning"
        : status === "completed"
          ? "bg-primary/15 text-primary"
          : status === "deleted"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tone}`}>
      {status}
    </span>
  );
}
