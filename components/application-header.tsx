export function ApplicationHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-4 rounded-lg bg-primary"
          />
          <span className="text-sm font-semibold tracking-tight">
            Product Content Studio
          </span>
        </div>
      </div>
    </header>
  );
}
