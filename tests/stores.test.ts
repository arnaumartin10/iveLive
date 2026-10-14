import type { User } from '@supabase/supabase-js';
import { useAuthStore } from '../src/features/auth/store';
import { useLogWizardStore } from '../src/features/log/store';

describe('Zustand Stores', () => {
  describe('useAuthStore', () => {
    it('initializes with null user and session', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });

    it('updates user and signs out correctly', () => {
      const mockUser = { id: 'usr-123', email: 'fan@ivelive.app' } as unknown as User;
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);

      useAuthStore.getState().signOut();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('useLogWizardStore', () => {
    beforeEach(() => {
      useLogWizardStore.getState().resetWizard();
    });

    it('transitions through steps on artist selection', () => {
      const mockArtist = {
        spotify_id: 'art-123',
        name: 'Fontaines D.C.',
        image_url: null,
        genres: ['post-punk'],
      };

      expect(useLogWizardStore.getState().currentStep).toBe('artist');

      useLogWizardStore.getState().selectArtist(mockArtist);

      expect(useLogWizardStore.getState().selectedArtist).toEqual(mockArtist);
      expect(useLogWizardStore.getState().currentStep).toBe('details');
    });

    it('stores venue details and concert date', () => {
      useLogWizardStore.getState().setVenueDetails({
        name: 'Primavera Sound',
        city: 'Barcelona',
        country: 'Spain',
      });
      useLogWizardStore.getState().setConcertDate('2024-05-30');

      const state = useLogWizardStore.getState();
      expect(state.venueName).toBe('Primavera Sound');
      expect(state.venueCity).toBe('Barcelona');
      expect(state.venueCountry).toBe('Spain');
      expect(state.concertDate).toBe('2024-05-30');
    });

    it('resets back to initial state', () => {
      useLogWizardStore.getState().setMemories({
        notes: 'Unbelievable encore',
        rating: 5,
      });

      useLogWizardStore.getState().resetWizard();
      const state = useLogWizardStore.getState();

      expect(state.currentStep).toBe('artist');
      expect(state.selectedArtist).toBeNull();
      expect(state.notes).toBe('');
      expect(state.rating).toBeNull();
    });
  });
});
