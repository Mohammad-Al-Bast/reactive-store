import { cn } from "@/lib/utils";

/** A placeholder block while content loads. Border-coloured so it shows on the cream page and white cards. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-border/80 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
