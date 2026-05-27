import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/keys")({
  head: () => ({ meta: [{ title: "Reset Keys — Admin" }] }),
  component: AdminKeysPage,
});

type ResetKey = {
  id: string;
  key: string;
  is_used: boolean;
  created_at: string;
};

function AdminKeysPage() {
  const [keys, setKeys] = useState<ResetKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reset_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setKeys(data as ResetKey[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generateKeys = async () => {
    setGenerating(true);
    const { error } = await supabase.rpc("admin_generate_reset_keys", { _count: 5 });
    setGenerating(false);
    if (error) {
      toast.error(error.message || "Failed to generate keys");
      return;
    }
    toast.success("Generated 5 new reset keys");
    load();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Key copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Reset Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage one-time keys for password recovery.
          </p>
        </div>
        <button
          onClick={generateKeys}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          Generate 5 Keys
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur">
          <div className="divide-y divide-border/50">
            {keys.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No keys generated yet.
              </div>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <div className="font-mono text-lg font-bold tracking-widest text-foreground">
                      {k.key}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Created: {formatDateTime(k.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {k.is_used ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        Used
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                          Valid
                        </span>
                        <button
                          onClick={() => copyKey(k.key)}
                          className="rounded-full bg-border/50 p-1.5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                          title="Copy key"
                        >
                          <Copy size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
