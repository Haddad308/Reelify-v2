import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-fill-subtle">
      <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
    </div>
  );
}
