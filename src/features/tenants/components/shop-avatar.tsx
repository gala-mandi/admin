import { cn } from "@/lib/utils";

/** Theme tokens (light + dark) from `globals.css`; each pair is ≥ 4.5:1. */
const tones = [
  "bg-avatar-1 text-avatar-1-foreground",
  "bg-avatar-2 text-avatar-2-foreground",
  "bg-avatar-3 text-avatar-3-foreground",
  "bg-avatar-4 text-avatar-4-foreground",
  "bg-avatar-5 text-avatar-5-foreground",
  "bg-avatar-6 text-avatar-6-foreground",
] as const;

/** Same id → same colour on every page and every reload. */
export function avatarTone(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash % tones.length;
}

/** `Al-Madina Traders` → `AT`; one word → its first letter. */
export function shopInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word).find((c) => /[\p{L}\p{N}]/u.test(c)))
    .filter((c): c is string => Boolean(c));
  if (words.length === 0) return "?";
  const picked = words.length === 1 ? words : [words[0], words.at(-1)!];
  return picked.join("").toLocaleUpperCase();
}

/** Coloured initials for a shop. Decorative: the name is always next to it. */
export function ShopAvatar({
  id,
  name,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const tone = avatarTone(id);
  return (
    <span
      aria-hidden
      data-slot="shop-avatar"
      data-tone={tone + 1}
      className={cn(
        "font-heading flex shrink-0 items-center justify-center font-bold tracking-tight select-none",
        size === "lg"
          ? "size-14 rounded-2xl text-lg"
          : "size-9 rounded-xl text-[13px]",
        tones[tone],
        className,
      )}
    >
      {shopInitials(name)}
    </span>
  );
}
