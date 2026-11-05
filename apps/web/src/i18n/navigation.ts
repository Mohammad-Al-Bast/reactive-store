import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware drop-ins for next/link and next/navigation. Use these in store pages. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
