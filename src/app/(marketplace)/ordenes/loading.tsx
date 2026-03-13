export default function OrdenesLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 animate-pulse">
      <main className="mx-auto w-full px-4 py-5 md:px-8 lg:max-w-2xl lg:px-8">
        <div className="mb-6 h-7 w-32 rounded-full bg-[var(--color-gray-200)]" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-[var(--color-white)] p-4 shadow-[var(--elevation-low)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-6 w-20 rounded-full bg-[var(--color-gray-200)]" />
              </div>
              <div className="h-3 w-40 rounded-full bg-[var(--color-gray-200)]" />
              <div className="flex gap-2">
                <div className="h-[60px] w-[60px] rounded-2xl bg-[var(--color-gray-200)]" />
                <div className="h-[60px] w-[60px] rounded-2xl bg-[var(--color-gray-200)]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-5 w-20 rounded-full bg-[var(--color-gray-200)]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
