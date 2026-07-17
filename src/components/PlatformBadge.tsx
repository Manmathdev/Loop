import { platformMeta } from "@/lib/platform";

export function PlatformBadge({
  platform,
  size = "md",
}: {
  platform: string | null;
  size?: "sm" | "md";
}) {
  const meta = platformMeta(platform);
  const dim = size === "sm" ? "h-6 w-6 text-xs" : "h-9 w-9 text-base";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border-[3px] border-forest font-bold ${dim}`}
      style={{ background: meta.accent, color: "#FBF9F0" }}
      title={meta.label}
    >
      {meta.glyph}
    </span>
  );
}
