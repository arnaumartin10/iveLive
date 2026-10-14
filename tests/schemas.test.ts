import { logConcertSchema, editProfileSchema, signInSchema } from '../src/features/concerts/schemas';

describe('Validation Schemas', () => {
  describe('logConcertSchema', () => {
    it('validates valid concert input successfully', () => {
      const validData = {
        artist_name: 'Radiohead',
        spotify_artist_id: '4Z8W4fKeB5YxbusRsdQVPb',
        venue_name: 'Parc del Fòrum',
        venue_city: 'Barcelona',
        venue_country: 'Spain',
        concert_date: '2024-06-01',
        notes: 'Incredible set, opened with 2+2=5',
        rating: 5,
      };

      const result = logConcertSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects missing artist name', () => {
      const invalidData = {
        artist_name: '',
        venue_name: 'Wembley',
        venue_city: 'London',
        venue_country: 'UK',
        concert_date: '2024-06-01',
      };

      const result = logConcertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects malformed date formats', () => {
      const invalidData = {
        artist_name: 'Rosalía',
        venue_name: 'Palau Sant Jordi',
        venue_city: 'Barcelona',
        venue_country: 'Spain',
        concert_date: '06/01/2024', // Needs YYYY-MM-DD
      };

      const result = logConcertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects rating greater than 5 or less than 1', () => {
      const invalidData = {
        artist_name: 'The Strokes',
        venue_name: 'Razzmatazz',
        venue_city: 'Barcelona',
        venue_country: 'Spain',
        concert_date: '2023-05-20',
        rating: 6,
      };

      const result = logConcertSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    it('validates email and password requirements', () => {
      expect(
        signInSchema.safeParse({ email: 'fan@ivelive.app', password: 'password123' })
          .success,
      ).toBe(true);

      expect(
        signInSchema.safeParse({ email: 'invalid-email', password: '123' })
          .success,
      ).toBe(false);
    });
  });

  describe('editProfileSchema', () => {
    it('enforces lowercase alphanumeric usernames', () => {
      expect(
        editProfileSchema.safeParse({ username: 'music_lover_99' }).success,
      ).toBe(true);

      expect(
        editProfileSchema.safeParse({ username: 'INVALID USERNAME!' }).success,
      ).toBe(false);
    });
  });
});
