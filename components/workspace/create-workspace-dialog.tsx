"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { WORKSPACE_GRADIENTS, initialsFromName } from "@/lib/gradients";
import { cn } from "@/lib/utils";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const [name, setName] = useState("");
  const [gradientIdx, setGradientIdx] = useState(0);
  const gradient = WORKSPACE_GRADIENTS[gradientIdx];

  function handleCreate() {
    if (!name.trim()) return;
    const workspace = createWorkspace({
      name: name.trim(),
      gradientFrom: gradient.from,
      gradientTo: gradient.to,
    });
    setActiveWorkspace(workspace.id);
    toast.success(`${workspace.name} workspace created`);
    setName("");
    setGradientIdx(0);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] max-w-full rounded-[20px] p-8 sm:max-w-full">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-ink">
            New workspace
          </DialogTitle>
          <p className="text-[13.5px] font-medium text-ink-tertiary">
            A workspace holds all your projects and reels for one brand or team.
          </p>
        </DialogHeader>

        <div className="mt-3 flex items-end gap-4.5">
          <div className="shrink-0">
            <Label>Logo</Label>
            <div className="relative mt-1.5">
              <GradientAvatar
                initials={name ? initialsFromName(name) : "?"}
                from={gradient.from}
                to={gradient.to}
                shape="square"
                size="lg"
              />
              <div className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-md border-[1.5px] border-border-subtle bg-white">
                <Pencil className="size-2.5 text-ink-tertiary" />
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              {WORKSPACE_GRADIENTS.map((g, i) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setGradientIdx(i)}
                  className={cn(
                    "size-4.5 shrink-0 cursor-pointer rounded-md",
                    i === gradientIdx && "outline-2 outline-offset-1.5 outline-brand",
                  )}
                  style={{ backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  aria-label={`Use ${g.name} color`}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              autoFocus
              placeholder="Stellar Brands"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[11.5px] font-medium text-muted-1">
              Your initials will be auto-generated from the name
            </p>
          </div>
        </div>

        <div className="mt-4.5 space-y-1.5">
          <Label htmlFor="ws-invite">
            Invite teammates{" "}
            <span className="font-medium text-muted-1">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Input id="ws-invite" placeholder="Email address…" className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Invites aren't available in this preview yet")}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!name.trim()}
            className="flex-[2] gap-2 rounded-xl font-extrabold"
            onClick={handleCreate}
          >
            Create workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
