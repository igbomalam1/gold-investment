import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Edit3, X, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Plans — Admin" }] }),
  component: AdminPlansPage,
});

type Plan = {
  id: string;
  name: string;
  tier: string;
  daily_roi_pct: number;
  duration_days: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  sort_order: number;
};

function AdminPlansPage() {
  const [list, setList] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setList((data as Plan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("plans")
      .update({
        daily_roi_pct: Number(fd.get("roi")),
        duration_days: Number(fd.get("duration")),
        min_amount: Number(fd.get("min")),
        max_amount: Number(fd.get("max")),
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plan updated");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">Investment plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust ROI rates, ranges and durations.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {p.tier}
                </div>
                {p.tier.toLowerCase() === "diamond" && <Crown size={14} className="text-primary" />}
              </div>
              <h3 className="mt-1 font-display text-2xl text-gradient-gold">{p.name}</h3>
              <div className="mt-3 font-display text-3xl">
                {p.daily_roi_pct}%
                <span className="text-xs text-muted-foreground"> /day</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {formatCurrency(p.min_amount)} — {formatCurrency(p.max_amount)} ·{" "}
                {p.duration_days}d
              </div>
              <button
                onClick={() => setEditing(p)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-4 backdrop-blur sm:items-center">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-emerald animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl">Edit {editing.name}</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Field label="Daily ROI %" name="roi" defaultValue={editing.daily_roi_pct} />
              <Field
                label="Duration (days)"
                name="duration"
                defaultValue={editing.duration_days}
              />
              <Field label="Min amount" name="min" defaultValue={editing.min_amount} />
              <Field label="Max amount" name="max" defaultValue={editing.max_amount} />
            </div>
            <button
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <input
        type="number"
        step="0.01"
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
