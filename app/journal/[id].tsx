import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { useTheme } from "../../src/contexts/ThemeContext";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import {
  typography,
  spacing,
  borderRadius,
  sentimentColors,
  emotionConfig,
} from "../../src/constants/theme";
import { api } from "../../src/api/client";

function journalToEntry(j: {
  id: number;
  content: string;
  title?: string | null;
  sentiment: { score?: number; label?: string };
  themes: string[];
  emotions: { name?: string; intensity?: number }[];
  created_at: number;
  time_of_day: string;
  word_count: number;
  entry_type: string;
  is_voice_entry: boolean;
  is_locked: boolean;
}) {
  return {
    _id: String(j.id),
    content: j.content,
    title: j.title ?? undefined,
    sentiment: { score: j.sentiment?.score ?? 0, label: j.sentiment?.label ?? "neutral" },
    themes: j.themes || [],
    emotions: (j.emotions || []).map((e) => ({ name: e.name ?? "", intensity: e.intensity ?? 0.5 })),
    createdAt: j.created_at,
    timeOfDay: j.time_of_day,
    wordCount: j.word_count,
    entryType: j.entry_type,
    isVoiceEntry: j.is_voice_entry,
    isLocked: j.is_locked,
  };
}

export default function JournalDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [entry, setEntry] = useState<ReturnType<typeof journalToEntry> | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const loadEntry = useCallback(async () => {
    const numId = parseInt(id || "0", 10);
    if (!numId) return;
    try {
      const j = await api.journals.get(numId);
      setEntry(journalToEntry(j));
    } catch {
      setEntry(null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadEntry();
    }, [loadEntry])
  );

  React.useEffect(() => {
    if (entry) setEditedContent(entry.content);
  }, [entry]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(tabs)/journal");
  };

  const handleEdit = () => {
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In production, save to Convex
  };

  const getSentimentColor = () => {
    if (!entry) return theme.colors.textMuted;
    return sentimentColors[entry.sentiment.label as keyof typeof sentimentColors] || theme.colors.textMuted;
  };

  const getSentimentLabel = () => {
    if (!entry) return "Neutral";
    const labels: Record<string, string> = {
      very_positive: "Very Positive",
      positive: "Positive",
      neutral: "Neutral",
      negative: "Negative",
      very_negative: "Very Negative",
    };
    return labels[entry.sentiment.label] || "Neutral";
  };

  if (!entry) {
    return (
      <GradientBackground animated={false}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <Pressable
            onPress={handleBack}
            style={styles.headerButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: theme.colors.textMuted }}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground animated={false}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <Pressable
            onPress={handleBack}
            style={styles.headerButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>

          <View style={styles.headerActions}>
            {isEditing ? (
              <Pressable onPress={handleSave} style={styles.headerButton}>
                <Text style={[styles.saveText, { color: theme.colors.primary }]}>
                  Save
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={handleEdit} style={styles.headerButton}>
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </Pressable>
                <Pressable style={styles.headerButton}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={24}
                    color={theme.colors.text}
                  />
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Date and Time */}
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <View style={styles.dateContainer}>
              <Text style={[styles.date, { color: theme.colors.text }]}>
                {format(entry.createdAt, "EEEE, MMMM d, yyyy")}
              </Text>
              <Text style={[styles.time, { color: theme.colors.textMuted }]}>
                {format(entry.createdAt, "h:mm a")} · {entry.timeOfDay}
              </Text>
            </View>
          </Animated.View>

          {/* Title */}
          {entry.title && (
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {entry.title}
              </Text>
            </Animated.View>
          )}

          {/* Content */}
          <Animated.View entering={FadeIn.delay(300).duration(400)}>
            {isEditing ? (
              <TextInput
                style={[styles.contentInput, { color: theme.colors.text }]}
                value={editedContent}
                onChangeText={setEditedContent}
                multiline
                autoFocus
              />
            ) : (
              <Text style={[styles.contentText, { color: theme.colors.text }]}>
                {entry.content}
              </Text>
            )}
          </Animated.View>

          {/* Analysis Section */}
          {!isEditing && (
            <>
              {/* Sentiment */}
              <Animated.View
                entering={FadeIn.delay(400).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
                >
                  SENTIMENT
                </Text>
                <GlassCard padding="md">
                  <View style={styles.sentimentRow}>
                    <View
                      style={[
                        styles.sentimentIndicator,
                        { backgroundColor: getSentimentColor() },
                      ]}
                    />
                    <View>
                      <Text
                        style={[
                          styles.sentimentLabel,
                          { color: getSentimentColor() },
                        ]}
                      >
                        {getSentimentLabel()}
                      </Text>
                      <Text
                        style={[
                          styles.sentimentScore,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Score: {entry.sentiment.score.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>

              {/* Emotions */}
              <Animated.View
                entering={FadeIn.delay(500).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
                >
                  EMOTIONS
                </Text>
                <View style={styles.emotionsGrid}>
                  {entry.emotions.map((emotion) => {
                    const config =
                      emotionConfig[emotion.name.toLowerCase()] || {
                        icon: "ellipse",
                        color: theme.colors.primary,
                      };
                    return (
                      <View
                        key={emotion.name}
                        style={[
                          styles.emotionChip,
                          { backgroundColor: `${config.color}20` },
                        ]}
                      >
                        <Ionicons
                          name={config.icon as any}
                          size={16}
                          color={config.color}
                        />
                        <Text
                          style={[styles.emotionText, { color: config.color }]}
                        >
                          {emotion.name}
                        </Text>
                        <View
                          style={[
                            styles.intensityBar,
                            { backgroundColor: `${config.color}30` },
                          ]}
                        >
                          <View
                            style={[
                              styles.intensityFill,
                              {
                                width: `${emotion.intensity * 100}%`,
                                backgroundColor: config.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Themes */}
              <Animated.View
                entering={FadeIn.delay(600).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
                >
                  THEMES
                </Text>
                <View style={styles.themesContainer}>
                  {entry.themes.map((themeTag) => (
                    <View
                      key={themeTag}
                      style={[
                        styles.themeChip,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.themeText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        #{themeTag}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Stats */}
              <Animated.View
                entering={FadeIn.delay(700).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
                >
                  DETAILS
                </Text>
                <GlassCard padding="md">
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="text"
                        size={20}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={[styles.statValue, { color: theme.colors.text }]}
                      >
                        {entry.wordCount}
                      </Text>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        words
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name={entry.isVoiceEntry ? "mic" : "create"}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={[styles.statValue, { color: theme.colors.text }]}
                      >
                        {entry.isVoiceEntry ? "Voice" : "Written"}
                      </Text>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        entry
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="time"
                        size={20}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={[styles.statValue, { color: theme.colors.text }]}
                      >
                        {entry.timeOfDay}
                      </Text>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        time
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  saveText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  dateContainer: {
    marginBottom: spacing.lg,
  },
  date: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  time: {
    fontSize: typography.fontSize.sm,
    marginTop: 4,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  contentText: {
    fontSize: typography.fontSize.lg,
    lineHeight: 32,
    marginBottom: spacing.xl,
  },
  contentInput: {
    fontSize: typography.fontSize.lg,
    lineHeight: 32,
    marginBottom: spacing.xl,
    minHeight: 200,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sentimentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sentimentIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
  },
  sentimentLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  sentimentScore: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  emotionsGrid: {
    gap: spacing.sm,
  },
  emotionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emotionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
    flex: 1,
  },
  intensityBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  intensityFill: {
    height: "100%",
    borderRadius: 2,
  },
  themesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  themeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  themeText: {
    fontSize: typography.fontSize.sm,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textTransform: "capitalize",
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
  },
});
