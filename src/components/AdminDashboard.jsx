import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ImageIcon,
  EyeOff,
  Link,
  Mail,
  Eye,
  LoaderCircle,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  Vote
} from "lucide-react";
import clsx from "clsx";
import AdminDashboardSkeleton from "./AdminDashboardSkeleton";

export default function AdminDashboard({
  settings,
  designs,
  voteCountByDesignId,
  users = [],
  loading = false,
  error = null,
  onRetry,
  usersLoading = false,
  usersError = null,
  onRetryUsers,
  onUploadDesign,
  onToggleResults,
  onUpdateVoteLimit,
  onResetAllVotes,
  onReopenVoting,
  onDeleteDesign,
  onApproveUser,
  onDeleteUser,
  onViewVotes,
  deletingDesignId,
  approvingUserId,
  deletingUserId,
  busyAction
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [previewState, setPreviewState] = useState("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedDesignForVotes, setSelectedDesignForVotes] = useState(null);
  const [voteInspectorOpen, setVoteInspectorOpen] = useState(false);
  const [designVotes, setDesignVotes] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [votesError, setVotesError] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [maxVotesInput, setMaxVotesInput] = useState(
    String(Number(settings.maxVotes ?? settings.maxVotesPerUser ?? 3))
  );

  useEffect(() => {
    const rawUrl = imageUrl.trim();

    if (!rawUrl) {
      setPreviewState("idle");
      setPreviewUrl("");
      return undefined;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch (error) {
      setPreviewState("invalid");
      setPreviewUrl("");
      return undefined;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setPreviewState("invalid");
      setPreviewUrl("");
      return undefined;
    }

    const normalizedUrl = parsedUrl.toString();
    setPreviewUrl(normalizedUrl);
    setPreviewState("loading");

    let cancelled = false;
    const checker = new window.Image();
    checker.onload = () => {
      if (!cancelled) {
        setPreviewState("valid");
      }
    };
    checker.onerror = () => {
      if (!cancelled) {
        setPreviewState("invalid");
      }
    };
    checker.src = normalizedUrl;

    return () => {
      cancelled = true;
      checker.onload = null;
      checker.onerror = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (uploadStatus !== "success") {
      return undefined;
    }

    const timer = window.setTimeout(() => setUploadStatus("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [uploadStatus]);

  useEffect(() => {
    setMaxVotesInput(String(Number(settings.maxVotes ?? settings.maxVotesPerUser ?? 3)));
  }, [settings.maxVotes, settings.maxVotesPerUser]);

  const leaderboard = useMemo(
    () =>
      [...designs]
        .map((design) => ({
          ...design,
          voteCount: voteCountByDesignId[design.id] || 0
        }))
        .sort((a, b) => b.voteCount - a.voteCount),
    [designs, voteCountByDesignId]
  );
  const usersList = useMemo(() => users, [users]);
  const normalizedUserQuery = userSearchQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedUserQuery) {
      return usersList;
    }

    return usersList.filter((user) => {
      const userName = (user.name || user.displayName || "").toLowerCase();
      const userRoll = (user.roll || "").toLowerCase();
      return userName.includes(normalizedUserQuery) || userRoll.includes(normalizedUserQuery);
    });
  }, [usersList, normalizedUserQuery]);

  const submitUpload = async (event) => {
    event.preventDefault();

    if (
      !title.trim()
      || !imageUrl.trim()
      || !creatorName.trim()
      || previewState !== "valid"
    ) {
      return;
    }

    setUploadStatus("idle");
    const uploadSucceeded = await onUploadDesign({
      imageUrl,
      title,
      creatorName
    });

    if (uploadSucceeded) {
      setImageUrl("");
      setTitle("");
      setCreatorName("");
      setUploadStatus("success");
    }
  };

  const openVotesInspector = async (design) => {
    if (!design?.id || !onViewVotes) {
      return;
    }

    setSelectedDesignForVotes(design);
    setVoteInspectorOpen(true);
    setVotesLoading(true);
    setVotesError(null);

    try {
      const votes = await onViewVotes(design);
      setDesignVotes(Array.isArray(votes) ? votes : []);
    } catch (error) {
      setVotesError(error.message ?? "Failed to load votes for this design.");
      setDesignVotes([]);
    } finally {
      setVotesLoading(false);
    }
  };

  const closeVotesInspector = () => {
    setVoteInspectorOpen(false);
    setSelectedDesignForVotes(null);
    setDesignVotes([]);
    setVotesError(null);
    setVotesLoading(false);
  };

  const isBusy = (actionName) => busyAction === actionName;
  const trimmedImageUrl = imageUrl.trim();
  const trimmedCreatorName = creatorName.trim();
  const trimmedTitle = title.trim();
  const imageUrlError = !trimmedImageUrl
    ? "Image URL is required."
    : previewState === "invalid"
      ? "URL must load an image."
      : "";
  const titleError = !trimmedTitle ? "Title is required." : "";
  const creatorNameError = !trimmedCreatorName ? "Creator name is required." : "";
  const showImageUrlError = Boolean(imageUrlError);
  const showTitleError = Boolean(titleError);
  const showCreatorNameError = Boolean(creatorNameError);
  const isUploadValid =
    Boolean(trimmedImageUrl)
    && Boolean(trimmedTitle)
    && Boolean(trimmedCreatorName)
    && previewState === "valid";
  const uploadVisualState = isBusy("upload")
    ? "loading"
    : uploadStatus === "success"
      ? "success"
      : "idle";
  const toggleResultsState = isBusy("toggleResults")
    ? "loading"
    : settings.showResults
      ? "visible"
      : "hidden";
  const normalizedMaxVotesInput = maxVotesInput.trim();
  const hasNumericVoteLimit = /^\d+$/.test(normalizedMaxVotesInput);
  const parsedMaxVotes = hasNumericVoteLimit ? Number(normalizedMaxVotesInput) : NaN;
  const currentMaxVotes = Number(settings.maxVotes ?? settings.maxVotesPerUser ?? 3);
  const voteLimitChanged = hasNumericVoteLimit && parsedMaxVotes !== currentMaxVotes;
  const voteLimitError = normalizedMaxVotesInput && !hasNumericVoteLimit
    ? "Use a whole number (0 or more)."
    : "";
  const outlineActionButtonClass = "btn-ghost w-full";
  const accentActionButtonClass = "btn-accent";
  const dangerActionButtonClass =
    "btn-ghost w-full border-danger/35 bg-danger/10 text-red-100 hover:border-danger/55 hover:bg-danger/15";
  const dangerInlineButtonClass =
    "btn-ghost btn-sm border-danger/35 bg-danger/10 text-red-100 hover:border-danger/55 hover:bg-danger/15";
  const successInlineButtonClass =
    "btn-ghost btn-sm border-success/35 bg-success/10 text-emerald-100 hover:border-success/55 hover:bg-success/15";
  const inputClassName =
    "w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-accent/40 focus:outline-none";

  const submitVoteLimit = async (event) => {
    event.preventDefault();

    if (!onUpdateVoteLimit || !hasNumericVoteLimit) {
      return;
    }

    await onUpdateVoteLimit(parsedMaxVotes);
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="layout-stack">
      {error ? (
        <div className="rounded-xl border border-danger/45 bg-danger/10 px-4 py-3 text-sm text-red-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Couldn&apos;t load admin data right now.
            </span>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="btn-ghost btn-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="layout-stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin Tools</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">
              Round Controls & Submission Tools
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Upload submissions and control voting from a structured workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-5">
        <motion.div
          layout
          className={clsx(
            "panel-surface transition-all duration-300 2xl:col-span-3",
            uploadStatus === "success" && "border-success/40 shadow-glow"
          )}
        >
          <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Link className="h-5 w-5 text-accent" />
            Submission Upload
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Add new designs to the current round using direct image links.
          </p>
          <form onSubmit={submitUpload} className="mt-4 grid grid-cols-1 gap-5 border-t border-white/10 pt-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Image URL</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (uploadStatus === "success") {
                    setUploadStatus("idle");
                  }
                }}
                placeholder="https://example.com/cover-design.jpg"
                className={inputClassName}
              />
              {showImageUrlError ? (
                <p className="mt-1 text-xs font-semibold text-danger">{imageUrlError}</p>
              ) : null}

              <AnimatePresence initial={false}>
                {imageUrl.trim() ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="mt-3"
                  >
                    {previewState === "invalid" ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-danger/45 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Invalid image URL
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
                        <p className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Live Preview
                        </p>
                        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
                          <img
                            src={previewUrl}
                            alt="Design preview"
                            className={clsx(
                              "aspect-[16/9] w-full object-cover transition-opacity duration-200",
                              previewState === "loading" && "opacity-45"
                            )}
                            loading="lazy"
                          />
                          <AnimatePresence>
                            {previewState === "loading" ? (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px]"
                              >
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  Loading preview...
                                </span>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </label>

            <label>
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (uploadStatus === "success") {
                    setUploadStatus("idle");
                  }
                }}
                placeholder="Neon Skyline"
                className={inputClassName}
              />
              {showTitleError ? (
                <p className="mt-1 text-xs font-semibold text-danger">{titleError}</p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Creator Name</span>
              <input
                type="text"
                value={creatorName}
                onChange={(event) => {
                  setCreatorName(event.target.value);
                  if (uploadStatus === "success") {
                    setUploadStatus("idle");
                  }
                }}
                placeholder="Ariana K."
                className={inputClassName}
              />
              {showCreatorNameError ? (
                <p className="mt-1 text-xs font-semibold text-danger">{creatorNameError}</p>
              ) : null}
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Round</span>
              <div className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                Round {settings.currentRound}
              </div>
            </label>

            <div className="sm:col-span-2 space-y-2">
              <motion.button
                type="submit"
                disabled={
                  isBusy("upload")
                  || !trimmedTitle
                  || !isUploadValid
                }
                whileTap={
                  isBusy("upload")
                  || !trimmedTitle
                  || !isUploadValid
                    ? undefined
                    : { scale: 0.985 }
                }
                className={clsx(accentActionButtonClass, "w-full sm:w-auto")}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={uploadVisualState}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="inline-flex items-center gap-2"
                  >
                    {uploadVisualState === "loading" ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Saving design...
                      </>
                    ) : uploadVisualState === "success" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved to round {settings.currentRound}
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4" />
                        Save URL to round {settings.currentRound}
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <AnimatePresence initial={false}>
                {uploadStatus === "success" ? (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Upload complete. The gallery updates in real time.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </form>
        </motion.div>

        <div className="panel-surface 2xl:col-span-2">
          <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Vote className="h-5 w-5 text-accent" />
            Voting Controls
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Manage result visibility, vote resets, and round reopening.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <motion.button
              type="button"
              onClick={onToggleResults}
              disabled={isBusy("toggleResults")}
              className={clsx(
                accentActionButtonClass,
                "w-full sm:col-span-2",
                settings.showResults && "is-active active-glow"
              )}
              aria-pressed={settings.showResults}
              whileTap={isBusy("toggleResults") ? undefined : { scale: 0.96 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${toggleResultsState}-content`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="inline-flex items-center gap-2"
                >
                  {toggleResultsState === "loading" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : toggleResultsState === "visible" ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide Results
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Publish Results
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button
              type="button"
              onClick={onReopenVoting}
              disabled={isBusy("reopenVoting")}
              className={clsx(outlineActionButtonClass, "sm:col-span-1")}
            >
              {isBusy("reopenVoting") ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              Reopen Voting
            </button>

            <button
              type="button"
              onClick={onResetAllVotes}
              disabled={isBusy("resetAllVotes")}
              className={clsx(dangerActionButtonClass, "sm:col-span-1")}
            >
              {isBusy("resetAllVotes") ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset All Votes
            </button>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Vote Limit</p>
            <p className="mt-1 text-xs text-slate-400">
              Set maximum votes per user (stored in <span className="font-mono">settings/global</span>).
            </p>
            <form
              onSubmit={submitVoteLimit}
              className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <label>
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                  Max Votes
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={maxVotesInput}
                  onChange={(event) => setMaxVotesInput(event.target.value)}
                  className={inputClassName}
                  placeholder="3"
                />
                {voteLimitError ? (
                  <p className="mt-1 text-xs font-semibold text-danger">{voteLimitError}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Current value: {currentMaxVotes}</p>
                )}
              </label>
              <button
                type="submit"
                disabled={isBusy("updateVoteLimit") || !hasNumericVoteLimit || !voteLimitChanged}
                className="btn-accent w-full sm:w-auto"
              >
                {isBusy("updateVoteLimit") ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Vote className="h-4 w-4" />
                )}
                Save Limit
              </button>
            </form>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Status</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Round</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {settings.currentRound}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Voting</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {settings.votingOpen ? "Open" : "Closed"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Results</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {settings.showResults ? "Published" : "Hidden"}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      <div className="section-divider" />

      <section className="layout-stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Management</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">
              Moderation & User Administration
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review submissions, inspect votes, and manage user approvals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <section className="panel-surface h-full">
            <div className="mb-4 border-b border-white/10 pb-4">
              <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-white">
                <BarChart3 className="h-5 w-5 text-accent" />
                Design Moderation
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Delete designs or inspect submitted voters for each submission.
              </p>
            </div>
            <div className="subtle-scrollbar max-h-[30rem] overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 text-left text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Design</th>
                    <th className="px-3 py-2">Creator</th>
                    <th className="px-3 py-2 text-right">Votes</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={4}>
                        No submissions in this round yet.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((item) => {
                      const isDeleting = deletingDesignId === item.id;
                      return (
                        <tr key={item.id} className="border-t border-white/10">
                          <td className="px-3 py-3 text-white">
                            {item.title || `Cover by ${item.creatorName || item.designerName || "Unknown Creator"}`}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {item.creatorName || item.designerName || "Unknown Creator"}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-accent">
                            {settings.showResults ? item.voteCount : "Hidden"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openVotesInspector(item)}
                              disabled={votesLoading && selectedDesignForVotes?.id === item.id}
                              className="btn-ghost btn-sm"
                            >
                              {votesLoading && selectedDesignForVotes?.id === item.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              View Votes
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteDesign?.(item)}
                              disabled={isBusy("deleteDesign") || isDeleting}
                              className={dangerInlineButtonClass}
                            >
                              {isDeleting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel-surface h-full">
            <div className="mb-4 border-b border-white/10 pb-4">
              <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Users className="h-5 w-5 text-accent" />
                User Management
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Search users, approve pending accounts, or remove access.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(event) => setUserSearchQuery(event.target.value)}
                  placeholder="Search by name or roll"
                  className={`${inputClassName} pl-9`}
                />
              </label>
              <p className="text-xs text-slate-500">
                Showing {filteredUsers.length} of {usersList.length}
              </p>
            </div>
            <div className="mt-4">
              {usersError ? (
                <div className="rounded-xl border border-danger/45 bg-danger/10 px-4 py-3 text-sm text-red-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Couldn&apos;t load users right now.
                    </span>
                    {onRetryUsers ? (
                      <button
                        type="button"
                        onClick={onRetryUsers}
                        className="btn-ghost btn-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="subtle-scrollbar max-h-[30rem] overflow-y-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 text-left text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Roll</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Dept</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td className="px-3 py-4 text-slate-400" colSpan={6}>
                            <span className="inline-flex items-center gap-2">
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Loading users...
                            </span>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-slate-400" colSpan={6}>
                            {normalizedUserQuery ? "No users match this search." : "No users found."}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const userName = user.name || user.displayName || "Unknown";
                          const userRoll = user.roll || "-";
                          const userEmail = user.email || "-";
                          const userDept = user.dept || "-";
                          const isApproved = user.isApproved === true;
                          const isApproving = approvingUserId === user.id;
                          const isDeleting = deletingUserId === user.id;

                          return (
                            <tr key={user.id} className="border-t border-white/10">
                              <td className="px-3 py-3 text-white">{userName}</td>
                              <td className="px-3 py-3 text-slate-300">{userRoll}</td>
                              <td className="px-3 py-3 text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                                  {userEmail}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                  {userDept}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={clsx(
                                    "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
                                    isApproved
                                      ? "border-success/45 bg-success/10 text-emerald-100"
                                      : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                  )}
                                >
                                  {isApproved ? "Approved" : "Pending"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onApproveUser?.(user)}
                                    disabled={isApproved || isApproving || isDeleting}
                                    className={successInlineButtonClass}
                                  >
                                    {isApproving ? (
                                      <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-4 w-4" />
                                    )}
                                    {isApproved ? "Approved" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteUser?.(user)}
                                    disabled={isDeleting || isApproving}
                                    className={dangerInlineButtonClass}
                                  >
                                    {isDeleting ? (
                                      <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <AnimatePresence>
        {voteInspectorOpen ? (
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
              className="glass-card w-full max-w-2xl rounded-2xl p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    Votes: {selectedDesignForVotes?.title || "Selected Design"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visible to admin only
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeVotesInspector}
                  className="btn-ghost btn-sm"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/55 p-3">
                {votesLoading ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading votes...
                  </div>
                ) : votesError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-100">{votesError}</p>
                    {selectedDesignForVotes ? (
                      <button
                        type="button"
                        onClick={() => openVotesInspector(selectedDesignForVotes)}
                        className="btn-ghost btn-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </button>
                    ) : null}
                  </div>
                ) : designVotes.length === 0 ? (
                  <p className="text-sm text-slate-400">No votes found for this design in this round.</p>
                ) : (
                  <div className="subtle-scrollbar max-h-[22rem] overflow-y-auto">
                    <ul className="space-y-2">
                      {designVotes.map((vote) => (
                        <li
                          key={`${vote.userId}-${vote.userEmail}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-white">{vote.userName}</p>
                          <p className="text-xs text-slate-400">{vote.userEmail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
