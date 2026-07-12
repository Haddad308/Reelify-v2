import { AuthGuard } from "@/components/auth/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fill-subtle">
      <AuthGuard>{children}</AuthGuard>
    </div>
  );
}
