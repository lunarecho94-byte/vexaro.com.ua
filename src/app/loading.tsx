export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="h-8 w-48 rounded-lg bg-surface animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden p-3 animate-pulse"
          >
            <div className="aspect-square w-full rounded-lg bg-surface-raised mb-3" />
            <div className="h-4 w-3/4 rounded bg-surface-raised mb-2" />
            <div className="h-4 w-1/2 rounded bg-surface-raised mb-4" />
            <div className="h-10 w-full rounded-lg bg-surface-raised mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
