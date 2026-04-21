import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ImageIcon,
  Maximize2,
  Minimize2,
  Move,
  UserRound,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import VoteButton from "./VoteButton";
import CommentSection from "./CommentSection";

export default function DesignModal({
  design,
  isOpen,
  onClose,
  onVote,
  canVote,
  hasVoted,
  voting,
  showVoteCount,
  voteCount,
  currentUser
}) {
  const creatorName = design?.creatorName || design?.designerName || "Unknown Creator";
  const designTitle = design?.title || `Cover by ${creatorName}`;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && design ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-md md:p-4 lg:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="glass-panel mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-y-auto rounded-none border-white/20 md:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="inline-flex max-w-full items-center gap-1.5 font-display text-lg font-semibold text-white">
                  <ImageIcon className="h-4 w-4 shrink-0 text-accent/80" />
                  <span className="truncate">{designTitle}</span>
                </h3>
                <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-textMuted">
                  <UserRound className="h-4 w-4" />
                  {creatorName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon btn-ghost text-slate-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 h-auto lg:h-[80vh]">
              <div className="relative min-h-[44vh] border-b border-white/10 lg:min-h-0 lg:border-b-0">
                <TransformWrapper
                  minScale={1}
                  maxScale={4}
                  centerOnInit
                  smooth
                  wheel={{ step: 0.12 }}
                  doubleClick={{
                    mode: "zoomIn",
                    step: 0.7,
                    animationTime: 260,
                    animationType: "easeOut"
                  }}
                  zoomAnimation={{
                    size: 0.24,
                    animationTime: 260,
                    animationType: "easeOut"
                  }}
                  alignmentAnimation={{
                    sizeX: 100,
                    sizeY: 100,
                    animationTime: 220,
                    animationType: "easeOut"
                  }}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute left-3 top-3 z-10 flex gap-2">
                        <button
                          type="button"
                          onClick={() => zoomIn(0.35, 260, "easeOut")}
                          className="btn-icon border border-white/25 bg-black/45 text-slate-200 hover:bg-black/60"
                          aria-label="Zoom in"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => zoomOut(0.35, 260, "easeOut")}
                          className="btn-icon border border-white/25 bg-black/45 text-slate-200 hover:bg-black/60"
                          aria-label="Zoom out"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => resetTransform(260, "easeOut")}
                          className="btn-icon border border-white/25 bg-black/45 text-slate-200 hover:bg-black/60"
                          aria-label="Reset zoom"
                        >
                          <Minimize2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Move className="h-3.5 w-3.5" />
                          Drag to pan
                        </span>
                        <span className="mx-2 text-slate-500">|</span>
                        <span className="inline-flex items-center gap-1">
                          <Maximize2 className="h-3.5 w-3.5" />
                          Scroll to zoom
                        </span>
                      </div>

                      <div className="flex h-full min-h-[44vh] items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 p-4 sm:p-5">
                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                          <img
                            src={design.imageUrl}
                            alt={designTitle}
                            className="h-full w-full object-contain select-none"
                            draggable={false}
                          />
                        </TransformComponent>
                      </div>
                    </>
                  )}
                </TransformWrapper>
              </div>

              <aside className="flex min-h-0 flex-col gap-4 p-4 sm:p-5">
                <div className="panel-surface-compact">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Creator</p>
                  <p className="mt-1 text-base font-semibold text-white">{creatorName}</p>

                  <div className="mt-4 space-y-3">
                    {showVoteCount ? (
                      <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-slate-300">
                        <BarChart3 className="h-3.5 w-3.5 text-accent" />
                        {voteCount ?? 0} votes
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Vote count stays hidden until the admin publishes results.
                      </p>
                    )}

                    <VoteButton
                      onClick={onVote}
                      disabled={!canVote}
                      loading={voting}
                      hasVoted={hasVoted}
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <CommentSection designId={design.id} user={currentUser} fillHeight />
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
