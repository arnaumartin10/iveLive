import React, { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { palette, radius, spacing, fontFamily, fontSize } from '@theme/tokens';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    containerStyle,
    leftIcon,
    rightIcon,
    style,
    placeholderTextColor = palette.muted,
    ...props
  },
  ref,
) {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="label" color={hasError ? 'crimson' : 'secondary'} style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          hasError && styles.errorBorder,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={placeholderTextColor}
          accessibilityLabel={label ?? props.placeholder}
          aria-invalid={hasError}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>

      {hasError ? (
        <Text variant="caption" color="crimson" style={styles.helperText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="muted" style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    minHeight: 48, // Accessibility: minimum 44pt touch target
    paddingHorizontal: spacing[3],
  },
  input: {
    flex: 1,
    color: palette.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    paddingVertical: spacing[3],
  },
  errorBorder: {
    borderColor: palette.crimson,
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
  helperText: {
    marginTop: spacing[1],
  },
});
