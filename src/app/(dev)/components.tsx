/**
 * PAPER & INK — Brand Sheet & Components Showcase
 *
 * Visual archive of all design system foundations:
 * - Palette & Contrast Matrix
 * - Type Specimens (Young Serif, Schibsted Grotesk, DM Mono)
 * - Primitives (Button, Panel, Chip, Pill, Rule, Input, StarRating, etc.)
 * - Paper Shapes (Ticket, Stub, Stamp, Tape, TornEdge, Sticker, Label, Marquee)
 * - 14 Genre Pattern Swatches
 * - 6 Venue Stamps
 * - Custom Icon Sheet
 * - Physical Motion Demos (Stamp, Marquee, Odometer)
 */
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  BarChart3,
  Users,
  Orbit,
  Plus,
  Ticket as TicketIcon,
  Star as StarIcon,
  Heart,
  MessageSquare,
  Share2,
  Trash2,
  LockKeyhole,
  Bell,
  Disc3,
  Settings,
  Search,
} from 'lucide-react-native';
import {
  MACRO_GENRE_ORDER,
  MACRO_GENRES,
} from '../../features/genres/macroGenres';
import type { LabelSurface } from '../../features/genres/labelColors';
import {
  VENUE_TYPE_ORDER,
  VENUE_TYPES,
} from '../../features/venues/venueTypes';
import { useTheme } from '../../theme/ThemeProvider';
import { RAW, mix } from '../../theme/palette';
import {
  spacing,
  hardShadow,
  colors as themeColors,
  type ColorScheme,
} from '../../theme/tokens';
import {
  Avatar,
  Button,
  Panel,
  Chip,
  Rule,
  EmptyState,
  Input,
  Pill,
  SegmentedControl,
  StarRating,
  Text,
  Toast,
} from '../../components/ui';
import { Mascot, Wordmark } from '../../components/brand';
import type { MascotVariant } from '../../components/brand';
import {
  Ticket,
  Stub,
  Stamp,
  Tape,
  TornEdge,
  Label,
  Marquee,
  PatternFill,
  GenreLabel,
  Grain,
} from '../../components/paper';

const themeOptions = [
  { label: 'Paper (Light)', value: 'light' },
  { label: 'Night Shift', value: 'dark' },
];
const labelThemeOptions = [
  { label: 'Paper', value: 'light' },
  { label: 'Night Shift', value: 'dark' },
];
const labelSurfaceOptions = [
  { label: 'Page', value: 'bg' },
  { label: 'Surface', value: 'surface' },
  { label: 'Raised', value: 'surfaceRaised' },
  { label: 'Sunken', value: 'sunken' },
];

function BrandSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderBottomColor: colors.ink }]}>
        <Text
          variant="headline"
          style={[styles.sectionTitle, { color: colors.ink }]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text variant="label" style={{ color: colors.inkMuted }}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// Odometer count-up demo
function OdometerDemo() {
  const [count, setCount] = useState(42);
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => (prev >= 99 ? 1 : prev + 7));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.odometerRow}>
      <View
        style={[
          styles.odometerBox,
          hardShadow.sm,
          { backgroundColor: colors.surface, borderColor: colors.ink },
        ]}
      >
        <Text
          variant="display"
          style={[styles.odometerText, { color: colors.accent }]}
        >
          {count.toString().padStart(3, '0')}
        </Text>
      </View>
      <Text variant="label" style={{ color: colors.inkMuted }}>
        GIGS ARCHIVED (MECHANICAL ODOMETER)
      </Text>
    </View>
  );
}

export default function ComponentsPreviewScreen() {
  if (!__DEV__) return null;
  return <ComponentsPreview />;
}

function ComponentsPreview() {
  const { colors, scheme, setMode } = useTheme();
  const [toastVisible, setToastVisible] = useState(false);
  const [rating, setRating] = useState(4.5);
  const [selectedChip, setSelectedChip] = useState('Rock');
  const [labelScheme, setLabelScheme] = useState<ColorScheme>(scheme);
  const [labelSurface, setLabelSurface] = useState<LabelSurface>('surface');
  const labelTheme = themeColors[labelScheme];
  const labelSurfaceColor =
    labelSurface === 'sunken' ? labelTheme.bgSunken : labelTheme[labelSurface];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead */}
        <View style={[styles.masthead, { borderBottomColor: colors.ink }]}>
          <View style={styles.mastheadMeta}>
            <Text variant="label" style={{ color: colors.accent }}>
              ARCHIVE SPECIFICATION ✦ VER 2.0
            </Text>
            <Text variant="mono" style={{ color: colors.inkMuted }}>
              DESIGN SYSTEM: PAPER & INK
            </Text>
          </View>
          <Text
            variant="display"
            style={[styles.brandTitle, { color: colors.ink }]}
          >
            IveLive Brand Sheet
          </Text>
          <View style={styles.themeSelector}>
            <SegmentedControl
              options={themeOptions}
              value={scheme}
              onChange={(value) => setMode(value as 'dark' | 'light')}
            />
          </View>
        </View>

        <BrandSection
          title="00. Brand assets"
          subtitle="SVG ROLES · NEUTRAL EXPRESSION · LIGHT / DARK THEME"
        >
          <View style={styles.brandPreview}>
            <Wordmark height={34} variant="ink" />
            <Wordmark height={34} variant="wheat" />
            <Wordmark height={34} variant="orange" />
          </View>
          <Text variant="caption" color="secondary">
            Only recoloring is supported by the supplied art; moods remain
            neutral until separate face/accessory paths are provided.
          </Text>
          {([...MACRO_GENRE_ORDER, 'unclassified'] as const).map((genre) => (
            <View key={genre} style={styles.mascotPreviewRow}>
              <Text variant="mono" style={styles.mascotGenreLabel}>
                {MACRO_GENRES[genre].label}
              </Text>
              <View style={styles.mascotVariants}>
                {(['color', 'ink', 'sticker', 'stamp'] as MascotVariant[]).map(
                  (variant) => (
                    <Mascot
                      key={`${genre}-${variant}`}
                      accessibilityLabel={`${MACRO_GENRES[genre].label} mascot, ${variant} variant`}
                      genre={genre}
                      id={`${genre}-${variant}`}
                      size={56}
                      variant={variant}
                    />
                  ),
                )}
              </View>
            </View>
          ))}
          <View style={styles.brandIconPreviews}>
            <Image
              accessibilityLabel="Generated iOS icon"
              source={require('../../../assets/generated/icon-ios-1024.png')}
              style={styles.brandIcon}
            />
            <Image
              accessibilityLabel="Generated Android adaptive icon"
              source={require('../../../assets/generated/adaptive-foreground-1024.png')}
              style={[styles.brandIcon, { backgroundColor: RAW.violet }]}
            />
            <Image
              accessibilityLabel="Generated favicon"
              source={require('../../../assets/generated/favicon-48.png')}
              style={styles.brandIcon}
            />
          </View>
        </BrandSection>

        {/* 1. PALETTE & CONTRAST MATRIX */}
        <BrandSection
          title="01. The Five Hues"
          subtitle="STRICT FIVE-HUE PALETTE ✦ NO PURE BLACK / WHITE"
        >
          <View style={styles.paletteGrid}>
            {[
              {
                name: 'Mauve',
                hex: RAW.mauve,
                desc: 'Fanzine tint, subdued borders',
              },
              {
                name: 'Slate',
                hex: RAW.slate,
                desc: 'Cool dark ink, positive badge',
              },
              { name: 'Wheat', hex: RAW.wheat, desc: 'Newsprint paper ground' },
              {
                name: 'Orange',
                hex: RAW.orange,
                desc: 'Stamp accent, primary fill',
              },
              {
                name: 'Violet',
                hex: RAW.violet,
                desc: 'Primary deep gig-poster ink',
              },
            ].map((c) => (
              <View
                key={c.name}
                style={[
                  styles.colorChip,
                  hardShadow.sm,
                  { backgroundColor: c.hex, borderColor: colors.ink },
                ]}
              >
                <Text
                  variant="label"
                  style={[
                    styles.colorLabel,
                    { color: c.name === 'Wheat' ? RAW.violet : RAW.wheat },
                  ]}
                >
                  {c.name}
                </Text>
                <Text
                  variant="mono"
                  style={[
                    styles.colorHex,
                    { color: c.name === 'Wheat' ? RAW.violet : RAW.wheat },
                  ]}
                >
                  {c.hex}
                </Text>
              </View>
            ))}
          </View>

          {/* Tonal mix examples */}
          <View style={styles.mixRow}>
            <Text variant="label" style={{ color: colors.inkMuted }}>
              LINEAR MIX RAMPS (MAUVE → WHEAT / VIOLET → SLATE):
            </Text>
            <View style={styles.rampStrip}>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <View
                  key={t}
                  style={[
                    styles.rampCell,
                    { backgroundColor: mix(RAW.mauve, RAW.wheat, t) },
                  ]}
                />
              ))}
            </View>
          </View>
        </BrandSection>

        {/* 2. TYPOGRAPHY */}
        <BrandSection
          title="02. Typography"
          subtitle="YOUNG SERIF ✦ SCHIBSTED GROTESK ✦ DM MONO"
        >
          <View style={styles.typeBlock}>
            <Text variant="display" style={{ color: colors.ink }}>
              Young Serif 48/56
            </Text>
            <Text variant="headline" style={{ color: colors.ink }}>
              Headline Poster 36/44
            </Text>
            <Text variant="title" style={{ color: colors.ink }}>
              Title Cut 22/28
            </Text>
            <Text variant="body" style={{ color: colors.ink }}>
              Schibsted Grotesk body: Humanist, legible text inspired by
              mid-century gig programs and music journalism print.
            </Text>
            <Text variant="label" style={{ color: colors.accent }}>
              DM MONO 11PT ✦ TICKET SERIAL: #IL-9921-OCT26
            </Text>
          </View>
        </BrandSection>

        {/* 3. SIGNATURE PAPER SHAPES */}
        <BrandSection
          title="03. Paper Shapes"
          subtitle="TICKETS ✦ STUBS ✦ STAMPS ✦ TAPE ✦ STICKERS ✦ GRAIN"
        >
          <View
            style={[
              styles.grainSample,
              { backgroundColor: colors.bg, borderColor: colors.ink },
            ]}
          >
            <Grain />
            <Text variant="label" style={{ color: colors.ink }}>
              CACHED PAPER GRAIN TILE
            </Text>
          </View>

          {/* Ticket */}
          <Ticket serialNumber="IL-2026-LIVE-904" hasBarcode>
            <Text variant="label" style={{ color: colors.accent }}>
              ADMIT ONE ✦ SECTION PIT
            </Text>
            <Text variant="title" style={{ color: colors.ink, marginTop: 4 }}>
              The Strokes at Razzmatazz
            </Text>
            <Text
              variant="caption"
              style={{ color: colors.inkMuted, marginTop: 2 }}
            >
              Thu, 24 Oct 2026 • Sala 1 • Barcelona
            </Text>
          </Ticket>

          {/* Stub */}
          <Stub id="demo-stub" tilt>
            <Text variant="label" style={{ color: colors.inkMuted }}>
              CONCERT LOG STUB
            </Text>
            <Text
              variant="subtitle"
              style={{ color: colors.ink, marginTop: 2 }}
            >
              Fontaines D.C. — Live in Madrid
            </Text>
          </Stub>

          {/* Stamps & Tape & Labels */}
          <View style={styles.stampDemoRow}>
            <Stamp label="FIVE STAR" variant="orange" tilt />
            <Stamp label="VERIFIED" variant="slate" tilt />
            <Stamp label="ARCHIVED" variant="mauve" tilt />
            <Label text="SOLD OUT" color="accent" tilt />
            <Tape width={60} height={16} />
          </View>

          {/* Torn edge divider */}
          <View style={{ marginVertical: 12 }}>
            <Text
              variant="label"
              style={{ color: colors.inkMuted, marginBottom: 4 }}
            >
              TORN PAPER TEAR:
            </Text>
            <TornEdge
              edge="top"
              width={320}
              height={10}
              color={colors.surface}
            />
          </View>
        </BrandSection>

        {/* 4. GENRE PATTERN SWATCHES */}
        <BrandSection
          title="04. 14 Genre Patterns"
          subtitle="TWO-INK RISOGRAPH PATTERNS (NO NEW HUES)"
        >
          <View style={styles.patternGrid}>
            {MACRO_GENRE_ORDER.map((slug) => {
              const genre = MACRO_GENRES[slug];
              return (
                <View key={slug} style={styles.patternCell}>
                  <View
                    style={[
                      styles.patternFrame,
                      hardShadow.sm,
                      { borderColor: colors.ink },
                    ]}
                  >
                    <PatternFill
                      pattern={genre.pattern}
                      colorA={RAW[genre.inkA]}
                      colorB={RAW[genre.inkB]}
                      width={86}
                      height={50}
                    />
                  </View>
                  <Text
                    variant="label"
                    style={[styles.patternName, { color: colors.ink }]}
                  >
                    {genre.label}
                  </Text>
                  <Text
                    variant="mono"
                    style={{ fontSize: 9, color: colors.inkMuted }}
                  >
                    {genre.pattern}
                  </Text>
                </View>
              );
            })}
          </View>
        </BrandSection>

        <BrandSection
          title="05. Genre label contrast matrix"
          subtitle="15 GENRES · 2 THEMES · 3 SIZES · 3 VARIANTS · 4 SURFACES"
        >
          <SegmentedControl
            options={labelThemeOptions}
            value={labelScheme}
            onChange={(value) => setLabelScheme(value as ColorScheme)}
          />
          <SegmentedControl
            options={labelSurfaceOptions}
            value={labelSurface}
            onChange={(value) => setLabelSurface(value as LabelSurface)}
          />
          <View
            style={[
              styles.labelMatrix,
              {
                backgroundColor: labelSurfaceColor,
                borderColor: labelTheme.ink,
              },
            ]}
          >
            {([...MACRO_GENRE_ORDER, 'unclassified'] as const).map((slug) => (
              <View key={slug} style={styles.labelMatrixRow}>
                <Text
                  variant="caption"
                  weight="bold"
                  style={[styles.labelMatrixName, { color: labelTheme.ink }]}
                >
                  {MACRO_GENRES[slug].label}
                </Text>
                <View style={styles.labelMatrixCells}>
                  {(['xs', 'sm', 'md'] as const).flatMap((size) =>
                    (['solid', 'outline', 'stamp'] as const).map((variant) => (
                      <GenreLabel
                        key={`${slug}-${size}-${variant}`}
                        genre={slug}
                        size={size}
                        variant={variant}
                        surface={labelSurface}
                        schemeOverride={labelScheme}
                      />
                    )),
                  )}
                </View>
              </View>
            ))}
          </View>
        </BrandSection>

        {/* 5. VENUE STAMPS */}
        <BrandSection
          title="06. Venue Stamps"
          subtitle="6 PHYSICAL STAMP SHAPES & GLYPHS"
        >
          <View style={styles.venueGrid}>
            {VENUE_TYPE_ORDER.map((key) => {
              const venue = VENUE_TYPES[key];
              return (
                <View key={key} style={styles.venueItem}>
                  <Pill venueType={key}>{venue.label}</Pill>
                  <Text
                    variant="mono"
                    style={{
                      fontSize: 9,
                      color: colors.inkMuted,
                      marginTop: 4,
                    }}
                  >
                    {venue.stampShape}
                  </Text>
                </View>
              );
            })}
          </View>
        </BrandSection>

        {/* 6. PRIMITIVES */}
        <BrandSection
          title="07. Core Primitives"
          subtitle="BUTTONS ✦ INPUTS ✦ CHIPS ✦ RULES ✦ PANELS"
        >
          <View style={styles.primitiveStack}>
            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button label="Admit One" variant="primary" />
              <Button label="Pass Details" variant="secondary" />
              <Button label="Underline" variant="ghost" />
            </View>

            {/* Input */}
            <Input
              label="ARTIST NAME"
              placeholder="e.g. Arctic Monkeys"
              defaultValue="LCD Soundsystem"
            />

            {/* Chips */}
            <View style={styles.chipRow}>
              {['Rock', 'Indie', 'Post-Punk'].map((genre) => (
                <Chip
                  key={genre}
                  selected={selectedChip === genre}
                  onPress={() => setSelectedChip(genre)}
                >
                  {genre}
                </Chip>
              ))}
            </View>

            {/* Star Rating */}
            <View style={styles.starRow}>
              <Text variant="label" style={{ color: colors.inkMuted }}>
                RATE THE NIGHT:
              </Text>
              <StarRating value={rating} onChange={setRating} />
            </View>

            {/* Printed Rule with Ticks */}
            <Rule hasTicks />

            {/* Die-cut sticker avatars */}
            <View style={styles.avatarRow}>
              <Avatar name="Julian Casablancas" size="lg" />
              <Avatar name="PJ Harvey" size="md" />
              <Avatar name="Nick Cave" size="sm" />
            </View>

            {/* Panel */}
            <Panel padding={16}>
              <Text variant="title">Printed Paper Panel</Text>
              <Text variant="body" color="secondary" style={{ marginTop: 4 }}>
                1.5px ink border with a 3px hard solid shadow. No soft blur.
              </Text>
            </Panel>
          </View>
        </BrandSection>

        {/* 7. CUSTOM ICON SET */}
        <BrandSection
          title="08. Custom Icon Set"
          subtitle="2.5PX STROKES ✦ SQUARE CAPS ✦ PAPER-CUT GEOMETRY"
        >
          <View style={styles.iconGrid}>
            {[
              { Icon: CalendarDays, name: 'Calendar' },
              { Icon: BarChart3, name: 'Stats' },
              { Icon: Users, name: 'Friends' },
              { Icon: Orbit, name: 'Cloud' },
              { Icon: TicketIcon, name: 'Ticket' },
              { Icon: StarIcon, name: 'Star' },
              { Icon: Heart, name: 'Heart' },
              { Icon: MessageSquare, name: 'Comment' },
              { Icon: Share2, name: 'Share' },
              { Icon: Plus, name: 'Plus' },
              { Icon: Trash2, name: 'Trash' },
              { Icon: LockKeyhole, name: 'Lock' },
              { Icon: Bell, name: 'Bell' },
              { Icon: Disc3, name: 'Record' },
              { Icon: Settings, name: 'Settings' },
              { Icon: Search, name: 'Search' },
            ].map(({ Icon, name }) => (
              <View key={name} style={styles.iconItem}>
                <View
                  style={[
                    styles.iconBox,
                    hardShadow.sm,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.ink,
                    },
                  ]}
                >
                  <Icon color={colors.ink} size={22} strokeWidth={2.5} />
                </View>
                <Text
                  variant="mono"
                  style={{ fontSize: 9, color: colors.inkMuted, marginTop: 4 }}
                >
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </BrandSection>

        {/* 8. PHYSICAL MOTION DEMOS */}
        <BrandSection
          title="09. Physical Motion"
          subtitle="TICKER ✦ STAMP IMPACT ✦ MECHANICAL ODOMETER"
        >
          {/* Marquee ticker */}
          <Marquee text="TONIGHT SOLD OUT ✦ DOORS OPEN 20:00 ✦ STAMP AT THE ENTRANCE" />

          {/* Mechanical Odometer */}
          <View style={{ marginTop: 16 }}>
            <OdometerDemo />
          </View>
        </BrandSection>

        {/* Empty state voice showcase */}
        <BrandSection
          title="10. Voice & Empty State"
          subtitle="DRY GIG-FLAVORED MICROCOPY"
        >
          <EmptyState
            title="Doors open"
            description="Nothing on the setlist yet. Log your first gig to start your concert passport."
            icon={TicketIcon}
            action={
              <Button label="Admit One" onPress={() => setToastVisible(true)} />
            }
          />
        </BrandSection>

        <Toast
          visible={toastVisible}
          message="Stub stamped into your archive."
          variant="success"
          onDismiss={() => setToastVisible(false)}
        />

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  masthead: {
    borderBottomWidth: 2,
    paddingBottom: spacing.lg,
    marginBottom: spacing.xl,
  },
  mastheadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  brandTitle: {
    marginTop: 4,
  },
  themeSelector: {
    marginTop: 16,
    maxWidth: 280,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    borderBottomWidth: 1.5,
    paddingBottom: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    letterSpacing: -0.5,
  },
  sectionBody: {
    gap: 16,
  },
  brandPreview: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  mascotPreviewRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  mascotGenreLabel: { width: 84 },
  mascotVariants: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandIconPreviews: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  brandIcon: { height: 72, width: 72 },
  grainSample: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
    position: 'relative',
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChip: {
    width: 96,
    height: 72,
    borderWidth: 1.5,
    padding: 8,
    justifyContent: 'space-between',
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  colorHex: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  mixRow: {
    marginTop: 8,
    gap: 6,
  },
  rampStrip: {
    flexDirection: 'row',
    height: 18,
    borderWidth: 1.5,
    borderColor: RAW.violet,
    overflow: 'hidden',
  },
  rampCell: {
    flex: 1,
  },
  typeBlock: {
    gap: 8,
  },
  stampDemoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  patternCell: {
    alignItems: 'center',
    width: 86,
  },
  patternFrame: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  patternName: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  labelMatrix: {
    borderWidth: 1.5,
    gap: 8,
    padding: 8,
  },
  labelMatrixRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingVertical: 6,
  },
  labelMatrixName: {
    fontSize: 11,
  },
  labelMatrixCells: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  venueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  venueItem: {
    alignItems: 'flex-start',
  },
  primitiveStack: {
    gap: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  iconItem: {
    alignItems: 'center',
    width: 48,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  odometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  odometerBox: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  odometerText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
