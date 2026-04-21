import { useEffect, useMemo, useState } from "react";
import { Heart, LoaderCircle, MessageSquarePlus, Reply } from "lucide-react";
import { MAX_COMMENT_LENGTH } from "../lib/constants";
import { formatTimestamp } from "../lib/formatters";
import {
  createComment,
  deleteComment,
  listenToComments,
  toggleHideComment,
  toggleLike
} from "../services/commentService";
import { useAuth } from "../contexts/AuthContext";

const getTimeValue = (timestamp) => {
  if (typeof timestamp?.toMillis === "function") {
    return timestamp.toMillis();
  }

  const parsed = new Date(timestamp ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isLikedByUser = (comment, uid) => {
  if (!uid) {
    return false;
  }

  const likedBy = Array.isArray(comment?.likedBy) ? comment.likedBy : [];
  return likedBy.some((entry) => entry?.uid === uid);
};

const getLikePreviewText = (likedBy) => {
  if (!Array.isArray(likedBy) || likedBy.length === 0) {
    return "";
  }

  const names = likedBy
    .slice(0, 2)
    .map((entry) => entry?.name || "User")
    .join(", ");

  if (likedBy.length <= 2) {
    return names;
  }

  return `${names} +${likedBy.length - 2} others`;
};

export default function CommentSection({ designId, user, fillHeight = false }) {
  const { profile, isAdmin } = useAuth();
  const currentUser = user ?? profile;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [activeLikeId, setActiveLikeId] = useState(null);
  const [activeModerationId, setActiveModerationId] = useState(null);
  const [likesModalCommentId, setLikesModalCommentId] = useState(null);

  const canComment = Boolean(currentUser?.uid);

  useEffect(() => {
    setComments([]);
    setError(null);
    setLoading(true);
    setReplyTarget(null);
    setLikesModalCommentId(null);

    const unsubscribe = listenToComments(
      designId,
      (data) => {
        setComments(Array.isArray(data) ? data : []);
        setLoading(false);
      },
      (commentsError) => {
        setError(commentsError?.message ?? "Failed to load comments.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [designId]);

  const { parentComments, repliesByParentId } = useMemo(() => {
    const parents = [];
    const repliesMap = new Map();

    comments.forEach((comment) => {
      if (comment?.parentId) {
        const existingReplies = repliesMap.get(comment.parentId) ?? [];
        existingReplies.push(comment);
        repliesMap.set(comment.parentId, existingReplies);
        return;
      }

      parents.push(comment);
    });

    parents.sort((left, right) => getTimeValue(right?.createdAt) - getTimeValue(left?.createdAt));

    repliesMap.forEach((replyList, parentId) => {
      const sortedReplies = [...replyList].sort(
        (left, right) => getTimeValue(left?.createdAt) - getTimeValue(right?.createdAt)
      );
      repliesMap.set(parentId, sortedReplies);
    });

    return {
      parentComments: parents,
      repliesByParentId: repliesMap
    };
  }, [comments]);
  const commentsById = useMemo(() => {
    const byId = new Map();
    comments.forEach((comment) => {
      if (comment?.id) {
        byId.set(comment.id, comment);
      }
    });
    return byId;
  }, [comments]);
  const likesModalComment = likesModalCommentId ? commentsById.get(likesModalCommentId) ?? null : null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canComment) {
      setError("You must be signed in to comment.");
      return;
    }

    if (!text.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createComment({
        designId,
        user: currentUser,
        text,
        parentId: replyTarget?.id ?? null
      });
      setText("");
      setReplyTarget(null);
    } catch (submitError) {
      setError(submitError?.message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = async (comment) => {
    if (!canComment) {
      setError("You must be signed in to like comments.");
      return;
    }

    try {
      setActiveLikeId(comment.id);
      setError(null);
      await toggleLike(comment, currentUser);
    } catch (likeError) {
      setError(likeError?.message ?? "Failed to update like.");
    } finally {
      setActiveLikeId(null);
    }
  };

  const handleToggleHide = async (comment) => {
    if (!isAdmin) {
      return;
    }

    try {
      setActiveModerationId(comment.id);
      setError(null);
      await toggleHideComment(comment);
    } catch (hideError) {
      setError(hideError?.message ?? "Failed to update moderation state.");
    } finally {
      setActiveModerationId(null);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!isAdmin) {
      return;
    }

    const shouldDelete = window.confirm("Delete this comment? This cannot be undone.");
    if (!shouldDelete) {
      return;
    }

    try {
      setActiveModerationId(comment.id);
      setError(null);
      await deleteComment(comment.id);
    } catch (deleteError) {
      setError(deleteError?.message ?? "Failed to delete comment.");
    } finally {
      setActiveModerationId(null);
    }
  };

  const renderCommentCard = (comment, isReply = false) => {
    const likedBy = Array.isArray(comment?.likedBy) ? comment.likedBy : [];
    const liked = isLikedByUser(comment, currentUser?.uid);
    const likePreviewText = getLikePreviewText(likedBy);
    const isLikeLoading = activeLikeId === comment.id;
    const isModerating = activeModerationId === comment.id;

    return (
      <article
        key={comment.id}
        className={[
          "rounded-xl border border-white/10 bg-slate-950/70",
          isReply ? "p-2.5" : "p-3"
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-300">{comment.userName || "Anonymous"}</p>
          <p className="text-[11px] text-slate-500">{formatTimestamp(comment.createdAt)}</p>
        </div>

        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
          {comment.hidden ? "Comment hidden by admin." : comment.text}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => void handleLikeToggle(comment)}
            disabled={!canComment || isLikeLoading}
            className={[
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
              liked
                ? "border-pink-400/50 bg-pink-500/10 text-pink-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
            ].join(" ")}
          >
            {isLikeLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Heart className="h-3.5 w-3.5" fill={liked ? "currentColor" : "none"} />
            )}
            <span>{comment.likes ?? 0}</span>
            <span>{liked ? "Liked" : "Like"}</span>
          </button>

          {likedBy.length > 0 ? (
            <button
              type="button"
              onClick={() => setLikesModalCommentId(comment.id)}
              className="text-slate-400 hover:text-white"
            >
              {likePreviewText}
            </button>
          ) : null}

          {!isReply ? (
            <button
              type="button"
              onClick={() => setReplyTarget({ id: comment.id, userName: comment.userName || "Anonymous" })}
              disabled={!canComment}
              className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          ) : null}

          {isAdmin ? (
            <div className="ml-auto inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleToggleHide(comment)}
                disabled={isModerating}
                className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-yellow-300 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {comment.hidden ? "Unhide" : "Hide"}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteComment(comment)}
                disabled={isModerating}
                className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-red-300 hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const listClassName = "mt-4 flex flex-col gap-3";

  return (
    <section
      className={
        fillHeight
          ? "flex h-full min-h-0 flex-col overflow-y-auto pr-1 subtle-scrollbar"
          : "flex flex-col"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-accent" />
        <h4 className="font-display text-base font-semibold text-white">Comments</h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {replyTarget ? (
          <p className="text-xs text-blue-300">
            Replying to {replyTarget.userName}
            <button
              className="ml-2 text-red-400"
              type="button"
              onClick={() => setReplyTarget(null)}
            >
              Cancel
            </button>
          </p>
        ) : null}

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder={canComment ? "Share thoughtful feedback..." : "Sign in to comment"}
          disabled={!canComment || submitting}
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {text.length}/{MAX_COMMENT_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!canComment || submitting || !text.trim()}
            className="btn-accent btn-sm"
          >
            {submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            Post
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-2 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      <div className={listClassName}>
        {loading ? (
          <>
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
          </>
        ) : parentComments.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-slate-400">
            No comments yet.
          </div>
        ) : (
          parentComments.map((parentComment) => {
            const replies = repliesByParentId.get(parentComment.id) ?? [];

            return (
              <div key={parentComment.id} className="space-y-2">
                {renderCommentCard(parentComment, false)}

                {replies.length > 0 ? (
                  <div className="ml-4 space-y-2 border-l border-white/10 pl-3">
                    {replies.map((replyComment) => renderCommentCard(replyComment, true))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {likesModalComment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-card">
            <h4 className="text-sm font-semibold text-white">Liked by</h4>

            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1 subtle-scrollbar">
              {(likesModalComment?.likedBy ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">No likes yet.</p>
              ) : (
                likesModalComment.likedBy.map((entry, index) => (
                  <p key={`${entry.uid}-${index}`} className="text-sm text-slate-200">
                    {entry.name || "User"}
                  </p>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn-ghost btn-sm mt-4"
              onClick={() => setLikesModalCommentId(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
