import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow } from '../../theme/tokens';
import { Text } from '../ui/Text';

export interface TicketProps {
  children?: React.ReactNode;
  serialNumber?: string;
  hasBarcode?: boolean;
  style?: ViewStyle;
  notchRadius?: number;
}

export function Ticket({
  children,
  serialNumber = 'IL-2026-TKT',
  hasBarcode = true,
  style,
  notchRadius = 10,
}: TicketProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.outer, hardShadow.md, style]}>
      {/* Background card with notched sides */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.ink,
          },
        ]}
      >
        {/* Left notch cutout indicator */}
        <View
          style={[
            styles.notch,
            styles.notchLeft,
            {
              width: notchRadius * 2,
              height: notchRadius * 2,
              borderRadius: notchRadius,
              backgroundColor: colors.bg,
              borderColor: colors.ink,
            },
          ]}
        />
        {/* Right notch cutout indicator */}
        <View
          style={[
            styles.notch,
            styles.notchRight,
            {
              width: notchRadius * 2,
              height: notchRadius * 2,
              borderRadius: notchRadius,
              backgroundColor: colors.bg,
              borderColor: colors.ink,
            },
          ]}
        />

        {/* Ticket content */}
        <View style={styles.body}>{children}</View>

        {/* Perforated dashed divider */}
        <View style={styles.perforationWrap}>
          <Svg height={2} width="100%">
            <Line
              x1="0"
              y1="1"
              x2="1000"
              y2="1"
              stroke={colors.line}
              strokeWidth={1.5}
              strokeDasharray="4, 4"
            />
          </Svg>
        </View>

        {/* Barcode & Serial strip */}
        {hasBarcode && (
          <View style={styles.barcodeStrip}>
            <View style={styles.barcodeLines}>
              <Svg height={24} width={120}>
                {[2, 8, 12, 18, 22, 28, 32, 38, 44, 52, 58, 64, 72, 80, 88, 96, 102, 110].map(
                  (x, i) => (
                    <Line
                      key={i}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={24}
                      stroke={colors.ink}
                      strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
                    />
                  ),
                )}
              </Svg>
            </View>
            <Text variant="label" style={[styles.serial, { color: colors.inkMuted }]}>
              {serialNumber}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginVertical: 6,
  },
  card: {
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  notch: {
    position: 'absolute',
    top: '55%',
    marginTop: -10,
    borderWidth: 2,
    zIndex: 10,
  },
  notchLeft: {
    left: -11,
  },
  notchRight: {
    right: -11,
  },
  body: {
    padding: 16,
  },
  perforationWrap: {
    width: '100%',
    paddingHorizontal: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  barcodeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  barcodeLines: {
    height: 24,
    justifyContent: 'center',
  },
  serial: {
    fontSize: 10,
  },
});
