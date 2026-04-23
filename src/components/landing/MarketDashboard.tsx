import { useEffect, useState } from "react";
import { MARKETS } from "@/lib/mock-data";
import { TrendingDown, TrendingUp } from "lucide-react";

function jitter(price: number) {
  const drift = (Math.random() - 0.5) * 0.004;
  return price * (1 + drift);
}

export function MarketDashboard() {
  const [data, setData] = useState(MARKETS);

  useEffect(() => {
    const t = setInterval(() => {
      setData((cur) =>
        cur.map((m) => ({
          ...m,
          price: jitter(m.price),
          change24h: m.change24h + (Math.random() - 0.5) * 0.08,
        })),
      );
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="markets" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Live Markets</p>
            <h2 className="mt-3 font-display text-4xl lg:text-5xl">
              The pulse of <span className="text-gradient-gold">global wealth</span>
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Crypto, metals and forex pairs streamed in real-time. Your portfolio
              is actively positioned across all three on every trading day.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs text-success md:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Live feed
          </div>
        </div>

        {/* Marquee */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40 py-4 backdrop-blur">
          <div className="marquee-track flex w-max gap-10 pl-10">
            {[...data, ...data].map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-primary">{m.symbol}</span>
                <span className="font-mono text-sm">${m.price.toFixed(m.price > 100 ? 2 : 4)}</span>
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    m.change24h >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {m.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {m.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.slice(0, 8).map((m) => (
            <div
              key={m.symbol}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/50 hover:shadow-gold"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-bold text-primary">{m.symbol}</div>
                  <div className="text-xs text-muted-foreground">{m.name}</div>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    m.change24h >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {m.change24h >= 0 ? "+" : ""}
                  {m.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="mt-4 font-display text-2xl">
                ${m.price.toLocaleString(undefined, { maximumFractionDigits: m.price > 100 ? 2 : 4 })}
              </div>
              <div className="mt-3 h-12">
                <Spark seed={m.symbol} positive={m.change24h >= 0} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Spark({ seed, positive }: { seed: string; positive: boolean }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const h = ((seed.charCodeAt(i % seed.length) * (i + 7)) % 30) + 5;
    return `${(i / 23) * 100},${40 - h}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      <polyline
        fill="none"
        stroke={positive ? "oklch(0.72 0.17 150)" : "oklch(0.6 0.22 28)"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}
