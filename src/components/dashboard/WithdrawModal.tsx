import { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { DEPOSIT_TOKENS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDT");
  const [network, setNetwork] = useState("TRC-20");
  const [address, setAddress] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = DEPOSIT_TOKENS.find((x) => x.symbol === token);
    if (t) setNetwork(t.networks[0]);
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      _amount: Number(amount), _token: token, _network: network, _address: address,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "withdrawal_requested", amount, token }),
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">Withdraw</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="mt-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="mt-4 font-display text-xl">Request submitted</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Withdrawals are processed within 24h. You'll be notified.
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="rounded-xl bg-background/40 p-3 text-xs">
              <div className="text-muted-foreground">Available balance</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-gradient-gold">
                {formatCurrency(profile?.balance ?? 0)}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Amount in USD</label>
              <input
                required type="number" min={10} max={Number(profile?.balance ?? 0)}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Receive in</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {DEPOSIT_TOKENS.map((t) => (
                  <button
                    type="button" key={t.symbol} onClick={() => setToken(t.symbol)}
                    className={`rounded-xl border py-2 text-xs font-semibold ${
                      token === t.symbol ? "border-primary bg-primary/10 text-primary" : "border-border"
                    }`}
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Network</label>
              <select
                value={network} onChange={(e) => setNetwork(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {(DEPOSIT_TOKENS.find((t) => t.symbol === token)?.networks || []).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Your {token} wallet address</label>
              <input
                required value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder={`Paste your ${token} address`}
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Request withdrawal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
