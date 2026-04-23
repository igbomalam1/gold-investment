import { UserPlus, Wallet, LineChart, Coins } from "lucide-react";

const STEPS = [
  { icon: UserPlus, title: "Create Account", text: "Sign up in 60 seconds. No paperwork. Pick your country, verify your email." },
  { icon: Wallet, title: "Fund with Crypto", text: "Deposit BTC, ETH, USDT, BNB, TRX or TON. Your wallet, your custody, instant credit." },
  { icon: Coins, title: "Choose a Plan", text: "Pick from Silver to Diamond. Our desk allocates across gold, crypto and forex." },
  { icon: LineChart, title: "Earn Daily ROI", text: "Watch profits credit every trading day. Withdraw or compound — your call." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-emerald opacity-50" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Process</p>
          <h2 className="mt-3 font-display text-4xl lg:text-5xl">
            Four steps to <span className="text-gradient-gold">compounding wealth</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-3xl border border-border/60 bg-card/70 p-7 backdrop-blur"
            >
              <div className="absolute -top-3 right-5 rounded-full bg-gradient-gold px-3 py-0.5 font-display text-sm text-primary-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <s.icon size={22} />
              </div>
              <h3 className="mt-5 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
