import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  gradient: [string, string];
  /** A generated (canvas-captured) frame — shown instead of the placeholder gradient when available. */
  imageUrl?: string;
  className?: string;
  playButtonSize?: "sm" | "md";
  topRight?: React.ReactNode;
  bottomLeft?: React.ReactNode;
  bottomRight?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The one reusable "fake video" look used everywhere a reel/project preview
 * shows up: dark gradient + diagonal stripe texture + centered translucent
 * play button. Falls back to a real generated frame once one exists.
 */
export function VideoThumbnail({
  gradient,
  imageUrl,
  className,
  playButtonSize = "md",
  topRight,
  bottomLeft,
  bottomRight,
  children,
}: VideoThumbnailProps) {
  const [from, to] = gradient;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        className,
      )}
      style={
        imageUrl
          ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundImage: `linear-gradient(160deg, ${from}, ${to})` }
      }
    >
      {!imageUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-48deg, rgba(255,255,255,0) 0, rgba(255,255,255,0) 7px, rgba(255,255,255,.032) 7px, rgba(255,255,255,.032) 14px)",
          }}
        />
      )}

      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full bg-white/13",
          playButtonSize === "sm" ? "size-9" : "size-11",
        )}
      >
        <Play
          className={cn(
            "fill-white/85 text-white/85",
            playButtonSize === "sm" ? "size-3.5" : "size-4",
          )}
        />
      </div>

      {topRight && <div className="absolute top-2.5 right-2.5 z-10">{topRight}</div>}
      {bottomLeft && <div className="absolute bottom-2.5 left-2.5 z-10">{bottomLeft}</div>}
      {bottomRight && <div className="absolute bottom-2.5 right-2.5 z-10">{bottomRight}</div>}
      {children}
    </div>
  );
}
