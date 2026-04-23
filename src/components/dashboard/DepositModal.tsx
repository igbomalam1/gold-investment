import { useEffect, useState } from "react";
import { X, Copy, CheckCircle2, Clock, ChevronRight, Loader2 } from "lucide-react";
import { DEPOSIT_TOKENS } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "amount" | "token" | "network" | "address";

export function DepositModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(3600);
  const [loading, setLoading] = useState(false);

  const tokenObj = DEPOSIT_TOKENS.find((t) => t.symbol === token);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  useEffect(() => {
    if (step !== "address") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const submitDeposit = async (chosenNetwork: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("assign_deposit_wallet", {
      _amount: Number(amount),
      _token: token!,
      _network: chosenNetwork,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const dep = Array.isArray(data) ? data[0] : data;
    setAddress(dep.wallet_address);
    const ms = new Date(dep.expires_at).getTime() - Date.now();
    setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    setNetwork(chosenNetwork);
    setStep("address");

    // Fire welcome/notification email (non-blocking)
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "deposit_submitted", deposit_id: dep.id }),
    }).catch(() => {});
  };

  return (
    <Modal onClose={onClose} title="Deposit funds">
      {step === "amount" && (
        <>
          <Label>Amount in USD</Label>
          <input
            type="number"
            min={10}
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-lg font-display outline-none focus:border-primary"
          />
          <div className="mt-2 text-xs text-muted-foreground">Minimum $10. Maximum $1,000,000.</div>
          <button
            disabled={!amount || +amount < 10}
            onClick={() => setStep("token")}
            className="mt-5 w-full rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-50"
          >
            Continue
          </button>
        </>
      )}

      {step === "token" && (
        <>
          <Label>Select token to deposit</Label>
          <div className="grid grid-cols-2 gap-2">
            {DEPOSIT_TOKENS.map((t) => (
              <button
                key={t.symbol}
                onClick={() => { setToken(t.symbol); setStep("network"); }}
                className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3 text-left hover:border-primary"
              >
                <div>
                  <div className="font-bold">{t.symbol}</div>
                  <div className="text-[11px] text-muted-foreground">{t.name}</div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}

      {step === "network" && tokenObj && (
        <>
          <Label>Select network for {tokenObj.symbol}</Label>
          <div className="space-y-2">
            {tokenObj.networks.map((n) => (
              <button
                key={n}
                disabled={loading}
                onClick={() => submitDeposit(n)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-background/40 p-3 hover:border-primary disabled:opacity-60"
              >
                <span className="text-sm font-medium">{n}</span>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </button>
            ))}
          </div>
          <button onClick={() => setStep("token")} className="mt-3 text-xs text-muted-foreground">← Change token</button>
        </>
      )}

      {step === "address" && (
        <>
          <div className="rounded-2xl bg-gradient-emerald p-1">
            <div className="rounded-[calc(1rem-4px)] bg-card/90 p-5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Send exactly</div>
              <div className="mt-1 font-display text-3xl text-gradient-gold">${amount}</div>
              <div className="mt-1 text-xs">in <b>{token}</b> on <b>{network}</b></div>

              <div className="mt-5">
                <div className="rounded-xl border border-border bg-background/60 p-3 text-left">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet address</div>
                  <div className="mt-1 break-all font-mono text-xs">{address}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(address);
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

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-foreground/85">{children}</div>;
}
