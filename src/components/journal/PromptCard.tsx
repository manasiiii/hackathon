import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { typography, borderRadius } from "../../constants/theme";

interface PromptCardProps {
  prompt: {
    text: string;
    category: string;
    basedOn?: {
      recentTheme?: string;
      recentEmotion?: string;
      healthContext?: string;
    };
  };
  onSelect: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onSelect,
  onRefresh,
  compact = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (prompt.category) {
      case "reflection":
        return "bulb";
      case "gratitude":
        return "heart";
      case "growth":
        return "trending-up";
      case "emotions":
        return "happy";
      case "relationships":
        return "people";
      case "goals":
        return "flag";
      case "creativity":
        return "color-palette";
      case "health":
        return "fitness";
      case "work":
        return "briefcase";
      case "contextual":
        return "sparkles";
      default:
        return "help-circle";
    }
  };

  const getCategoryColor = () => {
    switch (prompt.category) {
      case "reflection":
        return theme.colors.primary;
      case "gratitude":
        return theme.colors.accent;
      case "growth":
        return theme.colors.positive;
      case "emotions":
        return theme.colors.secondary;
      case "relationships":
        return "#EC4899";
      case "goals":
        return theme.colors.warning;
      case "creativity":
        return "#A78BFA";
      case "health":
        return "#34D399";
      case "work":
        return "#60A5FA";
      case "contextual":
        return theme.colors.primary;
      default:
        return theme.colors.textMuted;
    }
  };

  const categoryColor = getCategoryColor();

  const getContextLabel = () => {
    if (!prompt.basedOn) return null;
    if (prompt.basedOn.recentTheme)
      return `Based on your thoughts about ${prompt.basedOn.recentTheme}`;
    if (prompt.basedOn.recentEmotion)
      return `You've been feeling ${prompt.basedOn.recentEmotion}`;
    if (prompt.basedOn.healthContext === "low_mood")
      return "Crafted for reflection during difficult times";
    if (prompt.basedOn.healthContext === "high_mood")
      return "Celebrating your positive energy";
    return null;
  };

  const contextLabel = getContextLabel();

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={[`${categoryColor}20`, `${categoryColor}08`]}
          style={[
            styles.card,
            compact && styles.cardCompact,
            { borderColor: `${categoryColor}30` },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Category badge */}
          <View style={styles.header}>
            <View style={styles.categoryBadge}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${categoryColor}30` },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon()}
                  size={16}
                  color={categoryColor}
                />
              </View>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {prompt.category}
              </Text>
            </View>

            {onRefresh && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRefresh();
                }}
                style={styles.refreshButton}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* Context label */}
          {contextLabel && !compact && (
            <View style={styles.contextContainer}>
              <Ionicons
                name="sparkles"
                size={12}
                color={theme.colors.primary}
              />
              <Text style={[styles.contextText, { color: theme.colors.primary }]}>
                {contextLabel}
              </Text>
            </View>
          )}

          {/* Prompt text */}
          <Text
            style={[
              styles.promptText,
              compact && styles.promptTextCompact,
              { color: theme.colors.text },
            ]}
            numberOfLines={compact ? 2 : undefined}
          >
            {prompt.text}
          </Text>

          {/* Action hint */}
          <View style={styles.actionHint}>
            <Text style={[styles.actionText, { color: theme.colors.textMuted }]}>
              Tap to start writing
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={theme.colors.textMuted}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: 20,
    borderWidth: 1,
  },
  cardCompact: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },
  refreshButton: {
    padding: 4,
  },
  contextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },
  contextText: {
    fontSize: typography.fontSize.xs,
    fontStyle: "italic",
  },
  promptText: {
    fontSize: typography.fontSize.lg,
    lineHeight: 28,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 16,
  },
  promptTextCompact: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    marginBottom: 12,
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
  },
});
