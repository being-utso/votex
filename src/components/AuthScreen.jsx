import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../img/logo.png";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.232 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.678 36 24 36c-5.211 0-9.618-3.333-11.283-7.946l-6.522 5.025C9.506 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.03 12.03 0 0 1-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

export default function AuthScreen({ error }) {
  const { signInWithGoogle, authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const message = error ?? authError;

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (signInError) {
      console.error(signInError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-screen">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-20 right-4 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="glass-card relative z-10 w-full max-w-lg rounded-3xl px-8 py-10 shadow-glow sm:px-10"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl border border-accent/50 bg-accent/20 p-2 text-accent">
            <img src={logo} alt="logo" className="h-7 w-auto" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              Votex
            </p>
            <p className="text-xs text-textMuted">Secure panel for curated design decisions</p>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold leading-tight text-white">
          Review covers.
          <br />
          Vote with confidence.
        </h1>
        <p className="mt-4 text-sm leading-6 text-textMuted">
          Sign in with Google, complete your profile if needed, and start voting right away.
        </p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="btn-accent mt-8 w-full py-3"
        >
          <GoogleIcon />
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Auth + Firestore rules keep votes private during active rounds.
        </div>

        {message ? (
          <p className="mt-5 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-red-100">
            {message}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
