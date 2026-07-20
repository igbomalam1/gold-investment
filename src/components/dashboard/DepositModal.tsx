import { useEffect, useState } from "react";
import { X, Copy, CheckCircle2, Clock, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Step = "select" | "payment";

type DepositOption = { token: string; network: string };

type DepositResult = {
  id: string;
  amount: number;
  token: string;
  network: string;
  wallet_address: string;
  expires_at: string;
};

export function DepositModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [options, setOptions] = useState<DepositOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selected, setSelected] = useState<DepositOption | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deposit, setDeposit] = useState<DepositResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(3600);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_active_deposit_options");
      setLoadingOptions(false);
      if (error) {
        console.error(error);
        toast.error("Failed to load deposit options");
        return;
      }
      setOptions((data as DepositOption[]) || []);
    })();
  }, []);

  useEffect(() => {
    if (step !== "payment" || !deposit) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, deposit]);

  const handleSubmit = async () => {
    if (!selected || !amount || +amount < 10) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("assign_deposit_wallet", {
        _amount: Number(amount),
        _token: selected.token,
        _network: selected.network,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      const dep = data as DepositResult;
      setDeposit(dep);
      const ms = new Date(dep.expires_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
      setStep("payment");

      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "deposit_submitted", deposit_id: dep.id }),
      }).catch(() => {});
    } catch {
      setSubmitting(false);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const grouped = options.reduce<Record<string, DepositOption[]>>((acc, o) => {
    (acc[o.token] ||= []).push(o);
    return acc;
  }, {});

  return (
    <Modal onClose={onClose} title="Deposit funds">
      {step === "select" && (
        <>
          {loadingOptions ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              No deposit options available. Please contact support.
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs font-medium text-foreground/85">Select token</div>
                <div className="mt-2 grid gap-2">
                  {Object.entries(grouped).map(([token, opts]) => (
                    <div key={token} className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="text-xs font-semibold text-foreground/80">{token}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opts.map((o) => {
                          const active = selected?.token === o.token && selected?.network === o.network;
                          return (
                            <button
                              key={o.network}
                              type="button"
                              onClick={() => setSelected(o)}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                active
                                  ? "bg-primary text-primary-foreground shadow-gold"
                                  : "border border-border bg-background/60 text-foreground hover:border-primary"
                              }`}
                            >
                              {o.network}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-foreground/85">Amount in USD</div>
                <input
                  type="number"
                  min={10}
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-lg font-display outline-none focus:border-primary"
                />
                <div className="mt-1 text-xs text-muted-foreground">Minimum $10.</div>
              </div>

              <button
                disabled={!selected || !amount || +amount < 10 || submitting}
                onClick={handleSubmit}
                className="mt-3 w-full rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Continue <ChevronRight size={14} />
                  </span>
                )}
              </button>
            </>
          )}
        </>
      )}

      {step === "payment" && deposit && (
        <>
          <div className="rounded-2xl bg-gradient-emerald p-1">
            <div className="rounded-[calc(1rem-4px)] bg-card/90 p-5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Send exactly
              </div>
              <div className="mt-1 font-display text-3xl text-gradient-gold">
                ${deposit.amount}
              </div>
              <div className="mt-1 text-xs">
                in <b>{deposit.token}</b> on <b>{deposit.network}</b>
              </div>

              <div className="mt-5">
                <div className="rounded-xl border border-border bg-background/60 p-3 text-left">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Wallet address
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {deposit.wallet_address}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(deposit.wallet_address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold text-primary"
                >
                  {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy address"}
                </button>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1.5 text-xs text-warning">
                <Clock size={12} /> Expires in {mm}:{ss}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            After sending, your deposit will be reviewed by our team and credited within 1 hour.
            You'll receive a notification once confirmed.
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-medium hover:border-primary"
          >
            I've made the payment
          </button>
        </>
      )}
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}
