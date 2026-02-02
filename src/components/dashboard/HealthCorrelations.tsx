import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";
import { GlassCard } from "../ui/GlassCard";
import { typography, borderRadius } from "../../constants/theme";

interface Correlation {
  factor: string;
  correlation: "positive" | "negative" | "neutral";
  strength: number;
  insight: string;
}

interface HealthCorrelationsProps {
  correlations: Correlation[];
  title?: string;
  onLoadDemoData?: () => void;
}

export const HealthCorrelations: React.FC<HealthCorrelationsProps> = ({
  correlations,
  title = "Health & Mood Connections",
  onLoadDemoData,
}) => {
  const { theme } = useTheme();

  if (correlations.length === 0) {
    return (
      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="fitness-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Connect health data to discover patterns between your physical wellness and mood
          </Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>

      <View style={styles.correlationsList}>
        {correlations.map((correlation, index) => (
          <CorrelationItem
            key={correlation.factor}
            correlation={correlation}
            index={index}
            theme={theme}
          />
        ))}
      </View>
    </GlassCard>
  );
};

interface CorrelationItemProps {
  correlation: Correlation;
  index: number;
  theme: any;
}

const CorrelationItem: React.FC<CorrelationItemProps> = ({
  correlation,
  index,
  theme,
}) => {
  const translateX = useSharedValue(-20);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withDelay(index * 150, withSpring(0));
    opacity.value = withDelay(index * 150, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const getCorrelationColor = () => {
    switch (correlation.correlation) {
      case "positive":
        return theme.colors.positive;
      case "negative":
        return theme.colors.negative;
      default:
        return theme.colors.neutral;
    }
  };

  const getCorrelationIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (correlation.correlation) {
      case "positive":
        return "arrow-up-circle";
      case "negative":
        return "arrow-down-circle";
      default:
        return "remove-circle";
    }
  };

  const getFactorIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (correlation.factor.toLowerCase()) {
      case "sleep quality":
      case "sleep":
        return "moon";
      case "physical activity":
      case "activity":
        return "fitness";
      case "heart rate variability":
      case "hrv":
        return "heart";
      case "meditation":
      case "mindfulness":
        return "leaf";
      default:
        return "analytics";
    }
  };

  const color = getCorrelationColor();

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[
          styles.correlationItem,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.correlationHeader}>
          <View
            style={[styles.factorIcon, { backgroundColor: `${color}20` }]}
          >
            <Ionicons name={getFactorIcon()} size={20} color={color} />
          </View>
          <View style={styles.correlationInfo}>
            <Text style={[styles.factorName, { color: theme.colors.text }]}>
              {correlation.factor}
            </Text>
            <View style={styles.strengthRow}>
              <Ionicons
                name={getCorrelationIcon()}
                size={16}
                color={color}
              />
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${correlation.strength * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.correlationType,
                  { color: color },
                ]}
              >
                {correlation.correlation}
              </Text>
            </View>
          </View>
        </View>
        <Text
          style={[styles.insight, { color: theme.colors.textSecondary }]}
        >
          {correlation.insight}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 16,
  },
  correlationsList: {
    gap: 12,
  },
  correlationItem: {
    borderRadius: borderRadius.md,
    padding: 16,
  },
  correlationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  factorIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  correlationInfo: {
    flex: 1,
  },
  factorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 4,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  correlationType: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },
  insight: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  demoButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    alignSelf: "center",
  },
  demoButtonText: {
    color: "#fff",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
