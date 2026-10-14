import { z } from 'zod';

/** Zod schema for the "Log a Concert" form */
export const logConcertSchema = z.object({
  artist_name: z
    .string()
    .min(1, 'Artist name is required')
    .max(200, 'Artist name is too long'),
  spotify_artist_id: z.string().nullable().optional(),
  venue_name: z.string().min(1, 'Venue name is required').max(200),
  venue_city: z.string().min(1, 'City is required').max(100),
  venue_country: z.string().min(1, 'Country is required').max(100),
  concert_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().max(2000, 'Notes too long').optional().default(''),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export type LogConcertFormValues = z.infer<typeof logConcertSchema>;

/** Zod schema for editing a profile */
export const editProfileSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username too long')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  display_name: z.string().max(60).optional(),
  bio: z.string().max(300).optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;

/** Auth forms */
export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type SignInFormValues = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;
