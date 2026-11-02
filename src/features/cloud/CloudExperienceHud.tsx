import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { cloudExperienceStrings } from './experienceStrings';

type CloudExperienceHudProps = {
  exploredCount: number;
  menuVisible: boolean;
  motionEnabled: boolean;
  soundEnabled: boolean;
  onFly: () => void;
  onToggleMenu: () => void;
  onReplay: () => void;
  onToggleMotion: () => void;
  onToggleSound: () => void;
  onToggleLegend: () => void;
  legendVisible: boolean;
  onPoster?: () => void;
};

export function CloudExperienceHud({
  exploredCount,
  menuVisible,
  motionEnabled,
  soundEnabled,
  onFly,
  onToggleMenu,
  onReplay,
  onToggleMotion,
  onToggleSound,
  onToggleLegend,
  legendVisible,
  onPoster,
}: CloudExperienceHudProps) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.row}>
        <Card padding={8} style={styles.progressCard}>
          <Text variant="mono" weight="bold">
            {cloudExperienceStrings.hud.explored} {exploredCount} / 14
          </Text>
          <View style={[styles.track, { backgroundColor: colors.line }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, Math.max(0, (exploredCount / 14) * 100))}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </Card>
        <Button
          label={cloudExperienceStrings.tour.button}
          size="sm"
          variant="secondary"
          onPress={onFly}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cloud experience menu"
          accessibilityState={{ expanded: menuVisible }}
          onPress={onToggleMenu}
          style={[
            styles.menuButton,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <Text variant="caption" weight="bold">
            MENU
          </Text>
        </Pressable>
      </View>
      {menuVisible ? (
        <Card padding={10} style={styles.menu}>
          <Button
            label={cloudExperienceStrings.hud.replay}
            size="sm"
            variant="secondary"
            onPress={onReplay}
          />
          <Button
            label={`${cloudExperienceStrings.hud.motion}: ${motionEnabled ? 'On' : 'Off'}`}
            size="sm"
            variant="secondary"
            onPress={onToggleMotion}
          />
          <Button
            label={`${cloudExperienceStrings.hud.sound}: ${soundEnabled ? 'On' : 'Off'}`}
            size="sm"
            variant="secondary"
            onPress={onToggleSound}
          />
          <Button
            label={
              legendVisible ? 'Hide legend' : cloudExperienceStrings.hud.legend
            }
            size="sm"
            variant="secondary"
            onPress={onToggleLegend}
          />
          {onPoster ? (
            <Button
              label="Print your atlas"
              size="sm"
              variant="secondary"
              onPress={onPoster}
            />
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progressCard: { flex: 1, gap: 5, minWidth: 170 },
  track: { height: 4, overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  menuButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  menu: { alignSelf: 'flex-end', gap: 8, maxWidth: 240, width: '100%' },
});
