import React, { useId } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  Pattern,
  Rect,
  Circle,
  Line,
  Path,
} from 'react-native-svg';
import type { GenrePattern } from '../../features/genres/macroGenres';
import { RAW } from '../../theme/palette';

export interface PatternFillProps {
  pattern: GenrePattern;
  colorA?: string;
  colorB?: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function PatternFill({
  pattern,
  colorA = RAW.orange,
  colorB = RAW.wheat,
  width = 120,
  height = 80,
  style,
}: PatternFillProps) {
  const reactId = useId();

  if (pattern === 'none') {
    return (
      <View
        style={[
          styles.container,
          { width, height, backgroundColor: colorA },
          style,
        ]}
      />
    );
  }

  const patternId = `pat-${pattern}-${reactId.replace(/:/g, '')}`;

  const renderPattern = () => {
    switch (pattern) {
      case 'dots':
        return (
          <Pattern
            id={patternId}
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx={6} cy={6} r={3} fill={colorA} />
          </Pattern>
        );
      case 'stripes':
        return (
          <Pattern
            id={patternId}
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Line x1={0} y1={0} x2={0} y2={10} stroke={colorA} strokeWidth={4} />
          </Pattern>
        );
      case 'checker':
        return (
          <Pattern
            id={patternId}
            width={16}
            height={16}
            patternUnits="userSpaceOnUse"
          >
            <Rect x={0} y={0} width={8} height={8} fill={colorA} />
            <Rect x={8} y={8} width={8} height={8} fill={colorA} />
          </Pattern>
        );
      case 'waves':
        return (
          <Pattern
            id={patternId}
            width={20}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 0 5 Q 5 0 10 5 T 20 5"
              fill="none"
              stroke={colorA}
              strokeWidth={2}
            />
          </Pattern>
        );
      case 'grid':
        return (
          <Pattern
            id={patternId}
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke={colorA}
              strokeWidth={1.5}
            />
          </Pattern>
        );
      case 'rays':
        return (
          <Pattern
            id={patternId}
            width={24}
            height={24}
            patternUnits="userSpaceOnUse"
          >
            <Line x1={12} y1={12} x2={0} y2={0} stroke={colorA} strokeWidth={1.5} />
            <Line x1={12} y1={12} x2={12} y2={0} stroke={colorA} strokeWidth={1.5} />
            <Line x1={12} y1={12} x2={24} y2={0} stroke={colorA} strokeWidth={1.5} />
            <Line x1={12} y1={12} x2={24} y2={12} stroke={colorA} strokeWidth={1.5} />
          </Pattern>
        );
      case 'diamonds':
        return (
          <Pattern
            id={patternId}
            width={16}
            height={16}
            patternUnits="userSpaceOnUse"
          >
            <Path d="M 8 0 L 16 8 L 8 16 L 0 8 Z" fill={colorA} />
          </Pattern>
        );
      case 'crosshatch':
        return (
          <Pattern
            id={patternId}
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <Line x1={0} y1={0} x2={10} y2={10} stroke={colorA} strokeWidth={1.5} />
            <Line x1={10} y1={0} x2={0} y2={10} stroke={colorA} strokeWidth={1.5} />
          </Pattern>
        );
      case 'scallops':
        return (
          <Pattern
            id={patternId}
            width={16}
            height={8}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 0 0 A 8 8 0 0 0 16 0"
              fill="none"
              stroke={colorA}
              strokeWidth={2}
            />
          </Pattern>
        );
      case 'zigzag':
        return (
          <Pattern
            id={patternId}
            width={16}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 0 5 L 4 0 L 12 10 L 16 5"
              fill="none"
              stroke={colorA}
              strokeWidth={2}
            />
          </Pattern>
        );
      case 'scales':
        return (
          <Pattern
            id={patternId}
            width={14}
            height={14}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx={7} cy={7} r={6} fill="none" stroke={colorA} strokeWidth={1.5} />
          </Pattern>
        );
      case 'herringbone':
        return (
          <Pattern
            id={patternId}
            width={16}
            height={16}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M 0 4 L 8 12 L 16 4 M 0 12 L 8 20 L 16 12"
              fill="none"
              stroke={colorA}
              strokeWidth={1.5}
            />
          </Pattern>
        );
      case 'mesh':
        return (
          <Pattern
            id={patternId}
            width={8}
            height={8}
            patternUnits="userSpaceOnUse"
          >
            <Line x1={0} y1={0} x2={8} y2={8} stroke={colorA} strokeWidth={1} />
            <Circle cx={4} cy={4} r={1.5} fill={colorA} />
          </Pattern>
        );
      case 'diagonal_bars':
      default:
        return (
          <Pattern
            id={patternId}
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
          >
            <Line x1={0} y1={12} x2={12} y2={0} stroke={colorA} strokeWidth={3} />
          </Pattern>
        );
    }
  };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>{renderPattern()}</Defs>
        <Rect x={0} y={0} width={width} height={height} fill={colorB} />
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
