/**
 * Emotion Bank - Combined emotions + themes from journal entries.
 * Replaces separate Emotional Landscape and Top Themes.
 */

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
import { typography, borderRadius, emotionConfig } from "../../constants/theme";

interface EmotionItem {
  name: string;
  count: number;
  avgIntensity: number;
}

interface ThemeItem {
  theme: string;
  count: number;
}

interface EmotionBankProps {
  emotions: EmotionItem[];
  themes: ThemeItem[];
  title?: string;
  onLoadDemoData?: () => void;
}

export const EmotionBank: React.FC<EmotionBankProps> = ({
  emotions,
  themes,
  title = "Emotion Bank",
  onLoadDemoData,
}) => {
  const { theme } = useTheme();
  const hasData = emotions.length > 0 || themes.length > 0;

  if (!hasData) {
    return (
      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="heart-outline"
            size={40}
            color={theme.colors.textMuted}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            Journal to build your emotion bank — emotions and themes from your entries appear here
          </Text>
          {onLoadDemoData && (
            <Pressable
              onPress={onLoadDemoData}
              style={[styles.demoButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.demoButtonText}>Load demo data</Text>
            </Pressable>
          )}
        </View>
      </GlassCard>
    );
  }

  const maxCount = Math.max(
    ...emotions.map((e) => e.count),
    ...themes.map((t) => t.count),
    1
  );

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>

      {/* Emotions */}
      {emotions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
            Top emotions
          </Text>
          <View style={styles.emotionRow}>
            {emotions.slice(0, 8).map((emotion, index) => (
              <EmotionChip
                key={emotion.name}
                emotion={emotion}
                maxCount={maxCount}
                index={index}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <View style={[styles.section, !emotions.length && styles.sectionFirst]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
            Top themes
          </Text>
          <View style={styles.themeRow}>
            {themes.slice(0, 8).map((item, index) => (
              <ThemeChip
                key={item.theme}
                themeName={item.theme}
                count={item.count}
                maxCount={maxCount}
                index={index}
                themeColors={theme}
              />
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
};

interface EmotionChipProps {
  emotion: EmotionItem;
  maxCount: number;
  index: number;
  theme: { colors: Record<string, string> };
}

const EmotionChip: React.FC<EmotionChipProps> = ({
  emotion,
  maxCount,
  index,
  theme,
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withDelay(index * 60, withSpring(1, { damping: 14, stiffness: 180 }));
    opacity.value = withDelay(index * 60, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const config = emotionConfig[emotion.name.toLowerCase()] || {
    icon: "ellipse",
    color: theme.colors.primary,
  };
  const sizeRatio = 0.6 + (emotion.count / maxCount) * 0.4;
  const chipSize = 44 * sizeRatio;

  return (
    <Animated.View style={[animatedStyle, styles.chipWrap]}>
      <View
        style={[
          styles.emotionChip,
          {
            width: chipSize,
            height: chipSize,
            backgroundColor: `${config.color}25`,
            borderColor: `${config.color}50`,
          },
        ]}
      >
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text
          style={[styles.emotionName, { color: config.color }]}
          numberOfLines={1}
        >
          {emotion.name}
        </Text>
        <Text style={[styles.emotionCount, { color: theme.colors.textMuted }]}>
          {emotion.count}
        </Text>
      </View>
    </Animated.View>
  );
};

interface ThemeChipProps {
  themeName: string;
  count: number;
  maxCount: number;
  index: number;
  themeColors: { colors: Record<string, string> };
}

const ThemeChip: React.FC<ThemeChipProps> = ({
  themeName,
  count,
  maxCount,
  index,
  themeColors,
}) => {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withDelay(index * 50, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const widthPct = 50 + (count / maxCount) * 50;

  return (
    <Animated.View style={[animatedStyle, styles.themeChipWrap]}>
      <View style={[styles.themeChip, { backgroundColor: themeColors.colors.surface }]}>
        <Text
          style={[styles.themeName, { color: themeColors.colors.text }]}
          numberOfLines={1}
        >
          #{themeName}
        </Text>
        <View
          style={[
            styles.themeBar,
            { backgroundColor: `${themeColors.colors.border}40` },
          ]}
        >
          <View
            style={[
              styles.themeBarFill,
              {
                width: `${widthPct}%`,
                backgroundColor: themeColors.colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.themeCount, { color: themeColors.colors.textMuted }]}>
          {count}
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
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
  section: {
    marginTop: 16,
  },
  sectionFirst: {
    marginTop: 0,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emotionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipWrap: {
    marginBottom: 4,
  },
  emotionChip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  emotionName: {
    fontSize: 10,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },
  emotionCount: {
    fontSize: 9,
    marginTop: 1,
  },
  themeRow: {
    gap: 8,
  },
  themeChipWrap: {
    marginBottom: 4,
  },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    gap: 10,
  },
  themeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    width: 70,
  },
  themeBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  themeBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  themeCount: {
    fontSize: typography.fontSize.xs,
    width: 24,
    textAlign: "right",
  },
});
