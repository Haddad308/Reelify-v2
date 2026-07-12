import Link from "next/link";

// Temporary Phase 0 QA landing page — replaced in Phase 2/3 by real
// auth-state-based redirect logic (unauth -> /sign-in, authenticated -> /projects, etc).
export default function RootPage() {
  const links = [
    { href: "/sign-in", label: "(auth) shell" },
    { href: "/onboarding/name", label: "(onboarding) shell" },
    { href: "/projects", label: "(app) shell" },
    { href: "/review/demo-token", label: "(client) shell" },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-fill-subtle p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Reelify — shell QA
      </h1>
      <div className="flex gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-border-input bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-fill-3"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
