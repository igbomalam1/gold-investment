import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — Gold Empire Investment" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { error } = await supabase.rpc("reset_password_with_key", {
        _email: email,
        _new_password: password,
        _reset_key: resetKey,
      });

      if (error) {
        toast.error(error.message || "Invalid or already used reset key.");
        setSubmitting(false);
        return;
      }

      toast.success("Password reset successfully! You can now sign in.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-md px-5">
        <Link to="/" className="inline-block">
          <Logo size={48} />
        </Link>

        <div className="mt-8 rounded-3xl glass p-7 shadow-emerald">
          <h1 className="font-display text-3xl">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email, new password, and the reset key provided by an admin.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground/85">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-foreground/85">Reset Key</label>
              <input
                required
                type="text"
                value={resetKey}
                onChange={(e) => setResetKey(e.target.value)}
                placeholder="e.g. 8A3B2C1D"
                className="mt-1.5 w-full font-mono uppercase tracking-wider rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Don't have a reset key? Please contact the admin to receive one.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground/85">New Password</label>
              <div className="relative mt-1.5">
                <input
                  required
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
