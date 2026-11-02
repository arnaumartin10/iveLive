import { Image } from 'expo-image';
import {
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { RAW } from '../../theme/palette';

export type WordmarkVariant = 'ink' | 'wheat' | 'orange';

type WordmarkProps = {
  height: number;
  variant?: WordmarkVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
};

const source = require('../../assets/brand/wordmark.png');

export function Wordmark({
  height,
  variant = 'ink',
  accessibilityLabel = 'IveLive',
  style,
}: WordmarkProps) {
  const { colors } = useTheme();
  const tintColor =
    variant === 'wheat'
      ? RAW.wheat
      : variant === 'orange'
        ? RAW.orange
        : colors.ink;

  return (
    <View style={[styles.container, { height, width: height * 4.25 }]}>
      <Image
        accessibilityLabel={accessibilityLabel}
        contentFit="contain"
        source={source}
        style={[styles.image, style, { tintColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  image: { height: '100%', width: '100%' },
});
