import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { genLiveInvestment, type LiveInvestment, formatCurrency } from "@/lib/mock-data";
import { TrendingUp } from "lucide-react";

export function LiveInvestmentToasts() {
  const [current, setCurrent] = useState<LiveInvestment | null>(null);

  useEffect(() => {
    const tick = () => setCurrent(genLiveInvestment());
    tick();
    const t = setInterval(tick, 9000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-[60] sm:left-6">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.name + current.amount}
            initial={{ opacity: 0, x: -40, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-auto flex max-w-xs items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 px-4 py-3 shadow-gold backdrop-blur-xl"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-gold text-lg">
              {current.flag}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                <span className="font-semibold">{current.name}</span>
                <span className="text-muted-foreground"> from </span>
                <span className="font-medium">{current.country}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp size={11} className="text-success" />
                <span className="text-success font-semibold">invested {formatCurrency(current.amount)}</span>
                <span className="text-muted-foreground">· {current.plan}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
