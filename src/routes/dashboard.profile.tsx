import { createFileRoute } from "@tanstack/react-router";
import { Mail, Globe, CalendarDays, Shield, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Gold Empire" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user } = useAuth();
  if (!profile) return null;
  const initials = (profile.full_name || profile.email || "U").split(" ").map(n => n[0]).slice(0, 2).join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and security.</p>
      </div>

      <div className="rounded-3xl bg-gradient-emerald p-1 shadow-emerald">
        <div className="rounded-[calc(1.5rem-4px)] bg-card/80 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-gold font-display text-3xl text-primary-foreground shadow-gold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl">{profile.full_name || "—"}</h2>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                <Shield size={11} /> Verified
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total balance</div>
              <div className="font-display text-2xl text-gradient-gold">{formatCurrency(profile.balance)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Mail, label: "Email", value: profile.email || "—" },
          { icon: Globe, label: "Country", value: profile.country || "—" },
          { icon: CalendarDays, label: "Member since", value: formatDate(user?.created_at) },
          { icon: Wallet, label: "Total invested", value: formatCurrency(profile.total_invested) },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary"><f.icon size={18} /></div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
              <div className="mt-0.5 text-sm font-semibold">{f.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
