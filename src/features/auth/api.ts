import { supabase } from '@lib/supabase';
import type { Profile } from '../concerts/types';

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) {
    return data as unknown as Profile;
  }

  // Self-healing: if the auth trigger didn't run or row is missing, create it
  const { data: { user } } = await supabase.auth.getUser();
  const rawMeta = user?.user_metadata ?? {};
  const displayName =
    (rawMeta.display_name as string | undefined) ??
    (rawMeta.full_name as string | undefined) ??
    null;
  const avatarUrl = (rawMeta.avatar_url as string | undefined) ?? null;
  const username = `user_${userId.slice(0, 8)}`;

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);
  return created as unknown as Profile;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: username,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      Profile,
      | 'username'
      | 'display_name'
      | 'bio'
      | 'avatar_url'
      | 'banner_image_url'
      | 'is_private'
    >
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export async function updatePrivacy(userId: string, isPrivate: boolean) {
  return updateProfile(userId, { is_private: isPrivate });
}
