const skeletonClass = "skeleton-shimmer rounded-xl bg-white/10";

export default function AdminDashboardSkeleton() {
  return (
    <div className="layout-stack" aria-hidden="true">
      <section className="layout-stack">
        <div className="space-y-2">
          <div className={`h-3 w-28 ${skeletonClass}`} />
          <div className={`h-6 w-72 ${skeletonClass}`} />
          <div className={`h-4 w-80 ${skeletonClass}`} />
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-5">
        <div className="panel-surface 2xl:col-span-3">
          <div className={`h-6 w-52 ${skeletonClass}`} />
          <div className={`mt-2 h-4 w-80 ${skeletonClass}`} />
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
            <div className={`h-11 sm:col-span-2 ${skeletonClass}`} />
            <div className={`h-28 sm:col-span-2 ${skeletonClass}`} />
            <div className={`h-11 ${skeletonClass}`} />
            <div className={`h-11 ${skeletonClass}`} />
            <div className={`h-11 sm:col-span-2 ${skeletonClass}`} />
            <div className={`h-10 w-44 sm:col-span-2 ${skeletonClass}`} />
          </div>
        </div>

        <div className="panel-surface 2xl:col-span-2">
          <div className={`h-6 w-40 ${skeletonClass}`} />
          <div className={`mt-2 h-4 w-72 ${skeletonClass}`} />
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <div className={`h-10 sm:col-span-2 ${skeletonClass}`} />
            <div className={`h-10 ${skeletonClass}`} />
            <div className={`h-10 ${skeletonClass}`} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-3">
            <div className={`h-10 ${skeletonClass}`} />
            <div className={`h-10 ${skeletonClass}`} />
            <div className={`h-10 ${skeletonClass}`} />
          </div>
        </div>
        </div>
      </section>

      <div className="section-divider" />

      <section className="layout-stack">
        <div className="space-y-2">
          <div className={`h-3 w-24 ${skeletonClass}`} />
          <div className={`h-6 w-72 ${skeletonClass}`} />
          <div className={`h-4 w-80 ${skeletonClass}`} />
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <div className="panel-surface">
            <div className={`h-6 w-48 ${skeletonClass}`} />
            <div className={`mt-2 h-4 w-72 ${skeletonClass}`} />
            <div className="mt-4 space-y-4">
              <div className={`h-11 ${skeletonClass}`} />
              <div className={`h-24 ${skeletonClass}`} />
              <div className={`h-20 ${skeletonClass}`} />
              <div className={`h-10 w-44 ${skeletonClass}`} />
            </div>
          </div>

          <div className="panel-surface">
            <div className={`h-6 w-44 ${skeletonClass}`} />
            <div className={`mt-2 h-4 w-72 ${skeletonClass}`} />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={`h-12 ${skeletonClass}`} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
