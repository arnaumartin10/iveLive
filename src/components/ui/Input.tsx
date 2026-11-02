/**
 * PAPER & INK — Input
 *
 * Ruled-line form field with an underlined mono label.
 * Evokes an official form or ledger entry.
 */
import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, fontSize, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={[styles.labelWrap, { borderBottomColor: colors.ink }]}>
          <Text
            variant="label"
            style={[styles.labelText, { color: colors.ink }]}
          >
            {label}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderBottomColor: error ? colors.danger : colors.ink,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: fontFamily.regular,
            },
            style,
          ]}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <Text variant="caption" style={[styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  labelWrap: {
    alignSelf: 'flex-start',
    borderBottomWidth: 1.5,
    marginBottom: 4,
    paddingBottom: 2,
  },
  labelText: {
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 11,
  },
  field: {
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});
