import { StyleSheet, View } from 'react-native';
import { Orbit } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { MACRO_GENRES, MACRO_GENRE_ORDER } from '../genres/macroGenres';
import { GenreLabel } from '../../components/paper/GenreLabel';

export function CloudEmptyWorld({ onStart }: { onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <View style={styles.orbit}>
        <Orbit color={colors.inkMuted} size={48} strokeWidth={1.2} />
      </View>
      <Text variant="mono" weight="bold" center>
        WORLD EXPLORED 0 / 14
      </Text>
      <Text variant="subtitle" weight="bold" center>
        Your atlas is a blank world
      </Text>
      <Text variant="caption" color="secondary" center style={styles.copy}>
        One good night is all it takes to leave the first mark.
      </Text>
      <View style={styles.world}>
        {MACRO_GENRE_ORDER.map((slug) => (
          <View
            key={slug}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${MACRO_GENRES[slug].label}, ${MACRO_GENRES[slug].pattern} pattern, unexplored`}
            style={[
              styles.territory,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                styles.pattern,
                { backgroundColor: MACRO_GENRES[slug].color },
              ]}
            />
            <GenreLabel genre={slug} size="xs" interactive={false} />
            <Text variant="mono" color="secondary">
              UNEXPLORED · {MACRO_GENRES[slug].pattern.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      <Button label="START YOUR ATLAS" onPress={onStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    minHeight: 440,
    paddingHorizontal: 20,
  },
  orbit: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  copy: { marginBottom: 4, maxWidth: 280 },
  world: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
  },
  territory: {
    alignItems: 'center',
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 4,
  },
  pattern: { height: 5, marginBottom: 2, width: 30 },
});
