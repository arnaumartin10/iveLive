/**
 * Step 2 – Date Picker
 *
 * - Large artist avatar at top for continuity
 * - Custom calendar grid (no external dependency) defaulting to today
 * - Future dates disabled
 * - Month title tappable → year/month quick-jump wheel (1960 – current year)
 * - Shortcut chips: Today, Yesterday, Last weekend (Saturday)
 * - Selected date displayed in friendly format ("Saturday, 14 June 2025")
 */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { format, isToday, isYesterday, startOfMonth, getDay, getDaysInMonth, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useLogDraft } from '../../features/log/store';
import { WizardStepView } from '../../components/log/WizardStepView';
import { ArtistAvatar } from '../../components/ui/ArtistAvatar';
import { Text } from '../../components/ui/Text';
import { Chip } from '../../components/ui/Chip';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MIN_YEAR = 1960;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clampToday(d: Date): Date {
  const now = new Date();
  return d > now ? now : d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function friendlyDate(d: Date): string {
  if (isToday(d)) return `Today, ${format(d, 'MMMM d, yyyy')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'MMMM d, yyyy')}`;
  return format(d, 'EEEE, MMMM d, yyyy');
}

/** Previous Saturday (not today) */
function lastSaturday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  const daysBack = day === 6 ? 7 : day + 1;
  return subDays(now, daysBack);
}

// ─── Year/Month Wheel ─────────────────────────────────────────────────────────

interface YearMonthPickerProps {
  year: number;
  month: number; // 0-based
  maxYear: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

function YearMonthPicker({ year, month, maxYear, onSelect, onClose }: YearMonthPickerProps) {
  const { colors } = useTheme();
  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);

  const years: number[] = [];
  for (let y = maxYear; y >= MIN_YEAR; y--) years.push(y);

  function confirm() {
    onSelect(selYear, selMonth);
    onClose();
  }

  return (
    <View style={[styles.wheelOverlay, { backgroundColor: colors.surface }]}>
      <View style={[styles.wheelHeader, { borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel year/month picker"
          onPress={onClose}
          hitSlop={10}
        >
          <Text variant="caption" color="secondary">Cancel</Text>
        </Pressable>
        <Text variant="label" weight="bold">Jump to</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm year/month selection"
          onPress={confirm}
          hitSlop={10}
        >
          <Text variant="caption" weight="bold" style={{ color: colors.accent }}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.wheelColumns}>
        {/* Year column */}
        <ScrollView style={styles.wheelCol} showsVerticalScrollIndicator={false}>
          {years.map((y) => (
            <Pressable
              key={y}
              accessibilityRole="radio"
              accessibilityState={{ selected: selYear === y }}
              onPress={() => { setSelYear(y); }}
              style={[
                styles.wheelItem,
                selYear === y && { backgroundColor: `${colors.accent}20` },
              ]}
            >
              <Text
                variant="label"
                weight={selYear === y ? 'bold' : 'regular'}
                style={{ color: selYear === y ? colors.accent : colors.ink }}
              >
                {y}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Month column */}
        <ScrollView style={styles.wheelCol} showsVerticalScrollIndicator={false}>
          {MONTHS.map((m, i) => (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ selected: selMonth === i }}
              onPress={() => { setSelMonth(i); }}
              style={[
                styles.wheelItem,
                selMonth === i && { backgroundColor: `${colors.accent}20` },
              ]}
            >
              <Text
                variant="label"
                weight={selMonth === i ? 'bold' : 'regular'}
                style={{ color: selMonth === i ? colors.accent : colors.ink }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

interface CalendarGridProps {
  viewYear: number;
  viewMonth: number;
  selected: Date;
  today: Date;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onHeaderPress: () => void;
}

function CalendarGrid({
  viewYear,
  viewMonth,
  selected,
  today,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onHeaderPress,
}: CalendarGridProps) {
  const { colors } = useTheme();

  const firstDayOfWeek = getDay(startOfMonth(new Date(viewYear, viewMonth, 1)));
  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth, 1));

  const canGoNext =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const cells: (number | null)[] = [
    ...Array.from<null>({ length: firstDayOfWeek }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function isFuture(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const todayCopy = new Date(today);
    todayCopy.setHours(0, 0, 0, 0);
    return d > todayCopy;
  }

  return (
    <View style={styles.calendar}>
      {/* Month/year header */}
      <View style={styles.calHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrevMonth}
          hitSlop={10}
          style={styles.calNavBtn}
        >
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open year and month picker"
          onPress={onHeaderPress}
          style={styles.calHeaderTitle}
        >
          <Text variant="label" weight="bold">
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <ChevronRight size={14} color={colors.accent} style={{ transform: [{ rotate: '90deg' }] }} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={onNextMonth}
          disabled={!canGoNext}
          hitSlop={10}
          style={[styles.calNavBtn, !canGoNext && { opacity: 0.25 }]}
        >
          <ChevronRight size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <Text
            key={d}
            variant="caption"
            weight="semibold"
            color="secondary"
            style={styles.dayLabel}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`empty-${di}`} style={styles.dayCell} />;
            }

            const dayDate = new Date(viewYear, viewMonth, day);
            const isSelected = isSameDay(dayDate, selected);
            const isTodayDate = isSameDay(dayDate, today);
            const future = isFuture(day);

            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={format(dayDate, 'EEEE, MMMM d, yyyy')}
                accessibilityState={{ selected: isSelected, disabled: future }}
                disabled={future}
                onPress={() => { onSelectDay(day); }}
                style={({ pressed }) => [
                  styles.dayCell,
                  styles.dayCellBtn,
                  isSelected && { backgroundColor: colors.accent },
                  !isSelected && isTodayDate && { borderColor: colors.accent, borderWidth: 1.5 },
                  future && styles.futureDay,
                  pressed && !future && { opacity: 0.7 },
                ]}
              >
                <Text
                  variant="caption"
                  weight={isSelected || isTodayDate ? 'bold' : 'regular'}
                  style={{
                    color: isSelected
                      ? colors.accentInk
                      : future
                        ? colors.inkMuted
                        : colors.ink,
                    opacity: future ? 0.4 : 1,
                  }}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Step 2 Screen ────────────────────────────────────────────────────────────

export default function StepDate() {
  const { colors } = useTheme();

  const artist = useLogDraft((s) => s.artist);
  const eventDate = useLogDraft((s) => s.eventDate);
  const setEventDate = useLogDraft((s) => s.setEventDate);

  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(eventDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(eventDate.getMonth());
  const [showPicker, setShowPicker] = useState(false);

  function selectDay(day: number) {
    const d = clampToday(new Date(viewYear, viewMonth, day));
    setEventDate(d);
    void Haptics.selectionAsync();
  }

  function prevMonth() {
    if (viewMonth === 0) {
      if (viewYear <= MIN_YEAR) return;
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    void Haptics.selectionAsync();
  }

  function nextMonth() {
    const maxMonth =
      viewYear === today.getFullYear() ? today.getMonth() : 11;
    if (viewMonth >= maxMonth && viewYear >= today.getFullYear()) return;

    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    void Haptics.selectionAsync();
  }

  function handleYearMonthSelect(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
    // If selected date is now in this new month, adjust
    const clamped = clampToday(new Date(year, month, eventDate.getDate()));
    setEventDate(clamped);
    void Haptics.selectionAsync();
  }

  // Shortcut chips
  const todayDate = today;
  const yesterdayDate = subDays(today, 1);
  const lastSaturdayDate = lastSaturday();

  function pickShortcut(d: Date) {
    setEventDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    void Haptics.selectionAsync();
  }

  return (
    <WizardStepView step={2} continueLabel="Continue">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Artist avatar continuity */}
        {artist && (
          <View style={styles.artistHeader}>
            <ArtistAvatar
              name={artist.name}
              imageUrl={artist.image_url_large ?? artist.image_url_thumb}
              size={72}
            />
            <Text variant="label" weight="bold" numberOfLines={1} style={styles.artistName}>
              {artist.name}
            </Text>
          </View>
        )}

        {/* Friendly selected date label */}
        <View style={[styles.selectedLabel, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}40` }]}>
          <Text variant="label" weight="bold" center style={{ color: colors.accent }}>
            {friendlyDate(eventDate)}
          </Text>
        </View>

        {/* Shortcut chips */}
        <View style={styles.shortcuts}>
          <Chip
            selected={isSameDay(eventDate, todayDate)}
            onPress={() => { pickShortcut(todayDate); }}
          >
            Today
          </Chip>
          <Chip
            selected={isSameDay(eventDate, yesterdayDate)}
            onPress={() => { pickShortcut(yesterdayDate); }}
          >
            Yesterday
          </Chip>
          <Chip
            selected={isSameDay(eventDate, lastSaturdayDate)}
            onPress={() => { pickShortcut(lastSaturdayDate); }}
          >
            Last weekend
          </Chip>
        </View>

        {/* Calendar grid */}
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <CalendarGrid
            viewYear={viewYear}
            viewMonth={viewMonth}
            selected={eventDate}
            today={today}
            onSelectDay={selectDay}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onHeaderPress={() => { setShowPicker(true); }}
          />
        </View>
      </ScrollView>

      {/* Year/month picker overlay */}
      {showPicker && (
        <View style={styles.pickerOverlay}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.ink, opacity: 0.65 },
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { setShowPicker(false); }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss picker"
          />
          <YearMonthPicker
            year={viewYear}
            month={viewMonth}
            maxYear={today.getFullYear()}
            onSelect={handleYearMonthSelect}
            onClose={() => { setShowPicker(false); }}
          />
        </View>
      )}
    </WizardStepView>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  artistHeader: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[2],
  },
  artistName: {
    maxWidth: 220,
    textAlign: 'center',
  },
  selectedLabel: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  calendarCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  // Calendar
  calendar: {
    gap: spacing[2],
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  calHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  calNavBtn: {
    padding: 4,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellBtn: {
    borderRadius: CELL_SIZE / 2,
  },
  futureDay: {
    opacity: 0.35,
  },
  // Year/month wheel
  pickerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  wheelOverlay: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: 420,
  },
  wheelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wheelColumns: {
    flexDirection: 'row',
    height: 320,
  },
  wheelCol: {
    flex: 1,
    paddingVertical: spacing[2],
  },
  wheelItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: spacing[2],
    borderRadius: radius.sm,
  },
});
