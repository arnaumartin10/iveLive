import { MapPin, RotateCcw, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useTheme } from '../../theme/ThemeProvider';
import { cloudExperienceStrings } from './experienceStrings';

type CloudExperienceHudProps = {
  exploredCount: number;
  menuVisible: boolean;
  motionEnabled: boolean;
  soundEnabled: boolean;
  onFly: () => void;
  onToggleMenu: () => void;
  onCloseMenu?: () => void;
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
  onCloseMenu,
  onReplay,
  onToggleMotion,
  onToggleSound,
  onToggleLegend,
  legendVisible,
  onPoster,
}: CloudExperienceHudProps) {
  const { colors } = useTheme();
  const compact = useBreakpoint() === 'compact';
  const closeMenu = () => {
    if (!menuVisible) return;
    if (onCloseMenu) onCloseMenu();
    else onToggleMenu();
  };
  const runMenuAction = (action: () => void) => {
    action();
    closeMenu();
  };

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
        {compact ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cloudExperienceStrings.tour.button}
              onPress={onFly}
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.ink },
              ]}
            >
              <MapPin size={19} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cloud experience menu"
              accessibilityState={{ expanded: menuVisible }}
              onPress={onToggleMenu}
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface, borderColor: colors.ink },
              ]}
            >
              <Settings size={19} color={colors.ink} />
            </Pressable>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>
      {compact ? (
        <Sheet
          visible={menuVisible}
          title="Cloud controls"
          snapPoints={['55%']}
          onDismiss={closeMenu}
        >
          <View style={styles.sheetMenu}>
            <Button
              label={cloudExperienceStrings.tour.button}
              size="sm"
              variant="secondary"
              onPress={() => runMenuAction(onFly)}
            />
            <Button
              label={cloudExperienceStrings.hud.replay}
              size="sm"
              variant="secondary"
              leftIcon={<RotateCcw size={16} color={colors.ink} />}
              onPress={() => runMenuAction(onReplay)}
            />
            <Button
              label={`${cloudExperienceStrings.hud.motion}: ${motionEnabled ? 'On' : 'Off'}`}
              size="sm"
              variant="secondary"
              onPress={() => runMenuAction(onToggleMotion)}
            />
            <Button
              label={`${cloudExperienceStrings.hud.sound}: ${soundEnabled ? 'On' : 'Off'}`}
              size="sm"
              variant="secondary"
              onPress={() => runMenuAction(onToggleSound)}
            />
            <Button
              label={
                legendVisible
                  ? 'Hide legend'
                  : cloudExperienceStrings.hud.legend
              }
              size="sm"
              variant="secondary"
              onPress={() => runMenuAction(onToggleLegend)}
            />
            {onPoster ? (
              <Button
                label="Print your atlas"
                size="sm"
                variant="secondary"
                onPress={() => runMenuAction(onPoster)}
              />
            ) : null}
          </View>
        </Sheet>
      ) : menuVisible ? (
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
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'nowrap', gap: 8 },
  progressCard: { flex: 1, gap: 5, minWidth: 0 },
  track: { height: 4, overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  menuButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
  },
  iconButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menu: { alignSelf: 'flex-end', gap: 8, maxWidth: 240, width: '100%' },
  sheetMenu: { gap: 10, paddingHorizontal: 20, paddingTop: 16 },
});
