import React from "react";
import { StyleSheet, View, Text, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { typography, borderRadius } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  transcript?: string;
  size?: "normal" | "large";
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing,
  onPress,
  onLongPress,
  transcript,
  size = "normal",
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const waveAmplitude = useSharedValue(0);

  React.useEffect(() => {
    if (isListening) {
      // Pulse animation
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Ring expansion
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1500 }),
          withTiming(1, { duration: 0 })
        ),
        -1
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 100 }),
          withTiming(0, { duration: 1400 })
        ),
        -1
      );

      // Voice wave amplitude
      waveAmplitude.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 200 }),
          withTiming(0.8, { duration: 250 }),
          withTiming(0.5, { duration: 200 })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(waveAmplitude);
      
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0.6);
      ringScale.value = withTiming(1);
      ringOpacity.value = withTiming(0);
      waveAmplitude.value = withTiming(0);
    }
  }, [isListening]);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const buttonSize = size === "large" ? 100 : 72;
  const iconSize = size === "large" ? 40 : 32;

  return (
    <View style={styles.container}>
      {/* Expanding rings */}
      {isListening && (
        <>
          <Animated.View
            style={[
              styles.ring,
              ringAnimatedStyle,
              {
                width: buttonSize + 40,
                height: buttonSize + 40,
                borderRadius: (buttonSize + 40) / 2,
                borderColor: theme.colors.primary,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulse,
              pulseAnimatedStyle,
              {
                width: buttonSize + 20,
                height: buttonSize + 20,
                borderRadius: (buttonSize + 20) / 2,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </>
      )}

      {/* Main button */}
      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={onLongPress}
        >
          <LinearGradient
            colors={
              isListening
                ? [theme.colors.accent, theme.colors.primary]
                : (theme.gradients.accent as [string, string])
            }
            style={[
              styles.button,
              {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isProcessing ? (
              <Animated.View style={styles.processingContainer}>
                <ActivityDots color={theme.colors.text} />
              </Animated.View>
            ) : (
              <Ionicons
                name={isListening ? "stop" : "mic"}
                size={iconSize}
                color={theme.colors.text}
              />
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Status text */}
      <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
        {isProcessing
          ? "Processing..."
          : isListening
          ? "Listening..."
          : "Tap to speak"}
      </Text>

      {/* Live transcript preview */}
      {transcript && isListening && (
        <View
          style={[
            styles.transcriptContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            style={[styles.transcript, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        </View>
      )}
    </View>
  );
};

// Activity dots component for processing state
const ActivityDots: React.FC<{ color: string }> = ({ color }) => {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  React.useEffect(() => {
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 })
      ),
      -1
    );
    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 150 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 300 })
      ),
      -1
    );
    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.3, { duration: 150 })
      ),
      -1
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot1Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot2Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dot3Style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulse: {
    position: "absolute",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  processingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    marginTop: 16,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  transcriptContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: borderRadius.md,
    maxWidth: SCREEN_WIDTH - 80,
  },
  transcript: {
    fontSize: typography.fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
});
