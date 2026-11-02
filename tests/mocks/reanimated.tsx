import React from 'react';
import { ScrollView, Text, View } from 'react-native';

const Animated = {
  View,
  Text,
  ScrollView,
  createAnimatedComponent: <T,>(component: T) => component,
};

export const Easing = {
  inOut: (easing: unknown) => easing,
  out: (easing: unknown) => easing,
  ease: (value: unknown) => value,
  quad: 'quad',
};

export const FadeInDown = { duration: () => undefined };
export const FadeOutUp = { duration: () => undefined };
export const LinearTransition = {
  duration: () => undefined,
  springify: () => LinearTransition,
  damping: () => LinearTransition,
};
export const cancelAnimation = () => undefined;
export const useAnimatedStyle = <T,>(factory: () => T) => factory();
export const useAnimatedReaction = () => undefined;
export const useSharedValue = <T,>(initialValue: T) => {
  let val = initialValue;
  return {
    get value() {
      return val;
    },
    set value(v: T) {
      val = v;
    },
    get: () => val,
    set: (v: T) => {
      val = v;
    },
  };
};
export const useEvent = () => () => undefined;
export const useFrameCallback = () => ({ setActive: () => undefined });
export const runOnJS = <T extends (...args: unknown[]) => unknown>(fn: T) => fn;
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const useReducedMotion = () => false;
export const withRepeat = <T,>(animation: T) => animation;
export const withSequence = <T,>(...animations: T[]) =>
  animations[animations.length - 1];
export const withSpring = <T,>(value: T) => value;
export const withTiming = <T,>(value: T) => value;
export const useAnimatedScrollHandler = () => () => undefined;
export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[],
) => {
  const firstIn = inputRange[0] ?? 0;
  const lastIn = inputRange[inputRange.length - 1] ?? 1;
  const firstOut = outputRange[0] ?? 0;
  const lastOut = outputRange[outputRange.length - 1] ?? 1;
  if (value <= firstIn) return firstOut;
  if (value >= lastIn) return lastOut;
  return firstOut;
};
export const Extrapolation = { CLAMP: 'clamp' };

export default Animated;
