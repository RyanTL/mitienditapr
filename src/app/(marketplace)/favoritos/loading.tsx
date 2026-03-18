export default function FavoritosLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 animate-pulse">
      <main className="mx-auto w-full px-4 py-5 md:px-8 lg:max-w-5xl lg:px-8">
        <div className="mb-6 h-7 w-40 rounded-full bg-[var(--color-gray-200)]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
