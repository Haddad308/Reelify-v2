"use client";

import { useEffect, useState } from "react";

/**
 * True only after the first client-side effect flush. zustand's `persist`
 * middleware reads localStorage synchronously in the browser, so a page's
 * very first client render already reflects real data while the server (no
 * localStorage) rendered a "not found" fallback — a guaranteed hydration
 * mismatch for any real visitor landing on the page fresh (e.g. clicking a
 * shared review link from email). Gate persisted-store-dependent branches on
 * this instead of the store data directly: the first render (server AND
 * client) shows a neutral loading state, and the real branch only appears
 * after the effect fires, safely outside hydration's comparison.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  // This is the one legitimate case for setState-in-effect: there is no
  // render-time computation for "has the client mounted yet" — the whole
  // point is forcing a second post-hydration render pass, which requires
  // exactly this. This is the standard fix recommended for zustand persist
  // + SSR (see e.g. https://zustand.docs.pmnd.rs/integrations/persisting-store-data#hydration-and-asynchronous-storages).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
