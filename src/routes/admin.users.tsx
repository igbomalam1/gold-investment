import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Edit3, Trash2, X, Check, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
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

function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsers((profiles as Profile[]) ?? []);
    setAdminIds(new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter(
    (u) =>
      (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const editUser = users.find((u) => u.id === editingId);

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this user profile? Auth account remains.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("User profile deleted");
    setUsers(users.filter((u) => u.id !== id));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const fd = new FormData(e.currentTarget);
    const _balance = Number(fd.get("balance"));
    const _roi_bonus = Number(fd.get("roi_bonus"));
    const { error } = await supabase.rpc("admin_update_user", {
      _user_id: editUser.id,
      _balance,
      _roi_bonus,
    });
    if (error) return toast.error(error.message);
    toast.success("User updated");
    setEditingId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} accounts on the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-background/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Invested</th>
                <th className="px-5 py-3">ROI bonus</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{u.full_name || "—"}</span>
                      {adminIds.has(u.id) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          <ShieldCheck size={9} /> Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-5 py-4 text-xs">{u.country || "—"}</td>
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-gradient-gold">
                    {formatCurrency(u.balance)}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{formatCurrency(u.total_invested)}</td>
                  <td className="px-5 py-4 text-xs">+{u.custom_roi_bonus}%</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setEditingId(u.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                    >
                      <Edit3 size={12} /> Manage
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Manage {editUser.full_name || "user"}</h3>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm">
              <Row label="Account balance ($)">
                <input
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue={editUser.balance}
                  className={iCls}
                />
              </Row>
              <Row label="Custom ROI bonus (%)">
                <input
                  name="roi_bonus"
                  type="number"
                  step="0.1"
                  defaultValue={editUser.custom_roi_bonus}
                  className={iCls}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Added on top of the plan's daily ROI for every new investment this user makes.
                </p>
              </Row>
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-gold py-2.5 text-sm font-semibold text-primary-foreground shadow-gold"
              >
                <Check size={14} className="-mt-0.5 mr-1 inline" /> Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const iCls =
  "mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
