import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";

const { width, height } = Dimensions.get("window");

interface GradientBackgroundProps {
  children: React.ReactNode;
  animated?: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  animated = true,
}) => {
  const { theme } = useTheme();
  
  // Floating orbs animation
  const orb1Y = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3X = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      orb1Y.value = withRepeat(
        withTiming(30, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb2Y.value = withDelay(
        1000,
        withRepeat(
          withTiming(-25, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        )
      );
      orb3X.value = withDelay(
        500,
        withRepeat(
          withTiming(20, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        )
      );
    }
  }, [animated]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1Y.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb2Y.value }],
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb3X.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.background as [string, string, ...string[]]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Ethereal floating orbs */}
      {animated && (
        <>
          <Animated.View
            style={[
              styles.orb,
              styles.orb1,
              { backgroundColor: theme.colors.primary },
              orb1Style,
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              styles.orb2,
              { backgroundColor: theme.colors.secondary },
              orb2Style,
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              styles.orb3,
              { backgroundColor: theme.colors.accent },
              orb3Style,
            ]}
          />
        </>
      )}

      {/* Subtle noise texture overlay */}
      <View style={[styles.noiseOverlay, { opacity: 0.02 }]} />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.15,
  },
  orb1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    left: -width * 0.2,
    filter: "blur(60px)",
  },
  orb2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: height * 0.1,
    right: -width * 0.2,
    filter: "blur(50px)",
  },
  orb3: {
    width: width * 0.4,
    height: width * 0.4,
    top: height * 0.4,
    left: width * 0.1,
    filter: "blur(40px)",
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
  },
});
