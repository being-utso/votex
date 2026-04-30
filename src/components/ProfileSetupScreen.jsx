import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, LoaderCircle, UserRound } from "lucide-react";

const rollRegex = /^\d{2}-\d{2}-\d{3}$/;
const formatRoll = (value) => {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

export default function ProfileSetupScreen({
  email,
  initialName = "",
  onSubmit,
  submitting = false,
  error = null
}) {
  const [name, setName] = useState(initialName);
  const [roll, setRoll] = useState("");
  const [section, setSection] = useState("");
  const [dept, setDept] = useState("");
  const [localError, setLocalError] = useState(null);

  const trimmedRoll = roll.trim();
  const isRollFormatValid = rollRegex.test(trimmedRoll);
  const formError = useMemo(() => localError ?? error, [localError, error]);
  const canSubmit =
    Boolean(name.trim())
    && Boolean(trimmedRoll)
    && Boolean(section.trim())
    && Boolean(dept.trim())
    && isRollFormatValid;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !roll.trim() || !section.trim() || !dept.trim()) {
      setLocalError("Please complete all fields.");
      return;
    }

    if (!rollRegex.test(trimmedRoll)) {
      setLocalError("Invalid roll format (use 25-06-034)");
      return;
    }

    setLocalError(null);
    try {
      await onSubmit({
        name,
        roll: trimmedRoll,
        section,
        dept
      });
    } catch (submitError) {
      setLocalError(submitError.message ?? "Failed to submit profile.");
    }
  };

  const inputClassName =
    "w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-accent/40 focus:outline-none";

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
        className="glass-card relative z-10 w-full max-w-xl rounded-3xl px-8 py-10 shadow-glow sm:px-10"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl border border-accent/50 bg-accent/20 p-2 text-accent">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              Complete Your Profile
            </p>
            <p className="text-xs text-textMuted">Required to start voting</p>
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-300">
          Signed in as <span className="font-semibold text-white">{email}</span>
        </p>

        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
          For guests: use Dept = Guest, Section = G, Roll = 00-00-000. Guests can explore the App but cannot vote.
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Roll</span>
            <input
              type="text"
              value={roll}
              onChange={(event) => setRoll(formatRoll(event.target.value))}
              className={inputClassName}
              placeholder="25-06-034"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
            />
            {trimmedRoll && !isRollFormatValid ? (
              <p className="mt-1 text-xs font-semibold text-danger">
                Invalid roll format (use 25-06-034)
              </p>
            ) : null}
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Section</span>
            <input
              type="text"
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className={inputClassName}
              placeholder="e.g. A"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Department</span>
            <input
              type="text"
              value={dept}
              onChange={(event) => setDept(event.target.value)}
              className={inputClassName}
              placeholder="e.g. CSE"
            />
          </label>

          {formError ? (
            <p className="sm:col-span-2 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-red-100">
              {formError}
            </p>
          ) : null}

          <div className="sm:col-span-2 mt-1">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="btn-accent w-full"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving profile...
                </>
              ) : (
                <>
                  <UserRound className="h-4 w-4" />
                  Submit Profile
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
