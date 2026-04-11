import { motion } from "framer-motion";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";

export default function ApprovalPendingScreen({ onSignOut }) {
  return (
    <div className="app-screen">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-20 right-4 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="glass-card relative z-10 w-full max-w-lg rounded-3xl px-8 py-10 text-center shadow-glow sm:px-10"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/45 bg-accent/15 text-accent">
          <Clock3 className="h-6 w-6" />
        </div>

        <h1 className="font-display text-3xl font-bold text-white">Waiting for approval</h1>
        <p className="mt-3 text-sm leading-6 text-textMuted">
          Your profile was submitted successfully. Access will be enabled after an admin approves your account.
        </p>

        <div className="mt-6 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            You can close this page and come back later.
          </span>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="btn-ghost mx-auto mt-6"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
