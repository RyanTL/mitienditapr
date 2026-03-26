export default function CuentaLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-gray-100)] px-4 py-6 pb-32 animate-pulse md:px-5">
      <main className="mx-auto w-full max-w-md space-y-6 md:max-w-lg">

        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-1">
          <div className="h-20 w-20 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-5 w-36 rounded-full bg-[var(--color-gray-200)]" />
          <div className="h-3 w-48 rounded-full bg-[var(--color-gray-200)]" />
        </div>

        {/* Info section */}
        <div className="space-y-1.5">
          <div className="h-3 w-40 rounded-full bg-[var(--color-gray-200)]" />
          <div className="overflow-hidden rounded-2xl bg-[var(--color-white)] shadow-[0_4px_16px_var(--shadow-black-008)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--color-gray)] px-4 py-3.5 last:border-b-0">
                <div className="h-4 w-20 rounded-full bg-[var(--color-gray-200)]" />
                <div className="h-4 w-28 rounded-full bg-[var(--color-gray-200)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Security section */}
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded-full bg-[var(--color-gray-200)]" />
          <div className="overflow-hidden rounded-2xl bg-[var(--color-white)] shadow-[0_4px_16px_var(--shadow-black-008)]">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="h-4 w-24 rounded-full bg-[var(--color-gray-200)]" />
              <div className="h-4 w-20 rounded-full bg-[var(--color-gray-200)]" />
            </div>
          </div>
        </div>

        {/* Session section */}
        <div className="space-y-1.5">
          <div className="h-3 w-14 rounded-full bg-[var(--color-gray-200)]" />
          <div className="overflow-hidden rounded-2xl bg-[var(--color-white)] shadow-[0_4px_16px_var(--shadow-black-008)]">
            <div className="px-4 py-3.5">
              <div className="h-4 w-28 rounded-full bg-[var(--color-gray-200)]" />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
