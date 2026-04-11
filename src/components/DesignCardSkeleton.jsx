export default function DesignCardSkeleton() {
  return (
    <div className="design-card-surface skeleton-shimmer flex h-full flex-col overflow-hidden">
      <div className="aspect-[4/3] w-full bg-white/10" />
      <div className="flex flex-1 flex-col gap-4 border-t border-white/10 p-4">
        <div className="space-y-3">
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
          <div className="h-6 w-2/3 rounded-lg bg-white/10" />
        </div>
        <div className="mt-auto h-10 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
