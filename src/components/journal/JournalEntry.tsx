import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { useTheme } from "../../contexts/ThemeContext";
import { GlassCard } from "../ui/GlassCard";
import {
  typography,
  borderRadius,
  sentimentColors,
  emotionConfig,
} from "../../constants/theme";

interface JournalEntryData {
  _id: string;
  content: string;
  title?: string;
  isVoiceEntry: boolean;
  sentiment: {
    score: number;
    label: string;
  };
  themes: string[];
  emotions: Array<{ name: string; intensity: number }>;
  createdAt: number;
  timeOfDay: string;
  wordCount: number;
  entryType: string;
  isLocked: boolean;
}

interface JournalEntryProps {
  entry: JournalEntryData;
  onPress: () => void;
}

export const JournalEntry: React.FC<JournalEntryProps> = ({ entry, onPress }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), "h:mm a");
  };

  const getSentimentColor = () => {
    return sentimentColors[entry.sentiment.label as keyof typeof sentimentColors] || theme.colors.textMuted;
  };

  const getEntryTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (entry.entryType) {
      case "voice_note":
        return "mic";
      case "gratitude":
        return "heart";
      case "quick_checkin":
        return "flash";
      case "guided":
        return "compass";
      default:
        return "document-text";
    }
  };

  const getPreview = () => {
    if (entry.isLocked) return "This entry is locked";
    const preview = entry.content.substring(0, 150);
    return preview.length < entry.content.length ? `${preview}...` : preview;
  };

  const topEmotion = entry.emotions[0];
  const emotionStyle = topEmotion
    ? emotionConfig[topEmotion.name.toLowerCase()]
    : null;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <GlassCard style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dateTime}>
              <View style={styles.timeRow}>
                <Ionicons
                  name={getEntryTypeIcon()}
                  size={14}
                  color={theme.colors.textMuted}
                />
                <Text style={[styles.time, { color: theme.colors.text }]}>
                  {formatTime(entry.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {entry.isLocked && (
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.textMuted}
                />
              )}
              {entry.isVoiceEntry && (
                <View
                  style={[
                    styles.voiceBadge,
                    { backgroundColor: theme.colors.surfaceHighlight },
                  ]}
                >
                  <Ionicons
                    name="mic"
                    size={12}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              {/* Sentiment indicator */}
              <View
                style={[
                  styles.sentimentDot,
                  { backgroundColor: getSentimentColor() },
                ]}
              />
            </View>
          </View>

          {/* Title if exists */}
          {entry.title && (
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {entry.title}
            </Text>
          )}

          {/* Content preview */}
          <Text
            style={[
              styles.preview,
              { color: theme.colors.textSecondary },
              entry.isLocked && styles.lockedPreview,
            ]}
            numberOfLines={3}
          >
            {getPreview()}
          </Text>

          {/* Footer with themes and emotions */}
          <View style={styles.footer}>
            {/* Top emotion */}
            {topEmotion && emotionStyle && (
              <View
                style={[
                  styles.emotionBadge,
                  { backgroundColor: `${emotionStyle.color}20` },
                ]}
              >
                <Ionicons
                  name={emotionStyle.icon as any}
                  size={12}
                  color={emotionStyle.color}
                />
                <Text
                  style={[styles.emotionText, { color: emotionStyle.color }]}
                >
                  {topEmotion.name}
                </Text>
              </View>
            )}

            {/* Themes */}
            {entry.themes.slice(0, 2).map((theme_tag) => (
              <View
                key={theme_tag}
                style={[
                  styles.themeBadge,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.themeText, { color: theme.colors.textMuted }]}
                >
                  #{theme_tag}
                </Text>
              </View>
            ))}

            {/* Word count */}
            <Text
              style={[styles.wordCount, { color: theme.colors.textMuted }]}
            >
              {entry.wordCount} words
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateTime: {},
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: typography.fontSize.xs,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 8,
  },
  preview: {
    fontSize: typography.fontSize.sm,
    lineHeight: 22,
    marginBottom: 12,
  },
  lockedPreview: {
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  emotionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  emotionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },
  themeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  themeText: {
    fontSize: typography.fontSize.xs,
  },
  wordCount: {
    fontSize: typography.fontSize.xs,
    marginLeft: "auto",
  },
});
