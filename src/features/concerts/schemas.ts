import { z } from 'zod';

/** Zod schema for the "Log a Concert" form */
export const logConcertSchema = z.object({
  artist_name: z
    .string()
    .min(1, 'Artist name is required')
    .max(200, 'Artist name is too long'),
  spotify_artist_id: z.string().nullable().optional(),
  venue_type: z.enum([
    'festival',
    'concert_hall_club',
    'stadium',
    'indoor_arena',
    'festa_major',
    'other',
  ]),
  venue_id: z.string().uuid().nullable().optional(),
  venue_name: z.string().max(120).optional().default(''),
  artist_id: z.string().uuid().optional(),
  concert_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine((value) => {
      const parts = value.split('-').map(Number);
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      if (year === undefined || month === undefined || day === undefined) return false;
      const eventDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month - 1 &&
        eventDate.getDate() === day &&
        eventDate <= today
      );
    }, 'Concert date cannot be in the future'),
  notes: z.string().max(2000, 'Notes too long').optional().default(''),
  rating: z
    .number()
    .min(0.5)
    .max(5)
    .refine((rating) => Number.isInteger(rating * 2), 'Use half-star increments')
    .nullable()
    .optional(),
});

export type LogConcertFormValues = z.infer<typeof logConcertSchema>;

/** Zod schema for editing a profile */
export const editProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username too long')
    .regex(/^[a-z0-9_.]+$/, 'Use lowercase letters, numbers, dots, and underscores'),
  display_name: z.string().max(80).optional(),
  bio: z.string().max(160).optional(),
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
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_.]+$/),
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;
