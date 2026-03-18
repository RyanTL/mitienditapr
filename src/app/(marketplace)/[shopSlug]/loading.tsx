export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 lg:pb-8 animate-pulse">
      <main className="mx-auto w-full px-4 py-5 md:px-8 lg:max-w-5xl lg:px-8">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-4 w-32 rounded-full bg-[var(--color-gray-200)]" />
        </header>

        {/* Shop hero */}
        <div className="mb-4 rounded-3xl bg-[var(--color-white)] p-5 shadow-[var(--elevation-low)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[var(--color-gray-200)]" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 rounded-full bg-[var(--color-gray-200)]" />
              <div className="h-3 w-24 rounded-full bg-[var(--color-gray-200)]" />
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-[var(--color-gray-200)]" />
          <div className="mt-2 h-3 w-3/4 rounded-full bg-[var(--color-gray-200)]" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-[var(--color-white)] shadow-[var(--elevation-low)]">
              <div className="h-[160px] rounded-t-3xl bg-[var(--color-gray-200)]" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-4 w-1/2 rounded-full bg-[var(--color-gray-200)]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
