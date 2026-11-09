import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing } from '../../theme/tokens';
import { countryNameFromCode } from './location';
import { getConcertSearchCountries } from './concertCountries';

type Props = {
  countryCode: string | null;
  dateFrom: string;
  dateTo: string;
  onCountryChange: (countryCode: string | null) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
};

type DateTarget = 'from' | 'to';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ConcertSearchFilters({
  countryCode,
  dateFrom,
  dateTo,
  onCountryChange,
  onDateFromChange,
  onDateToChange,
}: Props) {
  const { colors } = useTheme();
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);

  const countries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase();
    return getConcertSearchCountries().filter(
      ({ code, name }) =>
        !query ||
        name.toLocaleLowerCase().includes(query) ||
        code.toLocaleLowerCase().includes(query),
    );
  }, [countrySearch]);

  const activeDate = dateTarget === 'from' ? dateFrom : dateTo;
  const selectedDate = parseDate(activeDate) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from<null>({ length: leadingDays }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function openDatePicker(target: DateTarget) {
    const currentValue = target === 'from' ? dateFrom : dateTo;
    const currentDate = parseDate(currentValue) ?? new Date();
    setVisibleMonth(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    );
    setDateTarget(target);
  }

  function selectDate(day: number) {
    if (!dateTarget) return;
    const value = dateKey(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day),
    );
    if (dateTarget === 'from') {
      onDateFromChange(value);
      if (dateTo && dateTo < value) onDateToChange('');
    } else {
      onDateToChange(value);
      if (dateFrom && dateFrom > value) onDateFromChange('');
    }
    setDateTarget(null);
  }

  function changeMonth(amount: number) {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + amount, 1),
    );
  }

  return (
    <>
      <View style={styles.group}>
        <Text variant="caption" color="secondary">
          COUNTRY
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            countryCode
              ? `Country: ${countryNameFromCode(countryCode)}`
              : 'Country: Worldwide'
          }
          onPress={() => setCountryPickerVisible(true)}
          style={[
            styles.selectButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.line,
            },
          ]}
        >
          <Text variant="label" numberOfLines={1} style={styles.selectLabel}>
            {countryCode ? countryNameFromCode(countryCode) : 'Worldwide'}
          </Text>
          <Search size={17} color={colors.inkMuted} />
        </Pressable>
      </View>

      <View style={styles.group}>
        <Text variant="caption" color="secondary">
          DATE RANGE
        </Text>
        <View style={styles.dateRow}>
          <DateButton
            label="From"
            value={dateFrom}
            onPress={() => openDatePicker('from')}
            onClear={() => onDateFromChange('')}
          />
          <DateButton
            label="To"
            value={dateTo}
            onPress={() => openDatePicker('to')}
            onClear={() => onDateToChange('')}
          />
        </View>
        <Text variant="caption" color="secondary">
          Leave blank to search upcoming dates in the next year.
        </Text>
      </View>

      <Sheet
        visible={countryPickerVisible}
        title="Choose a country"
        snapPoints={['70%', '92%']}
        useScrollableContent
        onDismiss={() => {
          setCountryPickerVisible(false);
          setCountrySearch('');
        }}
      >
        <View style={styles.sheetBody}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.line,
              },
            ]}
          >
            <Search size={17} color={colors.inkMuted} />
            <TextInput
              accessibilityLabel="Search countries"
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setCountrySearch}
              placeholder="Search countries"
              placeholderTextColor={colors.inkMuted}
              style={[styles.searchInput, { color: colors.ink }]}
              value={countrySearch}
            />
            {countrySearch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear country search"
                hitSlop={8}
                onPress={() => setCountrySearch('')}
              >
                <X size={17} color={colors.inkMuted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CountryOption
              label="Worldwide"
              selected={countryCode === null}
              onPress={() => {
                onCountryChange(null);
                setCountryPickerVisible(false);
                setCountrySearch('');
              }}
            />
            {countries.map(({ code, name }) => (
              <CountryOption
                key={code}
                label={name}
                detail={code}
                selected={countryCode === code}
                onPress={() => {
                  onCountryChange(code);
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              />
            ))}
            {!countries.length ? (
              <Text
                variant="caption"
                color="secondary"
                style={styles.noMatches}
              >
                No countries match that search.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </Sheet>

      <Sheet
        visible={dateTarget !== null}
        title={dateTarget === 'from' ? 'Start date' : 'End date'}
        snapPoints={['68%', '88%']}
        onDismiss={() => setDateTarget(null)}
      >
        <View style={styles.calendarBody}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={10}
              onPress={() => changeMonth(-1)}
              style={styles.monthButton}
            >
              <ChevronLeft size={20} color={colors.ink} />
            </Pressable>
            <Text variant="label" weight="bold">
              {format(visibleMonth, 'MMMM yyyy')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={10}
              onPress={() => changeMonth(1)}
              style={styles.monthButton}
            >
              <ChevronRight size={20} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <Text
                key={`${day}-${index}`}
                variant="caption"
                color="secondary"
                style={styles.weekDay}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const value = dateKey(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  day,
                ),
              );
              const selected = value === activeDate;
              const isPastDate = value < dateKey(new Date());
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={format(
                    new Date(`${value}T12:00:00`),
                    'EEEE, MMMM d, yyyy',
                  )}
                  accessibilityState={{ selected, disabled: isPastDate }}
                  disabled={isPastDate}
                  onPress={() => selectDate(day)}
                  style={[
                    styles.dayCell,
                    styles.dayButton,
                    selected && { backgroundColor: colors.accent },
                    isPastDate && styles.pastDay,
                  ]}
                >
                  <Text
                    variant="caption"
                    weight={selected ? 'bold' : 'regular'}
                    style={{
                      color: selected
                        ? colors.accentInk
                        : isPastDate
                          ? colors.inkMuted
                          : colors.ink,
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (dateTarget === 'from') onDateFromChange('');
              else onDateToChange('');
              setDateTarget(null);
            }}
            style={styles.clearDate}
          >
            <Text variant="label" color="accent">
              Clear date
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

function DateButton({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value: string;
  onPress: () => void;
  onClear: () => void;
}) {
  const { colors } = useTheme();
  const date = parseDate(value);
  return (
    <View style={styles.dateField}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View style={styles.dateControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} date: ${date ? format(date, 'PPP') : 'Any date'}`}
          onPress={onPress}
          style={[
            styles.dateButton,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
          ]}
        >
          <CalendarDays size={17} color={colors.accent} />
          <Text variant="label" numberOfLines={1} style={styles.dateLabel}>
            {date ? format(date, 'd MMM yyyy') : 'Any date'}
          </Text>
        </Pressable>
        {date ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()} date`}
            hitSlop={8}
            onPress={onClear}
            style={styles.clearButton}
          >
            <X size={16} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CountryOption({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.countryOption, { borderBottomColor: colors.line }]}
    >
      <Text variant="label" style={styles.countryName}>
        {label}
      </Text>
      {detail ? (
        <Text variant="caption" color="secondary">
          {detail}
        </Text>
      ) : null}
      {selected ? <Check size={18} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  selectButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectLabel: { flex: 1 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateField: { flex: 1, gap: spacing.xs, minWidth: 140 },
  dateControl: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  dateButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  dateLabel: { flex: 1 },
  clearButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 30,
  },
  sheetBody: { flex: 1, gap: spacing.sm, paddingHorizontal: spacing.lg },
  searchBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    minWidth: 0,
    paddingVertical: spacing.xs,
  },
  countryOption: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.xs,
  },
  countryName: { flex: 1 },
  noMatches: { paddingVertical: spacing.lg, textAlign: 'center' },
  calendarBody: { gap: spacing.md, paddingHorizontal: spacing.lg },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '14.2857%',
  },
  dayButton: { aspectRatio: 1, borderRadius: radius.md },
  pastDay: { opacity: 0.4 },
  clearDate: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
});
