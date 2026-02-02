import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useUser } from "../../src/contexts/UserContext";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { Button } from "../../src/components/ui/Button";
import { StreakDisplay } from "../../src/components/dashboard/StreakDisplay";
import { KnowYourselfBetterCard } from "../../src/components/dashboard/KnowYourselfBetterCard";
import { PromptCard } from "../../src/components/journal/PromptCard";
import { typography, spacing, borderRadius } from "../../src/constants/theme";
import { api } from "../../src/api/client";
import { USER_ID } from "../../src/constants/user";

export default function HomeScreen() {
  const { theme } = useTheme();
  const { userName } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({ journalingStreak: 0, totalEntries: 0, longestStreak: 0 });
  const [question, setQuestion] = useState<string>("What's on your mind today?");

  const loadData = useCallback(async () => {
    try {
      const [userRes, questionRes] = await Promise.all([
        api.users.get(USER_ID).catch(() => null),
        api.journals.getQuestion(USER_ID, 3).catch(() => ({ question: "What's on your mind today?" })),
      ]);
      if (questionRes?.question) setQuestion(questionRes.question);
      if (userRes) {
        setUserStats({
          journalingStreak: userRes.journaling_streak ?? 0,
          totalEntries: userRes.total_entries ?? 0,
          longestStreak: userRes.longest_streak ?? 0,
        });
      }
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [loadData]);

  const handleVoiceSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/voice-session", params: { prompt: question } });
  };

  const handleVoiceEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/voice-session", params: { recordOnly: "true" } });
  };

  const handleReflectionWrite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(tabs)/compose", params: { prompt: question } });
  };

  const handleWriteEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(tabs)/compose" });
  };

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
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {userName || "Inner Circle"} ✨
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/settings")}
                style={[styles.avatarButton, { backgroundColor: theme.colors.surface }]}
              >
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </Animated.View>

          {/* 1. Voice */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
            <Pressable onPress={handleVoiceSession}>
              <LinearGradient
                colors={theme.gradients.accent as [string, string]}
                style={[styles.voiceCard, { shadowOpacity: 0.08 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.voiceContent}>
                  <View style={[styles.voiceIcon, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                    <Ionicons name="mic" size={28} color="#fff" />
                  </View>
                  <View style={styles.voiceText}>
                    <Text style={styles.voiceTitle}>Voice Journal</Text>
                    <Text style={styles.voiceSubtitle}>
                      Talk to your AI companion
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                </View>
                
                {/* Animated waves */}
                <View style={styles.waveContainer}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.wave,
                        {
                          height: 8 + Math.random() * 20,
                          opacity: 0.3 + Math.random() * 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
            <Button
              title="Voice Entry"
              onPress={handleVoiceEntry}
              icon="mic"
              variant="secondary"
              style={styles.writeButton}
            />
          </Animated.View>

          {/* 2. Reflection – tap to write */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Today's Question
            </Text>
            <PromptCard
              prompt={{ text: question, category: "reflection" }}
              onSelect={handleReflectionWrite}
              onRefresh={() => loadData()}
            />
            <Button
              title="Write Entry"
              onPress={handleWriteEntry}
              icon="create"
              variant="secondary"
              style={styles.writeButton}
            />
          </Animated.View>

          {/* 3. Stats */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
            <StreakDisplay
              streak={userStats.journalingStreak}
              longestStreak={userStats.longestStreak}
              totalEntries={userStats.totalEntries}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(600)} style={styles.section}>
            <KnowYourselfBetterCard userId={USER_ID} />
          </Animated.View>

          {/* Bottom spacing for tab bar */}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  name: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginTop: 4,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: "hidden",
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  voiceContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  voiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  voiceText: {
    flex: 1,
  },
  voiceTitle: {
    color: "#fff",
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  voiceSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  waveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 40,
    paddingHorizontal: spacing.lg,
  },
  wave: {
    width: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
    marginTop: 0,
  },
  writeButton: {
    marginTop: spacing.md,
    width: "100%",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
