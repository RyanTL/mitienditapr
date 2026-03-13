export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 lg:pb-8 animate-pulse">
      <main className="mx-auto w-full max-w-2xl px-4 py-5 md:px-8">
        {/* Back nav */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-3 w-24 rounded-full bg-[var(--color-gray-200)]" />
        </div>

        {/* Product image */}
        <div className="mb-4 h-[300px] rounded-3xl bg-[var(--color-gray-200)] md:h-[380px]" />

        {/* Product info card */}
        <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[var(--elevation-low)] space-y-4">
          <div className="h-6 w-3/4 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-8 w-1/3 rounded-full bg-[var(--color-gray-200)]" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-[var(--color-gray-200)]" />
            <div className="h-3 w-5/6 rounded-full bg-[var(--color-gray-200)]" />
            <div className="h-3 w-4/6 rounded-full bg-[var(--color-gray-200)]" />
          </div>
          {/* Add to cart button */}
          <div className="h-12 w-full rounded-2xl bg-[var(--color-gray-200)]" />
        </div>
      </main>
    </div>
  );
}
