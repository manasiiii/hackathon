import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { typography, borderRadius } from "../../constants/theme";

interface Stat {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface StatsGridProps {
  stats: Stat[];
  columns?: 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, columns = 2 }) => {
  return (
    <View style={[styles.grid, { gap: 12 }]}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          stat={stat}
          index={index}
          columns={columns}
        />
      ))}
    </View>
  );
};

interface StatCardProps {
  stat: Stat;
  index: number;
  columns: number;
}

const StatCard: React.FC<StatCardProps> = ({ stat, index, columns }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const displayValue = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    opacity.value = withDelay(index * 100, withSpring(1));

    if (typeof stat.value === "number") {
      displayValue.value = withDelay(
        index * 100 + 200,
        withTiming(stat.value, {
          duration: 1000,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [stat.value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const color = stat.color || theme.colors.primary;
  const width = columns === 2 ? "48%" : columns === 3 ? "31%" : "23%";

  return (
    <Animated.View style={[animatedStyle, { width }]}>
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        style={[styles.card, { borderColor: `${color}30` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={stat.icon} size={20} color={color} />
        </View>

        <View style={styles.content}>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {typeof stat.value === "number"
                ? Math.round(stat.value)
                : stat.value}
              {stat.suffix && (
                <Text style={[styles.suffix, { color: theme.colors.textMuted }]}>
                  {stat.suffix}
                </Text>
              )}
            </Text>

            {stat.trend && (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      stat.trend === "up"
                        ? `${theme.colors.positive}20`
                        : stat.trend === "down"
                        ? `${theme.colors.negative}20`
                        : `${theme.colors.neutral}20`,
                  },
                ]}
              >
                <Ionicons
                  name={
                    stat.trend === "up"
                      ? "trending-up"
                      : stat.trend === "down"
                      ? "trending-down"
                      : "remove"
                  }
                  size={12}
                  color={
                    stat.trend === "up"
                      ? theme.colors.positive
                      : stat.trend === "down"
                      ? theme.colors.negative
                      : theme.colors.neutral
                  }
                />
                {stat.trendValue && (
                  <Text
                    style={[
                      styles.trendText,
                      {
                        color:
                          stat.trend === "up"
                            ? theme.colors.positive
                            : stat.trend === "down"
                            ? theme.colors.negative
                            : theme.colors.neutral,
                      },
                    ]}
                  >
                    {stat.trendValue}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {stat.label}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  content: {},
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  value: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
  },
  suffix: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  label: {
    fontSize: typography.fontSize.sm,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
