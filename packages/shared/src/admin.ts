import { z } from "zod";

/** Body for `POST /api/auth/login`. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});
export type LoginInput = z.input<typeof loginSchema>;

/** The signed-in admin, as returned by login, refresh and `GET /api/auth/me`. */
export type AdminProfile = { id: string; email: string; name: string };

/** Minimum length for admin passwords (set with the admin CLI). */
export const ADMIN_PASSWORD_MIN = 12;
