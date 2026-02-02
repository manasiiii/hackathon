import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/contexts/ThemeContext";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import { EmotionBank } from "../../src/components/dashboard/EmotionBank";
import { HealthCorrelations } from "../../src/components/dashboard/HealthCorrelations";
import { StatsGrid } from "../../src/components/dashboard/StatsGrid";
import { KnowYourselfBetterCard } from "../../src/components/dashboard/KnowYourselfBetterCard";
import { typography, spacing, borderRadius } from "../../src/constants/theme";
import { useFocusEffect } from "expo-router";
import { api } from "../../src/api/client";
import { USER_ID } from "../../src/constants/user";

export default function InsightsScreen() {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<{
    total_entries: number;
    total_words: number;
    top_themes: Array<{ theme: string; count: number }>;
    top_emotions: Array<{ name: string; count: number; avg_intensity: number }>;
  } | null>(null);
  const [correlations, setCorrelations] = useState<Array<{ factor: string; correlation: "positive" | "negative" | "neutral"; strength: number; insight: string }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [streak, setStreak] = useState(0);
  const [reflectSummary, setReflectSummary] = useState<string | null>(null);
  const [reflectInsights, setReflectInsights] = useState<string[]>([]);
  const [reflectPeriod, setReflectPeriod] = useState<string | null>(null);
  const [reflectGenerating, setReflectGenerating] = useState(false);

  const loadReflect = useCallback(async () => {
    try {
      const existing = await api.insights.getWeekly(USER_ID).catch(() => null);
      if (existing?.summary) {
        setReflectSummary(existing.summary);
        setReflectPeriod(
          existing.period_start && existing.period_end
            ? `${existing.period_start} – ${existing.period_end}`
            : null
        );
        const insightsList = Array.isArray(existing.suggestions)
          ? (existing.suggestions as string[])
          : [];
        setReflectInsights(insightsList);
      } else {
        setReflectSummary(null);
        setReflectInsights([]);
        setReflectPeriod(null);
      }
    } catch {
      setReflectSummary(null);
      setReflectInsights([]);
      setReflectPeriod(null);
    }
  }, []);

  const handleGenerateReflect = useCallback(async () => {
    setReflectGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await api.insights.generateWeekly(USER_ID) as {
        primary_pattern?: string;
        insights?: string[];
        start_date?: string;
        end_date?: string;
      };
      setReflectSummary(result.primary_pattern ?? null);
      setReflectInsights(result.insights ?? []);
      setReflectPeriod(
        result.start_date && result.end_date
          ? `${result.start_date} – ${result.end_date}`
          : null
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert(
        "Could not generate reflection",
        "Set OPENAI_API_KEY on the backend for AI-generated summaries. " + msg
      );
    } finally {
      setReflectGenerating(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const days = 7; // This Week
      const [analyticsRes, correlationsRes, userRes] = await Promise.all([
        api.journals.getAnalytics(USER_ID, days),
        api.health.getCorrelations(USER_ID, days),
        api.users.get(USER_ID).catch(() => null),
      ]);
      if (userRes) setStreak(userRes.journaling_streak ?? 0);
      setAnalytics(analyticsRes);
      setCorrelations(correlationsRes.correlations || []);
    } catch (e) {
      setAnalytics(null);
      setCorrelations([]);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setLoadError(msg.includes("fetch") || msg.includes("Network") ? "Can't reach backend. Check EXPO_PUBLIC_API_URL and that the server is running." : msg);
    }
  }, [loadReflect]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadReflect();
    }, [loadData, loadReflect])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [loadData]);

  const handleLoadDemoData = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setRefreshing(true);
      setLoadError(null);
      await api.seed.run();
      await loadData();
      Alert.alert("Done", "Demo data loaded.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert(
        "Could not load demo data",
        "Is the backend running? (uvicorn main:app --reload --host 0.0.0.0 --port 8000)\n\nOn physical device, set EXPO_PUBLIC_API_URL to your computer's IP (e.g. http://192.168.1.5:8000)\n\n" + msg
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const emotions = (analytics?.top_emotions || []).map((e) => ({
    name: e.name,
    count: e.count,
    avgIntensity: e.avg_intensity,
  }));

  const stats = [
    { label: "Entries", value: analytics?.total_entries ?? 0, icon: "book" as const, color: theme.colors.primary },
    { label: "Streak", value: streak, icon: "flame" as const, color: "#FB923C", suffix: " days" },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Insights
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              This Week
            </Text>
          </Animated.View>

          {loadError && (
            <View style={[styles.errorBanner, { backgroundColor: `${theme.colors.error}15`, borderColor: theme.colors.error }]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{loadError}</Text>
            </View>
          )}

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <StatsGrid stats={stats} columns={2} />
          </Animated.View>

          {/* Reflect – weekly insight */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(600)}
            style={styles.section}
          >
            <GlassCard style={styles.reflectCard} variant="default" padding="md">
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Reflect
              </Text>
              {reflectSummary ? (
                <>
                  {reflectPeriod && (
                    <Text style={[styles.reflectPeriod, { color: theme.colors.textMuted }]}>
                      {reflectPeriod}
                    </Text>
                  )}
                  <Text style={[styles.reflectSummary, { color: theme.colors.text }]}>
                    {reflectSummary}
                  </Text>
                  {reflectInsights.length > 0 && (
                    <View style={styles.reflectInsights}>
                      {reflectInsights.map((insight, i) => (
                        <Text
                          key={i}
                          style={[styles.reflectInsightItem, { color: theme.colors.textSecondary }]}
                        >
                          • {insight}
                        </Text>
                      ))}
                    </View>
                  )}
                  <Pressable
                    onPress={handleGenerateReflect}
                    disabled={reflectGenerating}
                    style={[
                      styles.generateReflectButton,
                      { borderColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons name="refresh" size={18} color={theme.colors.primary} />
                    <Text style={[styles.generateReflectText, { color: theme.colors.primary }]}>
                      {reflectGenerating ? "Generating…" : "Regenerate"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.reflectEmpty}>
                  <Text style={[styles.reflectEmptyText, { color: theme.colors.textMuted }]}>
                    Get a weekly reflection based on your journal and health patterns.
                  </Text>
                  <Pressable
                    onPress={handleGenerateReflect}
                    disabled={reflectGenerating}
                    style={[
                      styles.generateReflectButton,
                      { borderColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                    <Text style={[styles.generateReflectText, { color: theme.colors.primary }]}>
                      {reflectGenerating ? "Generating…" : "Generate reflection"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Health vs Emotions graph */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <KnowYourselfBetterCard userId={USER_ID} />
          </Animated.View>

          {/* Emotion Bank */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(600)}
            style={styles.section}
          >
            <EmotionBank
              emotions={emotions}
              themes={analytics?.top_themes || []}
              title="Emotion Bank"
            />
          </Animated.View>

          {/* Health Correlations */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(600)}
            style={styles.section}
          >
            <HealthCorrelations
              correlations={correlations}
              title="Health & Mood Connections"
              onLoadDemoData={handleLoadDemoData}
            />
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    marginTop: 4,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  errorBanner: {
    flexDirection: "column",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 4,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  errorHint: {
    fontSize: typography.fontSize.xs,
  },
  reflectCard: {
    padding: spacing.lg,
  },
  reflectSummary: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  reflectInsights: {
    marginBottom: spacing.md,
    gap: 4,
  },
  reflectInsightItem: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: 2,
  },
  reflectPeriod: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.md,
  },
  reflectEmpty: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  reflectEmptyText: {
    fontSize: typography.fontSize.base,
    textAlign: "center",
  },
  generateReflectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  generateReflectText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
