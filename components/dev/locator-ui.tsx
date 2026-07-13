"use client";

import { useEffect } from "react";

/** Dev-only: click any element to jump to its source in the editor. No-op in production. */
export function LocatorUI() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    import("@locator/runtime").then(({ setup }) => setup());
  }, []);

  return null;
}
