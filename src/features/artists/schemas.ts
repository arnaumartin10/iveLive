import { z } from 'zod';

export const customArtistFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Artist name is required')
    .max(80, 'Artist name must be 80 characters or less'),
  photoUri: z.string().nullable().optional(),
  macroGenres: z.array(z.string()),
  freeTextTags: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Tag cannot be empty')
        .max(40, 'Max 40 chars per tag'),
    )
    .max(3, 'You can add up to 3 custom tags'),
  beginYear: z
    .number()
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .nullable()
    .optional(),
});

export type CustomArtistFormData = z.infer<typeof customArtistFormSchema>;
