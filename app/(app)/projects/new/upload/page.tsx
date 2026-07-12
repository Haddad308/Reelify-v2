"use client";

import { useRouter } from "next/navigation";
import { AppTopNav } from "@/components/nav/app-top-nav";

// Placeholder — real upload modal/flow lands in Phase 4.
export default function NewProjectUploadPage() {
  const router = useRouter();
  return (
    <>
      <AppTopNav breadcrumb="New project" />
      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={() => router.push("/projects")}
          className="text-sm font-semibold text-ink-tertiary"
        >
          ← Back to projects (upload flow lands in Phase 4)
        </button>
      </div>
    </>
  );
}
