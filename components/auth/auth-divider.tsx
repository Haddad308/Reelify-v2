export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="my-4.5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-[11.5px] font-semibold tracking-wide text-muted-3">
        {label}
      </span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
