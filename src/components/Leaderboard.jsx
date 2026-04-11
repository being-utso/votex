import { useMemo } from "react";
import { Award, BarChart3, Crown, Medal, Trophy } from "lucide-react";
import clsx from "clsx";

const getTitle = (design) => {
  const creator = design.creatorName || design.designerName || "Unknown Creator";
  return design.title || `Cover by ${creator}`;
};

const getCreator = (design) => design.creatorName || design.designerName || "Unknown Creator";

const getRankAccent = (rank) => {
  if (rank === 1) {
    return "border-accent/55 bg-accent/15";
  }
  if (rank === 2) {
    return "border-slate-300/40 bg-slate-300/10";
  }
  if (rank === 3) {
    return "border-success/45 bg-success/15";
  }
  return "border-white/10 bg-white/[0.04]";
};

const RankIcon = ({ rank }) => {
  if (rank === 1) {
    return <Crown className="h-3.5 w-3.5 text-accent" />;
  }

  if (rank === 2) {
    return <Trophy className="h-3.5 w-3.5 text-slate-200" />;
  }

  if (rank === 3) {
    return <Medal className="h-3.5 w-3.5 text-success" />;
  }

  return <Award className="h-3.5 w-3.5 text-slate-400" />;
};

export default function Leaderboard({
  designs,
  voteCountByDesignId,
  roundNumber,
  loading = false
}) {
  const rankedDesigns = useMemo(
    () =>
      [...designs]
        .map((design) => ({
          ...design,
          voteCount: voteCountByDesignId[design.id] || 0
        }))
        .sort((a, b) => {
          if (b.voteCount !== a.voteCount) {
            return b.voteCount - a.voteCount;
          }
          return getTitle(a).localeCompare(getTitle(b));
        }),
    [designs, voteCountByDesignId]
  );

  return (
    <aside className="panel-surface-compact">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Round {roundNumber}</p>
        <h3 className="mt-1 inline-flex items-center gap-1.5 font-display text-lg font-semibold text-white">
          <BarChart3 className="h-4 w-4 text-accent/80" />
          <span>Leaderboard</span>
        </h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-shimmer h-14 rounded-xl border border-white/10 bg-white/10"
            />
          ))}
        </div>
      ) : rankedDesigns.length === 0 ? (
        <p className="text-sm text-slate-400">No ranked submissions yet.</p>
      ) : (
        <ol className="subtle-scrollbar max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {rankedDesigns.map((design, index) => {
            const rank = index + 1;
            const accent = getRankAccent(rank);

            return (
              <li
                key={design.id}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                  accent,
                  rank === 1 && "active-glow"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/25">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                    <RankIcon rank={rank} />
                    {rank}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">
                    {getTitle(design)}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-400">{getCreator(design)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-accent">{design.voteCount}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Votes</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
