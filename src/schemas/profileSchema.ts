import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
    bio: z.string().max(2000, "Bio is too long").optional(),
    currentPassword: z.string().max(200).optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(200)
      .optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Current password is required",
    path: ["currentPassword"],
  });

export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
