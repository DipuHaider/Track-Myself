import { z } from "zod";

/* Whether currentPassword is required depends on whether the account already
   has one, which only the server knows — a Google account setting its first
   password has nothing to prove. That check lives in the route. */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  bio: z.string().max(2000, "Bio is too long").optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(200)
    .optional(),
});

export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
