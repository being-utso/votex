import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Expand, Trash2, UserRound } from "lucide-react";
import clsx from "clsx";
import VoteButton from "./VoteButton";

export default function DesignCard({
  design,
  canVote,
  hasVoted,
  voteCount,
  showVoteCount,
  voting,
  onVote,
  onOpen,
  canDelete = false,
  deleting = false,
  onDelete
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const creatorName = design.creatorName || design.designerName || "Unknown Creator";
  const designTitle = design.title || `Cover by ${creatorName}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={clsx(
        "design-card-surface group flex h-full min-w-0 flex-col overflow-hidden",
        hasVoted && "active-glow border-accent/40"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative block overflow-hidden text-left"
        aria-label={`Open ${designTitle}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950/75">
          {!imageLoaded ? (
            <div className="skeleton-shimmer absolute inset-0 animate-pulse bg-white/10" />
          ) : null}
          <img
            src={design.imageUrl}
            alt={designTitle}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`h-full w-full object-contain transition-all duration-300 ease-out group-hover:scale-[1.05] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/28 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute right-3 top-3 z-10 rounded-lg border border-white/20 bg-black/35 p-2 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Expand className="h-4 w-4" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] px-4 pb-3 pt-10">
            <h3 className="line-clamp-1 text-base font-semibold text-white drop-shadow-[0_1px_2px_rgba(2,6,23,0.9)]">
              {designTitle}
            </h3>
            <p className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-slate-200/95 drop-shadow-[0_1px_1px_rgba(2,6,23,0.9)]">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{creatorName}</span>
            </p>
          </div>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 border-t border-white/10 p-4">
        <div className="min-h-[1.75rem]">
          {showVoteCount ? (
            <div className="inline-flex min-h-[1.75rem] items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-medium text-slate-200">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Total votes: {voteCount ?? 0}
            </div>
          ) : (
            <div className="inline-flex min-h-[1.75rem] items-center text-xs text-slate-400">
              Votes hidden until results are published
            </div>
          )}
        </div>

        <div className={clsx("mt-auto grid gap-2", canDelete ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          <VoteButton
            onClick={onVote}
            disabled={!canVote || deleting}
            loading={voting}
            hasVoted={hasVoted}
            compact={false}
          />
          {canDelete ? (
            <motion.button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              whileTap={deleting ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={clsx(
                "btn-ghost w-full border-danger/35 bg-danger/10 text-red-100 hover:border-danger/55 hover:bg-danger/15",
                deleting && "cursor-not-allowed opacity-70"
              )}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
