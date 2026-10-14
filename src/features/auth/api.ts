import { supabase } from '@lib/supabase';
import type { Profile } from '../concerts/types';

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}
