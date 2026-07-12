"use client";

import { useState } from "react";
import { FilterTabs } from "@/components/domain/filter-tabs";

export function FilterTabsInner() {
  const [value, setValue] = useState<"all" | "draft" | "published">("all");
  return (
    <FilterTabs
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "All 12" },
        { value: "draft", label: "Draft 8" },
        { value: "published", label: "Published 4" },
      ]}
    />
  );
}
