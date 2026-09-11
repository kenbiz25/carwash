import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { useBusiness } from "@/lib/BusinessContext";
import { auth } from "@/lib/firebase";
import { Plus, Link2, Clock3, RefreshCw } from "lucide-react";

export default function DashboardEmptyState() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const { user } = useBusiness();

  const firstName = (user?.full_name || user?.email || "").trim().split(/\s+/)[0]?.split("@")[0] || "there";

  // In this app, signing in with Google means "join an existing operation" —
  // a real staff member — not "register a new business"; that path is the
  // deliberate email/password Create Account flow on Login. So a Google
  // account with no business yet isn't missing a step, it's waiting on a
  // super admin, and shouldn't be nudged toward "Set Up My Business".
  const isGoogleAccount = auth.currentUser?.providerData?.some((p) => p.providerId === "google.com");

  const handleJoin = () => {
    const t = token.trim();
    if (!t) return;
    navigate(`/JoinBusiness?token=${encodeURIComponent(t)}`);
  };

  if (isGoogleAccount) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <Clock3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Welcome, {firstName} - glad you're here!
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-1 mb-4">
          <Clock3 className="h-3 w-3" /> Pending assignment
        </span>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          Your sign-in worked, and your account is all set on our end - a super admin just
          needs to assign your branch and role before this dashboard has anything to show
          you. That's usually quick. Once they do, this page will show your work the
          moment you check back.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Check again
        </Button>

        {/* Still support an invite token, in case one was sent separately */}
        <div className="mt-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">or, if you have an invite</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Paste invite token…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="flex-1"
            />
            <Button onClick={handleJoin} disabled={!token.trim()} variant="outline" className="shrink-0">
              <Link2 className="h-4 w-4 mr-2" />
              Join
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            The token is in the invite link your manager or owner shared with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Plus className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Welcome, {firstName} - glad you're here!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
        Set up your car wash business to start tracking washes, managing staff, and collecting payments.
      </p>
      <Link to={createPageUrl("Settings")}>
        <Button variant="gradient">
          <Plus className="h-4 w-4 mr-2" />
          Set Up My Business
        </Button>
      </Link>

      {/* Join an existing business via invite token */}
      <div className="mt-10 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">or join existing</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Have an invite token from your manager? Paste it below.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Paste invite token…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="flex-1"
          />
          <Button
            onClick={handleJoin}
            disabled={!token.trim()}
            variant="outline"
            className="shrink-0"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Join
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          The token is in the invite email sent by your business owner.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-8 max-w-sm">
        Joining as staff instead? Ask your manager for a username, or sign in with Google
        and a super admin will assign your branch and role.
      </p>
    </div>
  );
}
