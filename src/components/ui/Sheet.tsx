import { useEffect, useRef, type PropsWithChildren } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { TornEdge } from '../paper/TornEdge';
import { Text } from './Text';

type SheetProps = PropsWithChildren<{
  visible: boolean;
  title?: string;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  enableDynamicSizing?: boolean;
  useScrollableContent?: boolean;
}>;

export function Sheet({
  visible,
  title,
  snapPoints = ['48%', '88%'],
  onDismiss,
  enableDynamicSizing = true,
  useScrollableContent = false,
  children,
}: SheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const hasPresentedRef = useRef(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      hasPresentedRef.current = true;
      sheetRef.current?.present();
    } else if (hasPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    hasPresentedRef.current = false;
    onDismiss?.();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderColor: colors.ink,
        borderTopWidth: 2,
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.65}
          pressBehavior="close"
        />
      )}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: colors.ink, width: 44, height: 4 }}
      onDismiss={handleDismiss}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
    >
      {/* Ragged paper torn edge decoration */}
      <TornEdge edge="top" color={colors.surface} height={8} />
      {useScrollableContent ? (
        children
      ) : (
        <BottomSheetView style={styles.content}>
          {title ? (
            <View style={[styles.heading, { borderBottomColor: colors.line }]}>
              <Text variant="title">{title}</Text>
            </View>
          ) : null}
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingBottom: spacing.xl },
  heading: {
    borderBottomWidth: 1.5,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
