import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X, Wallet as WalletIcon, ShieldCheck, Loader2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets — Admin" }] }),
  component: AdminWalletsPage,
});

type Wallet = {
  id: string;
  token: string;
  network: string;
  address: string;
  is_active: boolean;
  created_at: string;
};

const TOKEN_OPTIONS: { token: string; networks: string[] }[] = [
  { token: "USDT", networks: ["TRC-20", "ERC-20", "BEP-20"] },
  { token: "BTC", networks: ["Bitcoin"] },
  { token: "ETH", networks: ["ERC-20"] },
  { token: "BNB", networks: ["BEP-20"] },
  { token: "TON", networks: ["TON"] },
  { token: "SOL", networks: ["Solana"] },
  { token: "USDC", networks: ["ERC-20", "Solana", "BEP-20"] },
];

function AdminWalletsPage() {
  const [list, setList] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>(TOKEN_OPTIONS[0].token);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_wallets")
      .select("*")
      .order("token")
      .order("created_at", { ascending: false });
    setList((data as Wallet[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = list.reduce<Record<string, Wallet[]>>((acc, w) => {
    const key = `${w.token} · ${w.network}`;
    (acc[key] ||= []).push(w);
    return acc;
  }, {});

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingAdd(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("admin_wallets").insert({
      token: fd.get("token") as string,
      network: fd.get("network") as string,
      address: fd.get("address") as string,
      is_active: true,
    });
    setSavingAdd(false);
    if (error) return toast.error(error.message);
    toast.success("Wallet added to pool");
    setAdding(false);
    load();
  };

  const toggle = async (w: Wallet) => {
    const { error } = await supabase
      .from("admin_wallets")
      .update({ is_active: !w.is_active })
      .eq("id", w.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this wallet from the pool?")) return;
    const { error } = await supabase.from("admin_wallets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const activeCount = list.filter((w) => w.is_active).length;
  const tokenObj = TOKEN_OPTIONS.find((t) => t.token === selectedToken);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Wallet pool</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wallets are randomly assigned to users at deposit time. No user gets the same wallet
            twice.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-5 py-2 text-xs font-semibold text-primary-foreground shadow-gold"
        >
          <Plus size={14} /> Add wallet
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total wallets" value={list.length.toString()} icon={WalletIcon} />
        <Stat label="Active" value={activeCount.toString()} icon={ShieldCheck} positive />
        <Stat
          label="Token / network groups"
          value={Object.keys(grouped).length.toString()}
          icon={WalletIcon}
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card/40 px-5 py-12 text-center text-sm text-muted-foreground">
          No wallets yet. Add one to start receiving deposits.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, wallets]) => (
            <div
              key={key}
              className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-border/40 bg-background/30 px-5 py-3">
                <div className="font-display text-lg">{key}</div>
                <div className="text-[11px] text-muted-foreground">
                  {wallets.filter((w) => w.is_active).length} active · {wallets.length} total
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.id} className="border-b border-border/30 last:border-0">
                      <td className="px-5 py-3 break-all font-mono text-[11px]">{w.address}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            w.is_active
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {w.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => toggle(w)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                        >
                          <Power size={11} /> {w.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => remove(w.id)}
                          className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Add wallet</h3>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium">Token</label>
                <select
                  name="token"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary"
                >
                  {TOKEN_OPTIONS.map((t) => (
                    <option key={t.token} value={t.token}>
                      {t.token}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Network</label>
                <select
                  name="network"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary"
                >
                  {tokenObj?.networks.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Wallet address</label>
                <input
                  name="address"
                  required
                  placeholder="Paste wallet address"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Add as many wallets as you want per token/network — they rotate randomly.
                </p>
              </div>
              <button
                disabled={savingAdd}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
              >
                {savingAdd && <Loader2 size={14} className="animate-spin" />}
                Add to pool
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  icon: typeof WalletIcon;
  positive?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${positive ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}
      >
        <Icon size={18} />
      </div>
      <div className="mt-4 font-display text-2xl text-gradient-gold">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
