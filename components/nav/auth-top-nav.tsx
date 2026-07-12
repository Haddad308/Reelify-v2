import { Logo } from "./logo";

export function AuthTopNav({ children }: { children?: React.ReactNode }) {
  return (
    <nav className="flex h-[58px] shrink-0 items-center justify-between border-b border-border-subtle bg-white px-6">
      <Logo />
      {children}
    </nav>
  );
}
