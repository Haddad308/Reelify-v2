// Local dark-theme override — the Reel Editor is the only dark screen in the
// whole app. Repurposes the `.dark` CSS scope (see app/globals.css) which is
// NOT a global light/dark toggle anywhere else in this app.
export default function ReelEditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark flex min-h-screen flex-col bg-background text-foreground">{children}</div>;
}
