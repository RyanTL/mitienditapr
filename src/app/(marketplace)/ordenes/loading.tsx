export default function OrdenesLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-gray)] pb-36 lg:pb-8">
      <main className="mx-auto w-full max-w-md animate-pulse px-4 pt-6 md:max-w-3xl md:px-5 lg:max-w-4xl">
        <div className="mb-6 h-8 w-32 rounded-full bg-[var(--color-gray-200)]" />
        <div className="mb-3 h-3.5 w-24 rounded-full bg-[var(--color-gray-200)]" />
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-[var(--color-gray)] bg-[var(--color-white)] shadow-[0_1px_0_var(--shadow-black-003),0_8px_20px_var(--shadow-black-002)]"
            >
              <div className="flex items-start justify-between px-4 pt-4 pb-3">
                <div>
                  <div className="h-4 w-28 rounded-full bg-[var(--color-gray-200)]" />
                  <div className="mt-2 h-3 w-20 rounded-full bg-[var(--color-gray-200)]" />
                </div>
                <div className="h-6 w-20 rounded-full bg-[var(--color-gray-200)]" />
              </div>
              <div className="space-y-2 border-t border-[var(--color-gray-100)] px-4 py-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--color-gray-200)]" />
                    <div className="h-3.5 flex-1 rounded-full bg-[var(--color-gray-200)]" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-gray-100)] px-4 py-3">
                <div className="h-4 w-28 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-7 w-20 rounded-full bg-[var(--color-gray-200)]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
