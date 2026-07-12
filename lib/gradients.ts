// Preset gradients pulled from the mockup — workspace avatars, the
// "create workspace" color picker, and demo video-thumbnail backgrounds all
// draw from this same small palette.

export const WORKSPACE_GRADIENTS = [
  { name: "rose", from: "#FFB199", to: "#FF6B6B" },
  { name: "indigo", from: "#818CF8", to: "#6366F1" },
  { name: "green", from: "#34D399", to: "#059669" },
  { name: "orange", from: "#FDBA74", to: "#EA580C" },
  { name: "blue", from: "#7DD3FC", to: "#0284C7" },
] as const;

// Dark gradients used behind video thumbnails (the reusable "fake video"
// look: dark gradient rect + diagonal stripe texture + translucent play
// button). Cycled through for demo/seed content.
export const THUMBNAIL_GRADIENTS: [string, string][] = [
  ["#0F1729", "#1A2844"],
  ["#0D1E19", "#102A21"],
  ["#0F1529", "#181F3C"],
  ["#1A1208", "#2D1E09"],
  ["#28100F", "#3C1B19"],
  ["#1A0F29", "#271444"],
];

export function gradientForIndex(index: number): [string, string] {
  const g = THUMBNAIL_GRADIENTS[index % THUMBNAIL_GRADIENTS.length];
  return g;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
