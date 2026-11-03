import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Plus, Trash2, X } from 'lucide-react-native';
import { customArtistFormSchema, type CustomArtistFormData } from './schemas';
import { MACRO_GENRES, MACRO_GENRE_ORDER } from '../genres/macroGenres';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { GenreLabel } from '../../components/paper/GenreLabel';
import { DuplicateArtistSheet } from './DuplicateArtistSheet';
import { findSimilarArtists } from './api';
import { useAuthStore } from '../auth/store';
import { useCreateManualArtist, useUpdateManualArtist } from './hooks';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing } from '../../theme/tokens';
import type { ArtistRow, SimilarArtistMatch } from './types';

interface CustomArtistFormProps {
  initialName?: string;
  existingArtist?: ArtistRow | null;
  onSuccess: (artist: ArtistRow) => void;
  onCancel?: () => void;
  onSelectExisting?: (match: SimilarArtistMatch) => void;
}

export function CustomArtistForm({
  initialName = '',
  existingArtist,
  onSuccess,
  onCancel,
  onSelectExisting,
}: CustomArtistFormProps) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateManualArtist();
  const updateMutation = useUpdateManualArtist();

  const isEditing = !!existingArtist;

  // Extract initial macro genres and free-text tags if editing
  const initialGenres = existingArtist?.genres ?? [];
  const initialMacros = initialGenres.filter((g) => g in MACRO_GENRES);
  const initialCustomTags = initialGenres
    .filter((g) => !(g in MACRO_GENRES))
    .slice(0, 3);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomArtistFormData>({
    resolver: zodResolver(customArtistFormSchema),
    defaultValues: {
      name: existingArtist?.name ?? initialName,
      photoUri: existingArtist?.image_url_large ?? null,
      macroGenres: initialMacros,
      freeTextTags: initialCustomTags,
      beginYear: existingArtist?.begin_year ?? null,
    },
  });

  const watchedName = watch('name') || '';
  const watchedPhotoUri = watch('photoUri');
  const watchedMacroGenres = watch('macroGenres') || [];
  const watchedCustomTags = watch('freeTextTags') || [];

  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState<
    SimilarArtistMatch[]
  >([]);
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [pendingFormData, setPendingFormData] =
    useState<CustomArtistFormData | null>(null);

  async function handlePickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Access Required',
          'Please allow access to your photos to upload an artist picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // forced square crop
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        void Haptics.selectionAsync();
        setValue('photoUri', result.assets[0].uri, { shouldValidate: true });
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  }

  function handleRemovePhoto() {
    void Haptics.selectionAsync();
    setValue('photoUri', null, { shouldValidate: true });
  }

  function toggleMacroGenre(slug: string) {
    void Haptics.selectionAsync();
    const current = watchedMacroGenres;
    if (current.includes(slug)) {
      setValue(
        'macroGenres',
        current.filter((s) => s !== slug),
        { shouldValidate: true },
      );
    } else {
      setValue('macroGenres', [...current, slug], { shouldValidate: true });
    }
  }

  function handleAddTag() {
    const trimmed = tagInput.trim().toLowerCase();
    setTagError('');
    if (!trimmed) return;

    if (watchedCustomTags.length >= 3) {
      setTagError('Maximum 3 custom tags allowed');
      return;
    }
    if (watchedCustomTags.includes(trimmed)) {
      setTagError('This tag is already added');
      return;
    }
    if (trimmed.length > 40) {
      setTagError('Tag must be 40 characters or less');
      return;
    }

    void Haptics.selectionAsync();
    setValue('freeTextTags', [...watchedCustomTags, trimmed], {
      shouldValidate: true,
    });
    setTagInput('');
  }

  function handleRemoveTag(tagToRemove: string) {
    void Haptics.selectionAsync();
    setValue(
      'freeTextTags',
      watchedCustomTags.filter((t) => t !== tagToRemove),
      { shouldValidate: true },
    );
  }

  async function onSubmit(data: CustomArtistFormData) {
    if (!user) {
      Alert.alert('Authentication required', 'Please sign in to save artists.');
      return;
    }

    // If creating new artist, run duplicate guard first
    if (!isEditing) {
      setIsCheckingDuplicates(true);
      try {
        const matches = await findSimilarArtists(data.name, 0.5);
        if (matches.length > 0) {
          setDuplicateMatches(matches);
          setPendingFormData(data);
          setShowDuplicateSheet(true);
          setIsCheckingDuplicates(false);
          return;
        }
      } catch {
        // If duplicate check failed, proceed with save
      } finally {
        setIsCheckingDuplicates(false);
      }
    }

    await performSave(data);
  }

  async function performSave(data: CustomArtistFormData) {
    if (!user) return;
    const combinedGenres = [...data.macroGenres, ...data.freeTextTags];

    try {
      if (isEditing && existingArtist) {
        const updated = await updateMutation.mutateAsync({
          input: {
            id: existingArtist.id,
            name: data.name,
            genres: combinedGenres,
            photoUri: data.photoUri,
            keepExistingPhoto: data.photoUri === existingArtist.image_url_large,
            beginYear: data.beginYear ?? null,
          },
          userId: user.id,
        });
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(updated);
      } else {
        const created = await createMutation.mutateAsync({
          input: {
            name: data.name,
            genres: combinedGenres,
            photoUri: data.photoUri,
            beginYear: data.beginYear ?? null,
          },
          userId: user.id,
        });
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(created);
      }
    } catch (cause) {
      Alert.alert(
        'Could not save artist',
        cause instanceof Error ? cause.message : 'An error occurred.',
      );
    }
  }

  function handleCreateAnyway() {
    setShowDuplicateSheet(false);
    if (pendingFormData) {
      void performSave(pendingFormData);
    }
  }

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    isCheckingDuplicates;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Section with deterministic gradient avatar fallback */}
        <View style={styles.photoSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              watchedPhotoUri ? 'Change artist photo' : 'Choose artist photo'
            }
            onPress={handlePickPhoto}
            style={styles.avatarPressable}
          >
            <Avatar
              name={watchedName.trim() || 'Artist'}
              imageUrl={watchedPhotoUri}
              size="xl"
              glowEnabled
            />
            <View
              style={[
                styles.cameraBadge,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.bg,
                },
              ]}
            >
              <Camera color={colors.accentInk} size={14} />
            </View>
          </Pressable>

          <View style={styles.photoActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                watchedPhotoUri ? 'Change photo' : 'Add photo'
              }
              onPress={handlePickPhoto}
              style={[
                styles.photoBtn,
                { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <Text variant="caption" weight="bold">
                {watchedPhotoUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            </Pressable>

            {watchedPhotoUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={handleRemovePhoto}
                style={[
                  styles.removePhotoBtn,
                  { backgroundColor: `${colors.danger}15` },
                ]}
              >
                <Trash2 color={colors.danger} size={15} />
              </Pressable>
            ) : null}
          </View>
          <Text variant="caption" color="secondary" center>
            {watchedPhotoUri
              ? 'Square photo will be optimized to 1024px and 256px'
              : 'Deterministic gradient avatar generated from artist name'}
          </Text>
        </View>

        {/* Name Input */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="label" weight="bold">
              Artist Name
            </Text>
            <Text variant="caption" color="secondary">
              {watchedName.length}/80
            </Text>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. Black Country, New Road"
                placeholderTextColor={colors.inkMuted}
                maxLength={80}
                autoFocus={!isEditing && !initialName}
                style={[
                  styles.textInput,
                  {
                    color: colors.ink,
                    borderColor: errors.name ? colors.danger : colors.line,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              />
            )}
          />
          {errors.name ? (
            <Text variant="caption" color="danger">
              {errors.name.message}
            </Text>
          ) : null}
        </View>

        {/* Debut / Formation Year (Optional) */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="label" weight="bold">
              Debut / Formation Year
            </Text>
            <Text variant="caption" color="secondary">
              Optional
            </Text>
          </View>

          <Controller
            control={control}
            name="beginYear"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value != null ? String(value) : ''}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  onChange(cleaned ? parseInt(cleaned, 10) : null);
                }}
                onBlur={onBlur}
                placeholder="e.g. 1994"
                placeholderTextColor={colors.inkMuted}
                keyboardType="numeric"
                maxLength={4}
                style={[
                  styles.textInput,
                  {
                    color: colors.ink,
                    borderColor: errors.beginYear ? colors.danger : colors.line,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              />
            )}
          />
          {errors.beginYear ? (
            <Text variant="caption" color="danger">
              {errors.beginYear.message}
            </Text>
          ) : null}
        </View>

        {/* Macro Genres Multi-Select */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="label" weight="bold">
              Macro Genres
            </Text>
            <Text variant="caption" color="secondary">
              Select all that match
            </Text>
          </View>

          <View style={styles.chipsWrap}>
            {MACRO_GENRE_ORDER.map((slug) => {
              const isSelected = watchedMacroGenres.includes(slug);

              return (
                <Pressable
                  key={slug}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => toggleMacroGenre(slug)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                >
                  <GenreLabel
                    genre={slug}
                    size="xs"
                    variant={isSelected ? 'solid' : 'outline'}
                    interactive={false}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Free-text Custom Tags */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text variant="label" weight="bold">
              Custom Tags
            </Text>
            <Text variant="caption" color="secondary">
              {watchedCustomTags.length}/3 tags
            </Text>
          </View>

          {/* Current tags pills */}
          {watchedCustomTags.length > 0 ? (
            <View style={styles.tagsRow}>
              {watchedCustomTags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  <Text variant="caption" weight="medium">
                    #{tag}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove tag ${tag}`}
                    onPress={() => handleRemoveTag(tag)}
                    style={styles.tagRemoveBtn}
                  >
                    <X color={colors.inkMuted} size={14} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Add tag input if < 3 tags */}
          {watchedCustomTags.length < 3 ? (
            <View style={styles.tagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={(text) => {
                  setTagInput(text);
                  setTagError('');
                }}
                onSubmitEditing={handleAddTag}
                placeholder="Add specific style (e.g. shoegaze, hyperpop)"
                placeholderTextColor={colors.inkMuted}
                maxLength={40}
                returnKeyType="done"
                style={[
                  styles.tagInput,
                  {
                    color: colors.ink,
                    borderColor: tagError ? colors.danger : colors.line,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add custom tag"
                onPress={handleAddTag}
                disabled={!tagInput.trim()}
                style={[
                  styles.addTagBtn,
                  {
                    backgroundColor: tagInput.trim()
                      ? colors.accent
                      : colors.line,
                  },
                ]}
              >
                <Plus color={colors.accentInk} size={18} />
              </Pressable>
            </View>
          ) : null}

          {tagError ? (
            <Text variant="caption" color="danger">
              {tagError}
            </Text>
          ) : null}
          <Text variant="caption" color="secondary">
            Free-text tags that match no macro rule will fall into
            &ldquo;other&rdquo;.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.submitSection}>
          <Button
            label={isEditing ? 'Save Changes' : 'Create Custom Artist'}
            loading={isSubmitting}
            disabled={!watchedName.trim()}
            onPress={handleSubmit(onSubmit)}
          />

          {onCancel ? (
            <Button
              label="Cancel"
              variant="ghost"
              disabled={isSubmitting}
              onPress={onCancel}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Duplicate Guard Sheet */}
      <DuplicateArtistSheet
        visible={showDuplicateSheet}
        searchedName={watchedName}
        matches={duplicateMatches}
        isCreating={createMutation.isPending}
        onCreateAnyway={handleCreateAnyway}
        onSelectExisting={(match) => {
          setShowDuplicateSheet(false);
          onSelectExisting?.(match);
        }}
        onDismiss={() => setShowDuplicateSheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    gap: 24,
    padding: spacing.xl,
    paddingBottom: 48,
  },
  photoSection: {
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  avatarPressable: {
    position: 'relative',
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    bottom: -2,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 28,
  },
  photoActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  removePhotoBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  field: {
    gap: 8,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tagBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
  },
  tagRemoveBtn: {
    alignItems: 'center',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  tagInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  addTagBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  submitSection: {
    gap: 12,
    marginTop: 12,
  },
});
