import { cn } from "@/lib/utils"

/** A placeholder block. Border-coloured so it shows on both the cream page and white cards. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-border/70 motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
