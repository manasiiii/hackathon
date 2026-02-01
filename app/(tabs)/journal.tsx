import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { format, isToday } from "date-fns";
import { useTheme } from "../../src/contexts/ThemeContext";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { JournalEntry } from "../../src/components/journal/JournalEntry";
import { typography, spacing } from "../../src/constants/theme";
import { api } from "../../src/api/client";
import { USER_ID } from "../../src/constants/user";

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

export default function JournalScreen() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState<ReturnType<typeof journalToEntry>[]>([]);

  const loadEntries = useCallback(async () => {
    try {
      const list = await api.journals.list(USER_ID, 100);
      setEntries(list.map(journalToEntry).sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      setEntries([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { title: string; data: typeof entries }[] = [];
    let currentGroup: typeof entries = [];
    let currentDate = "";

    entries.forEach((entry) => {
      const date = format(entry.createdAt, "yyyy-MM-dd");
      if (date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            title: formatGroupTitle(currentDate),
            data: currentGroup,
          });
        }
        currentDate = date;
        currentGroup = [entry];
      } else {
        currentGroup.push(entry);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        title: formatGroupTitle(currentDate),
        data: currentGroup,
      });
    }

    return groups;
  }, [entries]);

  const handleEntryPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/journal/[id]", params: { id } });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Journal
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {entries.length} entries
          </Text>
        </Animated.View>

        {/* Entries List */}
        <FlatList
          data={groupedEntries}
          keyExtractor={(item) => item.title}
          renderItem={({ item: group, index }) => (
            <Animated.View
              entering={FadeIn.delay(index * 100).duration(400)}
              style={styles.group}
            >
              <Text
                style={[styles.groupTitle, { color: theme.colors.textMuted }]}
              >
                {group.title}
              </Text>
              {group.data.map((entry) => (
                <JournalEntry
                  key={entry._id}
                  entry={entry}
                  onPress={() => handleEntryPress(entry._id)}
                />
              ))}
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="book-outline"
                size={64}
                color={theme.colors.textMuted}
              />
              <Text
                style={[styles.emptyTitle, { color: theme.colors.text }]}
              >
                No entries found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Start journaling to see your entries here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

function formatGroupTitle(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
