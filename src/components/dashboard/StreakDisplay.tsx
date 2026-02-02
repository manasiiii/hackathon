import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";
import { typography, borderRadius } from "../../constants/theme";

interface StreakDisplayProps {
  streak: number;
  longestStreak?: number;
  totalEntries?: number;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streak,
  longestStreak = 0,
  totalEntries = 0,
}) => {
  const { theme } = useTheme();
  const flameScale = useSharedValue(1);
  const flameRotation = useSharedValue(0);

  React.useEffect(() => {
    if (streak > 0) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      flameRotation.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(5, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1
      );
    }
  }, [streak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotation.value}deg` },
    ],
  }));

  const getStreakMessage = () => {
    if (streak === 0) return "Start your journey today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} days strong! Building momentum.`;
    if (streak < 14) return `${streak} days! You're shining! ✨`;
    if (streak < 30) return `${streak} days! Incredible dedication!`;
    if (streak < 100) return `${streak} days! You're a journaling master!`;
    return `${streak} days! Legendary commitment! 💎`;
  };

  const getStreakColor = () => {
    if (streak < 3) return theme.colors.neutral;
    if (streak < 7) return theme.colors.positive;
    if (streak < 14) return "#FB923C"; // Orange
    return "#F97316"; // Bright orange
  };

  const streakColor = getStreakColor();

  return (
    <LinearGradient
      colors={[`${streakColor}20`, `${streakColor}05`]}
      style={[styles.container, { borderColor: `${streakColor}30` }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.mainContent}>
        <Animated.View style={[styles.flameContainer, flameStyle]}>
          {streak > 0 ? (
            <Text style={styles.flameEmoji}>✨</Text>
          ) : (
            <Ionicons
              name="flame-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          )}
        </Animated.View>

        <View style={styles.streakInfo}>
          <View style={styles.streakNumberRow}>
            <Text style={[styles.streakNumber, { color: streakColor }]}>
              {streak}
            </Text>
            <Text style={[styles.daysLabel, { color: theme.colors.textMuted }]}>
              day{streak !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {getStreakMessage()}
          </Text>
        </View>
      </View>

      {/* Additional stats */}
      <View style={[styles.statsRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons
            name="trophy-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {longestStreak}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Best streak
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.statItem}>
          <Ionicons
            name="book-outline"
            size={16}
            color={theme.colors.secondary}
          />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {totalEntries}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Total entries
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  flameContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  flameEmoji: {
    fontSize: 48,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  streakNumber: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
  },
  daysLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },
  message: {
    fontSize: typography.fontSize.sm,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
  },
  statDivider: {
    width: 1,
    height: "100%",
    opacity: 0.3,
  },
});
