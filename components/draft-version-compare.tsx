export function DraftVersionCompare({
  previousDraft,
  currentDraft,
}: {
  previousDraft: string;
  currentDraft: string;
}) {
  if (previousDraft === currentDraft) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Compare versions</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Previous
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {previousDraft}
          </p>
        </article>
        <article className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            New
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {currentDraft}
          </p>
        </article>
      </div>
    </div>
  );
}
