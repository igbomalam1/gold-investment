import { createFileRoute } from "@tanstack/react-router";
import { Mail, Globe, Shield, Wallet, ArrowUpRight, Loader2, Camera, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import defaultAvatar from "@/assets/profile/user-avatar.png";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Gold Empire" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, loading, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [pendingYield, setPendingYield] = useState(0);
  const [creditingYield, setCreditingYield] = useState(false);
  const fetchedRef = useRef(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      if (!user) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await (supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id));
      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchYield = async () => {
      const { data: investments } = await (supabase
        .from("investments")
        .select("amount, daily_roi_pct, started_at")
        .eq("user_id", user.id)
        .eq("status", "active") as any);

      let total = 0;
      for (const i of investments || []) {
        const days = Math.max(0, (Date.now() - new Date(i.started_at).getTime()) / 86400000);
        if (days >= 1) {
          total += (Number(i.amount) * Number(i.daily_roi_pct) / 100) * days;
        }
      }
      setPendingYield(total);
    };
    fetchYield();
  }, [user]);

  const handleCreditYield = async () => {
    if (!user || pendingYield <= 0) return;
    setCreditingYield(true);
    try {
      const { data, error } = await (supabase.rpc as any)("credit_daily_yield_to_balance", {
        p_user_id: user.id,
      });
      if (error) {
        toast.error("Failed: " + error.message);
      } else {
        const credited = Number(data) || 0;
        toast.success(`Credited ${formatCurrency(credited)} to your balance!`);
        setPendingYield(0);
        await refreshProfile();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreditingYield(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Synchronizing profile data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and security.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-emerald p-1 shadow-emerald">
          <div className="h-full rounded-[calc(1.5rem-4px)] bg-card/80 p-8 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <label htmlFor="avatar-upload" className="block relative cursor-pointer group">
                  <img
                    src={profile.avatar_url || defaultAvatar}
                    alt="Profile"
                    className="h-24 w-24 rounded-full border-2 border-gold object-cover shadow-gold transition-opacity group-hover:opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="animate-spin text-white" />
                    ) : (
                      <Camera className="text-white" />
                    )}
                  </div>
                </label>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-success p-1 text-success-foreground ring-4 ring-card shadow-sm">
                  <Shield size={14} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl">{profile.full_name || "—"}</h2>
                <div className="text-sm text-muted-foreground">{profile.email}</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success uppercase tracking-wider">
                    Verified Member
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined {formatDate(user?.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-gold p-1 shadow-gold">
          <div className="h-full rounded-[calc(1.5rem-4px)] bg-card/80 p-8 backdrop-blur-xl flex flex-col justify-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Total Available Balance
            </div>
            <div className="mt-2 font-display text-4xl lg:text-5xl text-gradient-gold">
              {formatCurrency(profile.balance)}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-success">
              <ArrowUpRight size={14} />
              <span>+3.2% from yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {pendingYield > 0 && (
        <div className="rounded-3xl bg-gradient-emerald p-1 shadow-emerald">
          <div className="rounded-[calc(1.5rem-4px)] bg-card/80 p-6 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-success">
                <TrendingUp size={14} /> Pending Yield
              </div>
              <div className="mt-1 font-display text-3xl text-success">
                {formatCurrency(pendingYield)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Yield accumulated from your active investments.
              </p>
            </div>
            <button
              onClick={handleCreditYield}
              disabled={creditingYield}
              className="flex items-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success/90 transition-colors disabled:opacity-60"
            >
              {creditingYield ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <TrendingUp size={14} />
              )}
              {creditingYield ? "Crediting..." : "Withdraw Yield"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Mail, label: "Email Address", value: profile.email || "—" },
          { icon: Globe, label: "Country / Region", value: profile.country || "—" },
          {
            icon: Wallet,
            label: "Total Invested Capital",
            value: formatCurrency(profile.total_invested),
          },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur transition-all hover:border-primary/40"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <f.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 text-base font-semibold">{f.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
