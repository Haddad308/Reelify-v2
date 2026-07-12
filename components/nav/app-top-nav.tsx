"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Logo } from "./logo";
import { WorkspaceSwitcher } from "./workspace-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfileStore } from "@/stores/useProfileStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { initialsFromName } from "@/lib/gradients";

export function AppTopNav({
  breadcrumb,
  onNewProject,
  rightSlot,
}: {
  breadcrumb?: string;
  onNewProject?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const { firstName, lastName } = useProfileStore();
  const signOut = useAuthStore((s) => s.signOut);

  const userInitials = initialsFromName(
    firstName || lastName ? `${firstName} ${lastName}`.trim() : "You",
  );

  return (
    <nav className="flex h-[58px] shrink-0 items-center gap-0 border-b border-border-subtle bg-white px-6">
      <Link href="/projects" className="mr-5 shrink-0">
        <Logo />
      </Link>
      <div className="mr-4.5 h-5 w-px shrink-0 bg-[#EAEAEC]" />

      <div className="mr-1">
        <WorkspaceSwitcher />
      </div>

      {breadcrumb && (
        <>
          <ChevronRight className="mx-1.5 size-4 shrink-0 text-border-input" />
          <span className="shrink-0 text-[13.5px] font-semibold text-ink">
            {breadcrumb}
          </span>
        </>
      )}

      <div className="flex-1" />

      {rightSlot}

      <div className="mr-2.5 ml-2.5 flex w-[210px] items-center gap-2 rounded-full border border-border-input bg-fill-2 px-3.5 py-1.5">
        <Search className="size-3.5 text-muted-3" />
        <span className="text-[13px] font-medium text-muted-1">Search projects…</span>
      </div>

      {onNewProject && (
        <button
          type="button"
          onClick={onNewProject}
          className="mr-3.5 flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] font-bold text-white"
        >
          <Plus className="size-3.5" />
          New project
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white"
            >
              {userInitials}
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              signOut();
              router.replace("/sign-in");
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
