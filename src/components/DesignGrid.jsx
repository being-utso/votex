import { AlertTriangle, LayoutGrid, RotateCcw } from "lucide-react";
import DesignCard from "./DesignCard";
import DesignCardSkeleton from "./DesignCardSkeleton";

export default function DesignGrid({
  designs,
  loading,
  error,
  onRetry,
  onOpenDesign,
  onVoteDesign,
  votedDesignIds,
  canVoteDesign,
  activeVoteId,
  showVoteCount,
  voteCountByDesignId,
  isAdmin = false,
  onDeleteDesign,
  deletingDesignId,
  emptyTitle = "No designs yet",
  emptyMessage = "Admin can upload the first submission from dashboard."
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Loading gallery submissions...</p>
        <section className="content-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <DesignCardSkeleton key={index} />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-surface text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-danger/35 bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-semibold text-white">Couldn&apos;t load designs</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-textMuted">
          We hit a temporary issue while loading the gallery. Please try again.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="btn-accent mx-auto mt-5"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  if (!designs.length) {
    return (
      <div className="panel-surface text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <LayoutGrid className="h-6 w-6 text-textMuted" />
        </div>
        <h3 className="font-display text-xl font-semibold text-white">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-textMuted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section className="content-grid">
      {designs.map((design) => {
        const hasVoted = votedDesignIds.includes(design.id);
        return (
          <DesignCard
            key={design.id}
            design={design}
            hasVoted={hasVoted}
            canVote={canVoteDesign(hasVoted)}
            voteCount={voteCountByDesignId[design.id] || 0}
            showVoteCount={showVoteCount}
            voting={activeVoteId === design.id}
            onVote={() => onVoteDesign(design)}
            onOpen={() => onOpenDesign(design)}
            canDelete={isAdmin && Boolean(onDeleteDesign)}
            deleting={deletingDesignId === design.id}
            onDelete={() => onDeleteDesign?.(design)}
          />
        );
      })}
    </section>
  );
}
