import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { Plus, Link2 } from "lucide-react";

export default function DashboardEmptyState() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  const handleJoin = () => {
    const t = token.trim();
    if (!t) return;
    navigate(`/JoinBusiness?token=${encodeURIComponent(t)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Plus className="h-10 w-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Welcome to BGO Shine Hub!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
        Set up your car wash business to start tracking washes, managing staff, and collecting payments.
      </p>
      <Link to={createPageUrl("Settings")}>
        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
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
    </div>
  );
}
