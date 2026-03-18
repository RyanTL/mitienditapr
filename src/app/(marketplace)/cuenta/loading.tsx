export default function CuentaLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-page)] pb-32 animate-pulse">
      <main className="mx-auto w-full px-4 py-5 md:px-8 lg:max-w-2xl lg:px-8">
        <div className="mb-6 h-7 w-32 rounded-full bg-[var(--color-gray-200)]" />
        <div className="rounded-3xl bg-[var(--color-white)] p-5 shadow-[var(--elevation-low)] space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--color-gray-200)]" />
            <div className="space-y-2">
              <div className="h-5 w-36 rounded-full bg-[var(--color-gray-200)]" />
              <div className="h-3 w-48 rounded-full bg-[var(--color-gray-200)]" />
            </div>
          </div>
          <div className="h-px bg-[var(--color-gray-200)]" />
          {/* Settings rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-32 rounded-full bg-[var(--color-gray-200)]" />
              <div className="h-4 w-4 rounded-full bg-[var(--color-gray-200)]" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
