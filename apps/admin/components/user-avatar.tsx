import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";

const SIZE_CLASSES = {
  sm: "size-6 text-2xs",
  md: "size-8 text-xs",
  lg: "size-9 text-xs",
} as const;

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
}

/**
 * Initials tile for a customer or admin row. Decorative next to a name that
 * is already on screen, so it is hidden from assistive tech.
 *
 * Initials are rendered locally: the previous dicebear.com URL sent every
 * customer's email address to a third party (and CSP blocked the image anyway).
 */
export default function UserAvatar({
  name,
  email,
  imageUrl,
  className,
  size = "md",
}: UserAvatarProps) {
  const fromName = name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const initials = (fromName || email?.slice(0, 2) || "?").toUpperCase();

  return (
    <Avatar aria-hidden className={cn("shrink-0 rounded-md", SIZE_CLASSES[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt="" className="rounded-md" />}
      <AvatarFallback className="rounded-md bg-muted font-medium text-muted-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
