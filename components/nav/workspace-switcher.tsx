"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { SectionLabel } from "@/components/domain/section-label";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const projects = useProjectStore((s) => s.projects);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (!activeWorkspace) return null;

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border py-1.5 pr-2.5 pl-1.5",
                popoverOpen
                  ? "border-brand bg-brand-tint"
                  : "border-border-input bg-white",
              )}
            >
              <GradientAvatar
                initials={activeWorkspace.initials}
                from={activeWorkspace.gradientFrom}
                to={activeWorkspace.gradientTo}
                shape="square"
                size="sm"
              />
              <span className="text-[13.5px] font-bold text-ink">{activeWorkspace.name}</span>
              <ChevronDown className="size-3.5 text-muted-1" />
            </button>
          }
        />
        <PopoverContent align="start" className="w-[296px] p-3.5">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border-input bg-fill-2 px-3 py-2">
            <Search className="size-3.5 text-muted-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspaces…"
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted-3"
            />
          </div>

          <SectionLabel className="mb-2">Your workspaces</SectionLabel>
          <div className="mb-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {filtered.map((ws) => {
              const active = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    setPopoverOpen(false);
                    router.push("/projects");
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-fill-subtle"
                >
                  <GradientAvatar
                    initials={ws.initials}
                    from={ws.gradientFrom}
                    to={ws.gradientTo}
                    shape="square"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{ws.name}</span>
                    <span className="block text-xs font-medium text-muted-1">
                      {projects.filter((p) => p.workspaceId === ws.id).length} projects ·{" "}
                      {ws.plan} plan
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>

          <div className="mb-2 h-px bg-border-subtle" />

          <button
            type="button"
            onClick={() => {
              setPopoverOpen(false);
              setDialogOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-border-input p-2.5 text-left"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fill-3">
              <Plus className="size-4 text-muted-1" />
            </div>
            <span>
              <span className="block text-sm font-bold text-ink">Create new workspace</span>
              <span className="block text-xs font-medium text-muted-1">For a new brand or team</span>
            </span>
          </button>
        </PopoverContent>
      </Popover>

      <CreateWorkspaceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
