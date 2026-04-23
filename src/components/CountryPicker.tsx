import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/mock-data";
import { ChevronDown, Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export function CountryPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = COUNTRIES.find((c) => c.code === value);
  const filtered = useMemo(
    () =>
      COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.code.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-left text-sm outline-none transition-colors focus:border-primary"
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              <span className="text-lg">{selected.flag}</span>
              <span>{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select your country</span>
          )}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-hidden rounded-xl border border-border bg-popover shadow-emerald">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country…"
              className="w-full bg-transparent py-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/50"
              >
                <span className="text-lg">{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No country found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
