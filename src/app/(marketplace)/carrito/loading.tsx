export default function CarritoLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 animate-pulse">
      <main className="mx-auto w-full max-w-md px-4 py-5 md:max-w-3xl md:px-8 lg:max-w-4xl lg:px-8">
        <div className="mb-6 h-7 w-24 rounded-full bg-[var(--color-gray-200)]" />
        <div className="space-y-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-3xl bg-[var(--color-white)] p-4 shadow-[var(--elevation-low)]">
              <div className="h-[80px] w-[80px] shrink-0 rounded-2xl bg-[var(--color-gray-200)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-3 w-1/2 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-5 w-1/3 rounded-full bg-[var(--color-gray-200)]" />
              </div>
            </div>
          ))}
        </div>
        {/* Order summary */}
        <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[var(--elevation-low)] space-y-3">
          <div className="h-4 w-1/2 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-px bg-[var(--color-gray-200)]" />
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded-full bg-[var(--color-gray-200)]" />
            <div className="h-3 w-20 rounded-full bg-[var(--color-gray-200)]" />
          </div>
          <div className="h-12 w-full rounded-2xl bg-[var(--color-gray-200)]" />
        </div>
      </main>
    </div>
  );
}
