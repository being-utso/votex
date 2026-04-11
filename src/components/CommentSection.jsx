import { useEffect, useState } from "react";
import { LoaderCircle, MessageSquarePlus } from "lucide-react";
import { MAX_COMMENT_LENGTH } from "../lib/constants";
import { formatTimestamp } from "../lib/formatters";
import { createComment, listenToComments } from "../services/commentService";

export default function CommentSection({ designId, user, fillHeight = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = listenToComments(
      designId,
      (data) => {
        setComments(data);
        setLoading(false);
      },
      (commentsError) => {
        setError(commentsError.message ?? "Failed to load comments.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [designId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createComment({
        designId,
        user,
        text
      });
      setText("");
    } catch (submitError) {
      setError(submitError.message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`flex h-full flex-col ${fillHeight ? "min-h-0" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-accent" />
        <h4 className="font-display text-base font-semibold text-white">Comments</h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Share thoughtful feedback..."
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent/40 focus:outline-none"
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{text.length}/{MAX_COMMENT_LENGTH}</span>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
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

      <div
        className={`subtle-scrollbar mt-4 flex flex-col gap-3 overflow-y-auto pr-1 ${
          fillHeight ? "min-h-0 flex-1 max-h-[22rem] lg:max-h-none" : "max-h-[16rem]"
        }`}
      >
        {loading ? (
          <>
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
            <div className="skeleton-shimmer h-16 rounded-xl bg-white/8" />
          </>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-slate-400">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                <p className="truncate font-medium text-slate-200">{comment.userName}</p>
                <time>{formatTimestamp(comment.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{comment.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
