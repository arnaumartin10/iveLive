import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ImagePlus, LockKeyhole, Share2, Sparkles } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Grain } from '../paper';
import type { ProfileBasics } from '../../features/profile/types';
import { useMusicIdentity, IdentitySheet } from '../../features/identity';
import type { MacroGenre } from '../../features/genres/macroGenres';

export function ProfileHeader({
  profile,
  counts,
  backdropUrl,
  fallbackGenre,
  isOwn,
  shareable,
  onEdit,
  onChangeBanner,
  onWrapped,
  onShare,
  onCountPress,
  followAction,
}: {
  profile: ProfileBasics;
  counts?: {
    shows: number;
    artists: number;
    followers: number;
    following: number;
  };
  backdropUrl?: string | null;
  backdropColor: string;
  fallbackGenre?: MacroGenre;
  isOwn: boolean;
  shareable: boolean;
  onEdit: () => void;
  onChangeBanner?: () => void;
  onWrapped: () => void;
  onShare: () => void;
  onCountPress?: (section: 'followers' | 'following') => void;
  followAction?: ReactNode;
}) {
  const { colors } = useTheme();
  const displayName = profile.display_name || profile.username;
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const identity = useMusicIdentity(profile.id);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {backdropUrl ? (
        <Image
          source={{ uri: backdropUrl }}
          contentFit="cover"
          style={[StyleSheet.absoluteFill, styles.backdropImage]}
        />
      ) : null}
      <Grain />
      {isOwn && onChangeBanner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile banner"
          onPress={onChangeBanner}
          style={[
            styles.bannerBadge,
            {
              backgroundColor: `${colors.surfaceRaised}D9`,
              borderColor: colors.line,
            },
          ]}
        >
          <ImagePlus size={13} color={colors.ink} />
          <Text variant="caption" weight="medium">
            Banner
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.topActions}>
        {followAction}
        {isOwn ? (
          <>
            {onChangeBanner ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change profile banner"
                onPress={onChangeBanner}
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.surfaceRaised },
                ]}
              >
                <ImagePlus size={18} color={colors.ink} />
              </Pressable>
            ) : null}
            <Button
              label="Edit profile"
              size="sm"
              variant="secondary"
              onPress={onEdit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Wrapped"
              onPress={onWrapped}
              style={[
                styles.iconButton,
                { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Sparkles size={18} color={colors.ink} />
            </Pressable>
          </>
        ) : null}
        {shareable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share profile"
            onPress={onShare}
            style={[
              styles.iconButton,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Share2 size={18} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.identity}>
        <Avatar
          fallbackGenre={fallbackGenre}
          imageUrl={profile.avatar_url}
          name={displayName}
          size="xl"
        />
        <Text variant="display" center style={styles.name}>
          {displayName}
        </Text>
        <Text variant="caption" color="secondary" center>
          @{profile.username}
        </Text>

        {/* Small prototype badge */}
        {identity?.computed?.prototype ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Music Prototype: ${identity.computed.prototype.title}. Tap to view full identity.`}
            onPress={() => setIdentitySheetVisible(true)}
            style={[
              styles.prototypeBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accent,
              },
            ]}
          >
            <Sparkles size={12} color={colors.accent} />
            <Text
              variant="caption"
              weight="bold"
              style={{ color: colors.accent }}
            >
              {identity.computed.prototype.title}
            </Text>
          </Pressable>
        ) : null}

        {profile.bio ? (
          <Text variant="body" center style={styles.bio}>
            {profile.bio}
          </Text>
        ) : null}
        {profile.is_private ? (
          <View
            style={[
              styles.privateLabel,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <LockKeyhole size={13} color={colors.inkMuted} />
            <Text variant="caption" color="secondary">
              Private profile
            </Text>
          </View>
        ) : null}
      </View>
      {counts ? (
        <View style={[styles.counts, { borderTopColor: colors.line }]}>
          <Count label="Shows" value={counts.shows} />
          <Count label="Artists" value={counts.artists} />
          <Count
            label="Followers"
            value={counts.followers}
            onPress={() => onCountPress?.('followers')}
          />
          <Count
            label="Following"
            value={counts.following}
            onPress={() => onCountPress?.('following')}
          />
        </View>
      ) : null}

      <IdentitySheet
        visible={identitySheetVisible}
        onDismiss={() => setIdentitySheetVisible(false)}
        profile={profile}
      />
    </View>
  );
}

function Count({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.count}
    >
      <Text variant="label" weight="bold">
        {value}
      </Text>
      <Text
        variant="caption"
        style={{ color: onPress ? colors.accent : colors.inkMuted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', paddingBottom: spacing.lg, position: 'relative' },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  bannerBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    zIndex: 10,
  },
  identity: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  name: { marginTop: spacing.xs },
  backdropImage: { opacity: 0.16 },
  bio: { maxWidth: 340, paddingTop: spacing.xs },
  privateLabel: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  counts: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    flexWrap: 'wrap',
  },
  count: { alignItems: 'center', flexBasis: '25%', flexGrow: 1, gap: 2, minWidth: 64 },
  prototypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 2,
  },
});
