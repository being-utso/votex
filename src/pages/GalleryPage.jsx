import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  LoaderCircle,
  ShieldCheck,
  Vote,
  X
} from "lucide-react";
import DesignGrid from "../components/DesignGrid";
import Leaderboard from "../components/Leaderboard";
import DesignModal from "../components/DesignModal";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useDesigns } from "../hooks/useDesigns";
import { useRoundVotes } from "../hooks/useRoundVotes";
import { useRoundVoteTotals } from "../hooks/useRoundVoteTotals";
import { getRoundKey } from "../lib/formatters";
import { deleteDesignAndVotes } from "../services/designService";
import { submitVotes, toggleVote } from "../services/voteService";

const haveSameItems = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
};

export default function GalleryPage() {
  const { profile, isAdmin } = useAuth();
  const { settings } = useSettings();
  const {
    designs,
    loading,
    error,
    refreshDesigns
  } = useDesigns(settings.currentRound);

  const [selectedDesign, setSelectedDesign] = useState(null);
  const [activeVoteId, setActiveVoteId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [optimisticVoteState, setOptimisticVoteState] = useState(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [optimisticSubmittedRoundKey, setOptimisticSubmittedRoundKey] = useState(null);
  const [deletingDesignId, setDeletingDesignId] = useState(null);

  const roundKey = getRoundKey(settings.currentRound);
  const baseVotedDesignIds = Array.isArray(profile?.votedDesignIdsByRound?.[roundKey])
    ? profile.votedDesignIdsByRound[roundKey]
    : [];
  const maxVotes = Number(settings.maxVotesPerUser || 0);
  const baseUsedVotes = Number(profile?.votesUsedByRound?.[roundKey] || 0);
  const hasOptimisticRound = optimisticVoteState?.roundKey === roundKey;
  const votedDesignIds = hasOptimisticRound
    ? optimisticVoteState.votedDesignIds
    : baseVotedDesignIds;
  const usedVotes = hasOptimisticRound ? optimisticVoteState.usedVotes : baseUsedVotes;
  const remainingVotes = maxVotes > 0 ? Math.max(maxVotes - usedVotes, 0) : Number.POSITIVE_INFINITY;
  const showResults = Boolean(settings.showResults);
  const showVoteCount = showResults;
  const isSubmittedFromProfile = Boolean(profile?.submittedRounds?.[roundKey]);
  const isRoundSubmitted =
    isSubmittedFromProfile || optimisticSubmittedRoundKey === roundKey;
  const disableAllVoteButtons =
    !settings.votingOpen || isRoundSubmitted || submittingVotes || showResults;

  const { countByDesignId: adminCountByDesignId } = useRoundVotes(
    settings.currentRound,
    showVoteCount && isAdmin
  );
  const { countByDesignId: publicCountByDesignId } = useRoundVoteTotals(
    settings.currentRound,
    showVoteCount && !isAdmin
  );
  const countByDesignId = isAdmin ? adminCountByDesignId : publicCountByDesignId;
  const sortedDesigns = useMemo(() => {
    if (!showResults) {
      return designs;
    }

    return [...designs].sort((left, right) => {
      const rightCount = countByDesignId[right.id] || 0;
      const leftCount = countByDesignId[left.id] || 0;

      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return (left.title || left.creatorName || left.designerName || "").localeCompare(
        right.title || right.creatorName || right.designerName || ""
      );
    });
  }, [designs, showResults, countByDesignId]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hasOptimisticRound) {
      return;
    }

    if (
      optimisticVoteState.usedVotes === baseUsedVotes
      && haveSameItems(optimisticVoteState.votedDesignIds, baseVotedDesignIds)
    ) {
      setOptimisticVoteState(null);
    }
  }, [
    hasOptimisticRound,
    optimisticVoteState,
    baseUsedVotes,
    baseVotedDesignIds
  ]);

  useEffect(() => {
    if (optimisticSubmittedRoundKey === roundKey && isSubmittedFromProfile) {
      setOptimisticSubmittedRoundKey(null);
    }
  }, [optimisticSubmittedRoundKey, roundKey, isSubmittedFromProfile]);

  useEffect(() => {
    setOptimisticVoteState(null);
    setSubmitDialogOpen(false);
    setSubmittingVotes(false);
    setOptimisticSubmittedRoundKey(null);
    setDeletingDesignId(null);
  }, [roundKey]);

  const votingPhaseLabel = useMemo(() => {
    if (showResults) {
      return "Results live";
    }
    return settings.votingOpen ? "Voting Open" : "Voting Closed";
  }, [settings.votingOpen, showResults]);
  const submitButtonState = submittingVotes
    ? "submitting"
    : isRoundSubmitted
      ? "submitted"
      : "idle";
  const submitButtonDisabled =
    isRoundSubmitted || !settings.votingOpen || submittingVotes || Boolean(activeVoteId);

  const canToggleVote = (hasVoted) =>
    !disableAllVoteButtons
    && !activeVoteId
    && (hasVoted || remainingVotes > 0);

  const createVoteHandler = (design) => async () => {
    if (!profile) {
      return;
    }

    if (activeVoteId || submittingVotes) {
      return;
    }

    if (!settings.votingOpen) {
      setNotice({
        type: "error",
        message: "Voting is currently closed."
      });
      return;
    }

    if (isRoundSubmitted) {
      setNotice({
        type: "info",
        message: "Votes already submitted for this round."
      });
      return;
    }

    const hasVoted = votedDesignIds.includes(design.id);
    if (!hasVoted && remainingVotes <= 0) {
      setNotice({
        type: "error",
        message: "You have reached the vote limit for this round."
      });
      return;
    }

    const nextVotedDesignIds = hasVoted
      ? votedDesignIds.filter((id) => id !== design.id)
      : [...votedDesignIds, design.id];
    const nextUsedVotes = hasVoted ? Math.max(usedVotes - 1, 0) : usedVotes + 1;

    setOptimisticVoteState({
      roundKey,
      votedDesignIds: nextVotedDesignIds,
      usedVotes: nextUsedVotes
    });

    try {
      setActiveVoteId(design.id);
      const result = await toggleVote({
        user: profile,
        designId: design.id,
        roundNumber: settings.currentRound,
        roundKey,
        maxVotesPerUser: settings.maxVotesPerUser
      });

      setOptimisticVoteState({
        roundKey,
        votedDesignIds: result.nextVotedDesignIds,
        usedVotes: result.nextUsedVotes
      });
      setNotice({
        type: "success",
        message: result.action === "removed" ? "Vote removed." : "Vote selected."
      });
    } catch (voteError) {
      setOptimisticVoteState(null);
      setNotice({
        type: "error",
        message: voteError.message ?? "Failed to toggle vote."
      });
    } finally {
      setActiveVoteId(null);
    }
  };

  const handleOpenSubmitDialog = () => {
    if (!profile || submittingVotes) {
      return;
    }

    if (!settings.votingOpen) {
      setNotice({
        type: "error",
        message: "Voting is currently closed."
      });
      return;
    }

    if (isRoundSubmitted) {
      setNotice({
        type: "info",
        message: "Votes already submitted for this round."
      });
      return;
    }

    if (maxVotes > 0 && usedVotes > maxVotes) {
      setNotice({
        type: "error",
        message: "Selected votes exceed the allowed limit."
      });
      return;
    }

    setSubmitDialogOpen(true);
  };

  const handleConfirmSubmitVotes = async () => {
    if (!profile || submittingVotes) {
      return;
    }

    setSubmittingVotes(true);
    setSubmitDialogOpen(false);
    setOptimisticSubmittedRoundKey(roundKey);

    try {
      const result = await submitVotes({
        user: profile,
        roundNumber: settings.currentRound,
        roundKey,
        maxVotesPerUser: settings.maxVotesPerUser
      });

      setOptimisticVoteState({
        roundKey,
        votedDesignIds: result.votedDesignIds,
        usedVotes: result.usedVotes
      });

      setNotice({
        type: "success",
        message: "Votes submitted. Voting is now locked for this round."
      });
    } catch (submitError) {
      setOptimisticSubmittedRoundKey(null);
      setNotice({
        type: "error",
        message: submitError.message ?? "Failed to submit votes."
      });
    } finally {
      setSubmittingVotes(false);
    }
  };

  const handleDeleteDesign = async (design) => {
    if (!isAdmin || !design?.id || deletingDesignId) {
      return;
    }

    const designLabel = design.title || `Cover by ${design.creatorName || design.designerName || "Unknown Creator"}`;
    const confirmed = window.confirm(`Delete "${designLabel}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingDesignId(design.id);

    try {
      await deleteDesignAndVotes(design.id);
      if (selectedDesign?.id === design.id) {
        setSelectedDesign(null);
      }
      setNotice({
        type: "success",
        message: "Design deleted successfully."
      });
    } catch (deleteError) {
      setNotice({
        type: "error",
        message: deleteError.message ?? "Failed to delete design."
      });
    } finally {
      setDeletingDesignId(null);
    }
  };

  return (
    <div className="layout-stack">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Round {settings.currentRound}</p>
            <h1 className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-white sm:text-4xl">
              <ImageIcon className="h-6 w-6 text-accent sm:h-7 sm:w-7" />
              <span>Cover Design Gallery</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Select designs freely, then submit once to finalize your votes.
            </p>
          </div>

          <div className="grid min-w-[15rem] grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
              <p className="mb-0.5 text-[11px] uppercase tracking-wider text-slate-500">Phase</p>
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                <Clock3 className="h-4 w-4 text-accent" />
                {votingPhaseLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
              <p className="mb-0.5 text-[11px] uppercase tracking-wider text-slate-500">Votes Remaining</p>
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                <Vote className="h-4 w-4 text-accent" />
                {Number.isFinite(remainingVotes) ? `${remainingVotes} / ${maxVotes}` : "Unlimited"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          <motion.button
            type="button"
            onClick={handleOpenSubmitDialog}
            disabled={submitButtonDisabled}
            className={isRoundSubmitted ? "btn-success is-active" : "btn-accent"}
            aria-pressed={isRoundSubmitted}
            whileTap={submitButtonDisabled ? undefined : { scale: 0.96 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${submitButtonState}-content`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="inline-flex items-center gap-2"
              >
                {submitButtonState === "submitting" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : submitButtonState === "submitted" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Votes submitted
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit Votes
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <p className="text-xs text-slate-400">
            After submission, vote selections are locked for this round.
          </p>
        </div>
      </motion.section>

      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-success/50 bg-success/10 text-emerald-100"
              : notice.type === "info"
                ? "border-accent/50 bg-accent/10 text-cyan-100"
                : "border-danger/50 bg-danger/10 text-red-100"
          }`}
        >
          <div className="inline-flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {notice.message}
          </div>
        </div>
      ) : null}

      <div className="section-divider" />

      {showResults ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <DesignGrid
            designs={sortedDesigns}
            loading={loading}
            error={error}
            onRetry={refreshDesigns}
            onOpenDesign={setSelectedDesign}
            onVoteDesign={(design) => createVoteHandler(design)()}
            votedDesignIds={votedDesignIds}
            canVoteDesign={canToggleVote}
            activeVoteId={activeVoteId}
            showVoteCount={showVoteCount}
            voteCountByDesignId={countByDesignId}
            isAdmin={isAdmin}
            onDeleteDesign={handleDeleteDesign}
            deletingDesignId={deletingDesignId}
            emptyTitle="No designs yet"
            emptyMessage="No designs are available for this round."
          />

          <div className="xl:sticky xl:top-24 xl:self-start">
            <Leaderboard
              designs={sortedDesigns}
              voteCountByDesignId={countByDesignId}
              roundNumber={settings.currentRound}
              loading={loading}
            />
          </div>
        </div>
      ) : (
        <DesignGrid
          designs={sortedDesigns}
          loading={loading}
          error={error}
          onRetry={refreshDesigns}
          onOpenDesign={setSelectedDesign}
          onVoteDesign={(design) => createVoteHandler(design)()}
          votedDesignIds={votedDesignIds}
          canVoteDesign={canToggleVote}
          activeVoteId={activeVoteId}
          showVoteCount={showVoteCount}
          voteCountByDesignId={countByDesignId}
          isAdmin={isAdmin}
          onDeleteDesign={handleDeleteDesign}
          deletingDesignId={deletingDesignId}
          emptyTitle="No designs yet"
          emptyMessage="No designs are available for this round."
        />
      )}

      <DesignModal
        design={selectedDesign}
        isOpen={Boolean(selectedDesign)}
        onClose={() => setSelectedDesign(null)}
        onVote={selectedDesign ? createVoteHandler(selectedDesign) : undefined}
        canVote={Boolean(selectedDesign) && canToggleVote(votedDesignIds.includes(selectedDesign?.id))}
        hasVoted={Boolean(selectedDesign) && votedDesignIds.includes(selectedDesign?.id)}
        voting={activeVoteId === selectedDesign?.id}
        showVoteCount={showVoteCount}
        voteCount={selectedDesign ? countByDesignId[selectedDesign.id] || 0 : 0}
        currentUser={profile}
      />

      <AnimatePresence>
        {submitDialogOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="glass-card w-full max-w-md rounded-2xl p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white">Confirm Vote Submission</h3>
                <button
                  type="button"
                  onClick={() => setSubmitDialogOpen(false)}
                  className="btn-icon btn-ghost"
                  aria-label="Close confirmation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-200">
                Are you sure? You won&apos;t be able to change votes.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Selected votes: {usedVotes}
                {maxVotes > 0 ? ` / ${maxVotes}` : ""}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitDialogOpen(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmitVotes}
                  className="btn-accent flex-1"
                >
                  Submit Votes
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
