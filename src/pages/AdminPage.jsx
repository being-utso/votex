import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Shield, X } from "lucide-react";
import AdminDashboard from "../components/AdminDashboard";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useDesigns } from "../hooks/useDesigns";
import { useRoundVotes } from "../hooks/useRoundVotes";
import { useUsers } from "../hooks/useUsers";
import { deleteDesignAndVotes, uploadDesign } from "../services/designService";
import { approveUser, deleteUserAndVotes } from "../services/userService";
import {
  fetchDesignVotesForAdmin,
  publishRoundVoteTotals,
  reopenVotingSubmissions,
  resetAllVotes
} from "../services/voteService";

export default function AdminPage() {
  const { profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const {
    designs,
    loading: designsLoading,
    error: designsError,
    refreshDesigns
  } = useDesigns(settings.currentRound);
  const {
    users,
    loading: usersLoading,
    error: usersError,
    refreshUsers
  } = useUsers();
  const { countByDesignId } = useRoundVotes(settings.currentRound, true);

  const [busyAction, setBusyAction] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deletingDesignId, setDeletingDesignId] = useState(null);
  const [approvingUserId, setApprovingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const getSuccessMessage = (actionName) => {
    switch (actionName) {
      case "upload":
        return "Design added successfully.";
      case "toggleResults":
        return "Results visibility updated.";
      case "updateVoteLimit":
        return "Vote limit updated.";
      case "resetAllVotes":
        return "All votes have been reset.";
      case "reopenVoting":
        return "Voting reopened.";
      case "deleteDesign":
        return "Design deleted successfully.";
      case "approveUser":
        return "User approved.";
      case "deleteUser":
        return "User deleted.";
      default:
        return "Action completed.";
    }
  };

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const withAction = async (actionName, action, successMessage) => {
    setBusyAction(actionName);
    try {
      await action();
      setNotice({
        id: `${actionName}-${Date.now()}`,
        type: "success",
        message: successMessage ?? getSuccessMessage(actionName)
      });
      return true;
    } catch (error) {
      setNotice({
        id: `${actionName}-${Date.now()}`,
        type: "error",
        message: error.message ?? "Action failed."
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleUploadDesign = async ({ imageUrl, title, creatorName }) =>
    withAction("upload", async () => {
      await uploadDesign({
        imageUrl,
        title,
        creatorName,
        roundNumber: settings.currentRound
      });
    });

  const handleToggleResults = async () => {
    if (!settings.showResults) {
      const confirmed = window.confirm("Are you sure you want to reveal results?");
      if (!confirmed) {
        return false;
      }
    }

    return withAction("toggleResults", async () => {
      if (!settings.showResults) {
        await publishRoundVoteTotals(settings.currentRound);
      }
      await updateSettings({
        showResults: !settings.showResults
      });
    }, settings.showResults ? "Results hidden." : "Results published.");
  };

  const handleResetAllVotes = async () => {
    const confirmed = window.confirm("Reset all votes? This cannot be undone.");
    if (!confirmed) {
      return false;
    }

    return withAction("resetAllVotes", async () => {
      const result = await resetAllVotes();
      return result;
    }, "All vote records were removed.");
  };

  const handleReopenVoting = async () =>
    withAction("reopenVoting", async () => {
      await reopenVotingSubmissions();
      await updateSettings({
        votingOpen: true,
        showResults: false
      });
    }, "Voting reopened. All votes unlocked for editing.");

  const handleUpdateVoteLimit = async (maxVotes) =>
    withAction("updateVoteLimit", async () => {
      await updateSettings({
        maxVotesPerUser: maxVotes,
        maxVotes
      });
    }, `Vote limit set to ${maxVotes}.`);

  const handleDeleteDesign = async (design) => {
    if (!design?.id || deletingDesignId) {
      return false;
    }

    const designLabel = design.title || `Cover by ${design.creatorName || design.designerName || "Unknown Creator"}`;
    const confirmed = window.confirm(`Delete "${designLabel}"? This cannot be undone.`);
    if (!confirmed) {
      return false;
    }

    setDeletingDesignId(design.id);
    try {
      return await withAction("deleteDesign", async () => {
        await deleteDesignAndVotes(design.id);
      }, "Design and related votes deleted.");
    } finally {
      setDeletingDesignId(null);
    }
  };

  const handleApproveUser = async (user) => {
    if (!user?.id || approvingUserId || user.isApproved === true) {
      return false;
    }

    setApprovingUserId(user.id);
    try {
      const label = user.name || user.displayName || user.email || "User";
      return await withAction("approveUser", async () => {
        await approveUser(user.id);
      }, `${label} approved.`);
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id || deletingUserId) {
      return false;
    }

    if (user.id === profile?.uid) {
      setNotice({
        id: `deleteUser-${Date.now()}`,
        type: "error",
        message: "You cannot delete your own account from this panel."
      });
      return false;
    }

    const userLabel = user.name || user.displayName || user.email || "this user";
    const confirmed = window.confirm(`Delete ${userLabel} and all linked votes? This cannot be undone.`);
    if (!confirmed) {
      return false;
    }

    setDeletingUserId(user.id);
    try {
      return await withAction("deleteUser", async () => {
        await deleteUserAndVotes(user);
      }, "User and related votes removed.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleViewVotes = async (design) =>
    fetchDesignVotesForAdmin({
      designId: design?.id,
      roundNumber: settings.currentRound
    });

  return (
    <div className="layout-stack">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin Control Room</p>
            <h1 className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-white sm:text-4xl">
              <Shield className="h-6 w-6 text-accent" />
              Votex Dashboard
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Manage submissions, rounds, and result visibility with secure controls.
            </p>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {notice ? (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, x: 32, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, y: -4, scale: 0.97 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={`fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-card backdrop-blur-xl ${
              notice.type === "success"
                ? "border-success/45 bg-success/15 text-emerald-100"
                : "border-danger/45 bg-danger/15 text-red-100"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex">
                {notice.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </span>
              <p className="flex-1 text-sm">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="btn-icon btn-ghost h-7 w-7 rounded-md text-slate-200"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="section-divider" />

      <AdminDashboard
        settings={settings}
        designs={designs}
        voteCountByDesignId={countByDesignId}
        users={users}
        loading={designsLoading}
        error={designsError}
        onRetry={refreshDesigns}
        usersLoading={usersLoading}
        usersError={usersError}
        onRetryUsers={refreshUsers}
        onUploadDesign={handleUploadDesign}
        onToggleResults={handleToggleResults}
        onUpdateVoteLimit={handleUpdateVoteLimit}
        onResetAllVotes={handleResetAllVotes}
        onReopenVoting={handleReopenVoting}
        onDeleteDesign={handleDeleteDesign}
        onApproveUser={handleApproveUser}
        onDeleteUser={handleDeleteUser}
        onViewVotes={handleViewVotes}
        deletingDesignId={deletingDesignId}
        approvingUserId={approvingUserId}
        deletingUserId={deletingUserId}
        busyAction={busyAction}
      />
    </div>
  );
}
