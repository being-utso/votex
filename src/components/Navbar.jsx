import { NavLink } from "react-router-dom";
import { LogOut, Shield, Vote } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { getRoundKey } from "../lib/formatters";
import logo from "../img/logo.png";

const navLinkClass = ({ isActive }) =>
  clsx(
    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ease-out",
    isActive
      ? "bg-white/15 text-white"
      : "text-slate-300 hover:bg-white/8 hover:text-white"
  );

export default function Navbar() {
  const { profile, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const roundKey = getRoundKey(settings.currentRound);
  const usedVotes = Number(profile?.votesUsedByRound?.[roundKey] || 0);
  const maxVotesFromFirestore = Number(settings.maxVotes ?? settings.maxVotesPerUser ?? 3);
  const maxVotes =
  Number.isFinite(maxVotesFromFirestore) && maxVotesFromFirestore >= 0
    ? Math.floor(maxVotesFromFirestore)
    : 3;
  const remainingVotes = maxVotes > 0 ? Math.max(maxVotes - usedVotes, 0) : "Unlimited";
  const userName = (profile?.name || profile?.displayName || "User").split(" ")[0];
  const userDisplayName = userName.length > 12 ? `${userName.slice(0, 12)}...` : userName;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/45">
      <div className="app-container">
        <div className="grid h-16 grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-2">
              <img src={logo} alt="logo" className="h-7 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold tracking-tight text-white">
                Votex
              </p>
            </div>
            <div className="hidden rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300 sm:inline-flex">
              Round {settings.currentRound}
            </div>
          </div>

          <div className="hidden justify-center md:flex">
            <nav className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <NavLink to="/" className={navLinkClass} end>
                Gallery
              </NavLink>
              {isAdmin ? (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap md:flex-nowrap">
            <div className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 lg:block">
              {maxVotes > 0 ? (
                <>
                  Votes left: <span className="font-semibold text-white">{remainingVotes}</span> / {maxVotes}
                </>
              ) : (
                "Votes left: Unlimited"
              )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
            
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1">
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile?.displayName || profile?.name || "User avatar"}
                  className="h-7 w-7 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-accent/20" />
              )}
              <div className="flex items-center gap-2">
                <p className="max-w-[6rem] md:max-w-[7.5rem] truncate text-xs md:text-sm font-medium text-white shrink">
                  {userDisplayName}
                </p>

                {profile?.roll === "00-00-000" && (
                  <span className="shrink-0 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                    Guest
                  </span>
                )}

                {profile?.isApproved === true && profile?.roll !== "00-00-000" && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-300">
                    Approved
                  </span>
                )}

                {profile?.isApproved !== true && profile?.roll !== "00-00-000" && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                    Pending
                  </span>
                )}
              </div>
              {isAdmin ? <Shield className="h-3.5 w-3.5 text-accent" /> : null}
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn-ghost btn-sm px-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
              
            </div>
          </div>
        </div>
        {profile && (
          <div className="mt-1 mb-1 text-center text-xs text-yellow-300 opacity-80">
            {profile?.roll === "00-00-000"
              ? "Guest mode. Voting is disabled."
              : profile?.isApproved !== true
              ? "Waiting for admin approval. Voting is disabled."
              : null}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 md:hidden">
        <div className="app-container py-2">
          <nav className="flex w-full items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            <NavLink to="/" className={clsx(navLinkClass, "flex-1 text-center")} end>
              Gallery
            </NavLink>
            {isAdmin ? (
              <NavLink to="/admin" className={clsx(navLinkClass, "flex-1 text-center")}>
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>
      </div>
      
    </header>
  );
}

