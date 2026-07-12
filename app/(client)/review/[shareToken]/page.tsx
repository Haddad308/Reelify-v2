export default async function ReviewGatePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="rounded-3xl bg-card p-10 shadow-[0_4px_28px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <p className="text-sm font-semibold text-ink-tertiary">
          (client) shell — Identity gate placeholder for token &quot;
          {shareToken}&quot;
        </p>
      </div>
    </div>
  );
}
