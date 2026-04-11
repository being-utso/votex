import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, Lock, Vote } from "lucide-react";
import clsx from "clsx";

export default function VoteButton({
  onClick,
  disabled = false,
  loading = false,
  hasVoted = false,
  compact = false
}) {
  const label = hasVoted ? "Voted" : "Vote";
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      layout
      className={clsx(
        "btn-base",
        compact ? "w-auto text-xs" : "w-full",
        hasVoted
          ? "btn-success is-active active-glow"
          : isDisabled
            ? "btn-muted"
            : "btn-accent"
      )}
      aria-pressed={hasVoted}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${loading ? "loading" : hasVoted ? "voted" : isDisabled ? "disabled" : "idle"}-icon`}
          initial={{ opacity: 0, scale: 0.8, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="inline-flex"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : hasVoted ? (
            <Check className="h-4 w-4" />
          ) : isDisabled ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Vote className="h-4 w-4" />
          )}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${loading ? "loading" : label}-label`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
