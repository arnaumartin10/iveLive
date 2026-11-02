import * as Crypto from 'expo-crypto';
import { supabase } from '@lib/supabase';
import type { Profile } from '../concerts/types';

export async function redeemAlphaInvite(code: string): Promise<void> {
  const normalizedCode = code.trim();
  if (!normalizedCode) throw new Error('Enter your invite code to continue.');

  const codeHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalizedCode,
  );
  const { error } = await supabase.rpc('redeem_alpha_invite', {
    p_code_hash: codeHash,
  });
  if (!error) return;

  if (error.message.includes('INVALID_OR_USED_INVITE_CODE')) {
    throw new Error('That invite code has already been used or is not valid.');
  }
  if (error.message.includes('ALPHA_INVITE_REQUIRED')) {
    throw new Error('We could not redeem that invite. Please try again.');
  }
  throw new Error(error.message);
}

export async function hasAlphaInvite(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_alpha_invite');
  if (error) throw new Error(error.message);
  return data;
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
