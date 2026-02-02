import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/contexts/ThemeContext";
import { scheduleLocalNotifications } from "../../src/services/scheduleNotifications";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import { Button } from "../../src/components/ui/Button";
import { themes, ThemeName, typography, spacing, borderRadius } from "../../src/constants/theme";
import { api } from "../../src/api/client";
import { useVoiceSettings, type VoiceTone } from "../../src/contexts/VoiceSettingsContext";
import { API_URL } from "../../src/api/config";
import { USER_ID } from "../../src/constants/user";

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

export default function SettingsScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const { settings: voiceSettings, updateSettings: updateVoiceSettings, setTone } = useVoiceSettings();

  const [notifications, setNotifications] = useState(true);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [weeklyInsights, setWeeklyInsights] = useState(true);
  const [healthSync, setHealthSync] = useState(false);
  const [whoopSync, setWhoopSync] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
  ]);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [conversationMode, setConversationMode] = useState<"voice" | "text">("voice");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Load existing schedule on mount
  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const response = await fetch(`${API_URL}/api/schedule?user_id=${USER_ID}`);
      if (response.ok) {
        const schedules = await response.json();
        if (schedules.length > 0) {
          const schedule = schedules[0];
          setScheduleId(schedule.id);
          const [hour, minute] = schedule.time.split(":").map(Number);
          setSelectedHour(hour);
          setSelectedMinute(minute);
          setSelectedDays(schedule.days_of_week);
          setScheduleEnabled(schedule.is_enabled);
          setConversationMode(schedule.conversation_mode || "voice");
          setReminderTime(schedule.time);
          // Sync local notifications with saved schedule
          await scheduleLocalNotifications(
            schedule.time,
            schedule.days_of_week,
            schedule.is_enabled,
            schedule.conversation_mode || "voice"
          );
        }
      }
    } catch {
      // Backend unreachable - use defaults silently
    }
  };

  const saveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const time = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;

      if (scheduleId) {
        // Update existing schedule
        const response = await fetch(`${API_URL}/api/schedule/${scheduleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            time,
            days_of_week: selectedDays,
            is_enabled: scheduleEnabled,
            conversation_mode: conversationMode,
          }),
        });
        if (response.ok) {
          setReminderTime(time);
          setShowScheduleModal(false);
          const { ok, error } = await scheduleLocalNotifications(
            time,
            selectedDays,
            scheduleEnabled,
            conversationMode
          );
          if (!ok) {
            Alert.alert(
              "Schedule saved, but notification failed",
              error || "Allow notifications in device settings and try again."
            );
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Error", "Failed to save schedule. Please try again.");
        }
      } else {
        // Create new schedule
        const response = await fetch(`${API_URL}/api/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: USER_ID,
            time,
            days_of_week: selectedDays,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            conversation_mode: conversationMode,
          }),
        });
        if (response.ok) {
          const newSchedule = await response.json();
          setScheduleId(newSchedule.id);
          setReminderTime(time);
          setShowScheduleModal(false);
          const { ok, error } = await scheduleLocalNotifications(
            time,
            selectedDays,
            scheduleEnabled,
            conversationMode
          );
          if (!ok) {
            Alert.alert(
              "Schedule saved, but notification failed",
              error || "Allow notifications in device settings and try again."
            );
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Error", "Failed to save schedule. Please try again.");
        }
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError && (error as Error).message === "Network request failed";
      Alert.alert(
        "Connection Error",
        isNetworkError
          ? "Could not reach the server. Make sure the backend is running (cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000) and that you're using a development build (npx expo run:ios) for iOS."
          : "Failed to save schedule. Please try again."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const handleThemeChange = (name: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(name);
  };

  const SettingRow: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    onPress?: () => void;
    rightContent?: React.ReactNode;
    iconColor?: string;
  }> = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    onPress,
    rightContent,
    iconColor,
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { backgroundColor: theme.colors.surface }]}
      disabled={!onPress && !onValueChange}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${iconColor || theme.colors.primary}20` },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor || theme.colors.primary}
        />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: theme.colors.textMuted }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightContent}
      {onValueChange !== undefined && (
        <Switch
          value={value}
          onValueChange={(newValue) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onValueChange(newValue);
          }}
          trackColor={{
            false: theme.colors.surface,
            true: theme.colors.primary,
          }}
          thumbColor="#fff"
        />
      )}
      {onPress && !rightContent && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textMuted}
        />
      )}
    </Pressable>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Settings
            </Text>
          </Animated.View>

          {/* Account Section */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              ACCOUNT
            </Text>
            <GlassCard padding="none">
              <SettingRow
                icon="person-circle"
                title="Profile"
                subtitle="Anonymous user"
                onPress={() => {
                  Alert.alert(
                    "Link Account",
                    "Would you like to link an email to backup your data?",
                    [
                      { text: "Not Now", style: "cancel" },
                      { text: "Link Email", onPress: () => {} },
                    ]
                  );
                }}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="cloud-upload"
                title="Backup & Sync"
                subtitle="Keep your data safe"
                onPress={() => {}}
              />
            </GlassCard>
          </Animated.View>

          {/* Appearance Section */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              APPEARANCE
            </Text>
            <GlassCard>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Theme
              </Text>
              <View style={styles.themeGrid}>
                {(Object.keys(themes) as ThemeName[]).map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => handleThemeChange(name)}
                    style={[
                      styles.themeOption,
                      {
                        borderColor:
                          themeName === name
                            ? theme.colors.primary
                            : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.themePreview}>
                      {themes[name].gradients.background.map((color, i) => (
                        <View
                          key={i}
                          style={[
                            styles.themeColor,
                            { backgroundColor: color },
                          ]}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.themeName,
                        {
                          color:
                            themeName === name
                              ? theme.colors.primary
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {themes[name].name}
                    </Text>
                    {themeName === name && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={theme.colors.primary}
                        style={styles.themeCheck}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Notifications Section */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              NOTIFICATIONS
            </Text>
            <GlassCard padding="none">
              <SettingRow
                icon="notifications"
                title="Daily Reminders"
                subtitle="Get reminded to journal"
                value={notifications}
                onValueChange={setNotifications}
                iconColor={theme.colors.secondary}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="time"
                title="Scheduled Conversation"
                subtitle={`${reminderTime} · ${selectedDays.length} days`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowScheduleModal(true);
                }}
                iconColor={theme.colors.secondary}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="analytics"
                title="Weekly Insights"
                subtitle="Receive weekly summaries"
                value={weeklyInsights}
                onValueChange={setWeeklyInsights}
                iconColor={theme.colors.secondary}
              />
            </GlassCard>
          </Animated.View>

          {/* Voice & Experience Section */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              EXPERIENCE
            </Text>
            <GlassCard padding="none">
              <View style={[styles.voiceSettingsContainer, { padding: spacing.md }]}>
                <Text style={[styles.voiceSettingsLabel, { color: theme.colors.text }]}>
                  Voice tone
                </Text>
                <View style={styles.toneButtons}>
                  {(["warmer", "neutral", "clear"] as VoiceTone[]).map((tone) => (
                    <Pressable
                      key={tone}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTone(tone);
                      }}
                      style={[
                        styles.toneButton,
                        {
                          backgroundColor: voiceSettings.tone === tone
                            ? theme.colors.primary
                            : theme.colors.surfaceHighlight,
                          borderColor: voiceSettings.tone === tone
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.toneButtonText,
                          {
                            color: voiceSettings.tone === tone ? "#fff" : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.voiceSettingsHint, { color: theme.colors.textMuted }]}>
                  Warmer: slower, softer · Neutral: balanced · Clear: higher, clearer
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="volume-high"
                title="Auto-speak responses"
                subtitle="AI reads responses aloud automatically"
                value={voiceSettings.autoSpeakResponses}
                onValueChange={(v) => updateVoiceSettings({ autoSpeakResponses: v })}
                iconColor={theme.colors.accent}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="stop-circle"
                title="Stop speaking button"
                subtitle="Show button to pause AI speech anytime"
                value={voiceSettings.showStopSpeakingButton}
                onValueChange={(v) => updateVoiceSettings({ showStopSpeakingButton: v })}
                iconColor={theme.colors.accent}
              />
            </GlassCard>
          </Animated.View>

          {/* Health Integrations Section */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              HEALTH INTEGRATIONS
            </Text>
            <GlassCard padding="none">
              <SettingRow
                icon="heart"
                title="Apple Health"
                subtitle={healthSync ? "Connected" : "Connect to see health insights"}
                value={healthSync}
                onValueChange={(value) => {
                  setHealthSync(value);
                  if (value) {
                    Alert.alert(
                      "Apple Health",
                      "This would request HealthKit permissions in production."
                    );
                  }
                }}
                iconColor={theme.colors.positive}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="fitness"
                title="WHOOP"
                subtitle={whoopSync ? "Connected" : "Connect for recovery data"}
                value={whoopSync}
                onValueChange={(value) => {
                  setWhoopSync(value);
                  if (value) {
                    Alert.alert(
                      "WHOOP Integration",
                      "Using synthetic data for demo. Real integration coming soon!"
                    );
                  }
                }}
                iconColor="#1DB954"
              />
            </GlassCard>
          </Animated.View>

          {/* Seed Demo Data */}
          <Animated.View
            entering={FadeInDown.delay(550).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              DEMO DATA
            </Text>
            <GlassCard padding="none">
              <SettingRow
                icon="refresh"
                title="Reset & Seed Demo Data"
                subtitle="Clear DB and add 15 days of sample data"
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsSeeding(true);
                  try {
                    await api.seed.run();
                    Alert.alert("Done", "Database seeded with 15 days of demo data. Refresh the app to see it.");
                  } catch (e) {
                    Alert.alert("Error", "Could not seed. Is the backend running?");
                  } finally {
                    setIsSeeding(false);
                  }
                }}
                iconColor={theme.colors.primary}
              />
            </GlassCard>
          </Animated.View>

          {/* Privacy Section */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              PRIVACY & DATA
            </Text>
            <GlassCard padding="none">
              <SettingRow
                icon="shield-checkmark"
                title="Privacy Policy"
                onPress={() => {}}
                iconColor={theme.colors.info}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="download"
                title="Export Data"
                subtitle="Download all your entries"
                onPress={() => {}}
                iconColor={theme.colors.info}
              />
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <SettingRow
                icon="trash"
                title="Delete All Data"
                subtitle="Permanently remove everything"
                onPress={() => {
                  Alert.alert(
                    "Delete All Data",
                    "This will permanently delete all your journal entries and data. This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {},
                      },
                    ]
                  );
                }}
                iconColor={theme.colors.error}
              />
            </GlassCard>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.delay(700).duration(600)}
            style={styles.footer}
          >
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              Inner Circle - Your private journaling companion
            </Text>
            <Text style={[styles.footerSubtext, { color: theme.colors.textMuted }]}>
              Made with ❤️ for mental wellness
            </Text>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Schedule Time Picker Modal */}
        <Modal
          visible={showScheduleModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.gradients.background[0] }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Scheduled Conversation
                </Text>
                <TouchableOpacity
                  onPress={() => setShowScheduleModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
                Set when Inner Circle should check in with you
              </Text>

              {/* Time Picker */}
              <View style={styles.timePickerContainer}>
                <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Time</Text>
                <View style={styles.timePicker}>
                  {/* Hour Picker */}
                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setSelectedHour((h) => (h + 1) % 24)}
                      style={[styles.pickerButton, styles.modalControl, { borderColor: theme.colors.border }]}
                    >
                      <Ionicons name="chevron-up" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.pickerValue, styles.modalControl, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.pickerValueText, { color: theme.colors.text }]}>
                        {selectedHour.toString().padStart(2, "0")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedHour((h) => (h - 1 + 24) % 24)}
                      style={[styles.pickerButton, styles.modalControl, { borderColor: theme.colors.border }]}
                    >
                      <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.pickerSeparator, { color: theme.colors.text }]}>:</Text>

                  {/* Minute Picker */}
                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setSelectedMinute((m) => (m + 1) % 60)}
                      style={[styles.pickerButton, styles.modalControl, { borderColor: theme.colors.border }]}
                    >
                      <Ionicons name="chevron-up" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.pickerValue, styles.modalControl, { borderColor: theme.colors.border }]}>
                      <Text style={[styles.pickerValueText, { color: theme.colors.text }]}>
                        {selectedMinute.toString().padStart(2, "0")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedMinute((m) => (m - 1 + 60) % 60)}
                      style={[styles.pickerButton, styles.modalControl, { borderColor: theme.colors.border }]}
                    >
                      <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Day Selector */}
              <View style={styles.dayPickerContainer}>
                <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Days</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => toggleDay(day.key)}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: selectedDays.includes(day.key)
                            ? theme.colors.primary
                            : "#FFFFFF",
                          borderColor: selectedDays.includes(day.key)
                            ? theme.colors.primary
                            : theme.colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          {
                            color: selectedDays.includes(day.key)
                              ? "#fff"
                              : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Conversation Mode Selector */}
              <View style={styles.modePickerContainer}>
                <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Conversation Mode</Text>
                <View style={styles.modeOptions}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setConversationMode("voice");
                    }}
                    style={[
                      styles.modeOption,
                      {
                        backgroundColor: conversationMode === "voice"
                          ? theme.colors.primary
                          : "#FFFFFF",
                        borderColor: conversationMode === "voice"
                          ? theme.colors.primary
                          : theme.colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mic"
                      size={24}
                      color={conversationMode === "voice" ? "#fff" : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeOptionText,
                        {
                          color: conversationMode === "voice" ? "#fff" : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      Voice
                    </Text>
                    <Text
                      style={[
                        styles.modeOptionDesc,
                        {
                          color: conversationMode === "voice" ? "rgba(255,255,255,0.7)" : theme.colors.textMuted,
                        },
                      ]}
                    >
                      Speak naturally
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setConversationMode("text");
                    }}
                    style={[
                      styles.modeOption,
                      {
                        backgroundColor: conversationMode === "text"
                          ? theme.colors.primary
                          : "#FFFFFF",
                        borderColor: conversationMode === "text"
                          ? theme.colors.primary
                          : theme.colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble"
                      size={24}
                      color={conversationMode === "text" ? "#fff" : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeOptionText,
                        {
                          color: conversationMode === "text" ? "#fff" : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      Text
                    </Text>
                    <Text
                      style={[
                        styles.modeOptionDesc,
                        {
                          color: conversationMode === "text" ? "rgba(255,255,255,0.7)" : theme.colors.textMuted,
                        },
                      ]}
                    >
                      Type your thoughts
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Enable Toggle */}
              <View style={[styles.enableRow, styles.modalControl, { backgroundColor: "#FFFFFF", borderColor: theme.colors.border }]}>
                <View style={styles.enableInfo}>
                  <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                  <Text style={[styles.enableText, { color: theme.colors.text }]}>
                    Enable scheduled conversations
                  </Text>
                </View>
                <Switch
                  value={scheduleEnabled}
                  onValueChange={(value) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setScheduleEnabled(value);
                  }}
                  trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={[styles.scheduleInfo, { color: theme.colors.textMuted }]}>
                When enabled, you'll receive a notification at your scheduled time. Open the app occasionally so we can reschedule the next one.
                {conversationMode === "voice"
                  ? ' "Is it a good time to talk?" – tap for voice journal.'
                  : ' "Time to journal!" – tap to write.'}
              </Text>

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveSchedule}
                disabled={isSavingSchedule || selectedDays.length === 0}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      selectedDays.length === 0 ? "#E5E7EB" : theme.colors.primary,
                  },
                ]}
              >
                <Text style={[
                  styles.saveButtonText,
                  { color: selectedDays.length === 0 ? "#9CA3AF" : "#fff" },
                ]}>
                  {isSavingSchedule ? "Saving..." : "Save Schedule"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  settingSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  voiceSettingsContainer: {
    gap: 8,
  },
  voiceSettingsLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 4,
  },
  toneButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toneButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  toneButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  voiceSettingsHint: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  themeOption: {
    width: "47%",
    borderRadius: borderRadius.md,
    borderWidth: 2,
    padding: spacing.sm,
    alignItems: "center",
  },
  themePreview: {
    flexDirection: "row",
    width: "100%",
    height: 40,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  themeColor: {
    flex: 1,
  },
  themeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  themeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
  },
  footerSubtext: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  modalControl: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  timePickerContainer: {
    marginBottom: spacing.lg,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerColumn: {
    alignItems: "center",
  },
  pickerButton: {
    width: 60,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerValue: {
    width: 70,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xs,
  },
  pickerValueText: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
  },
  pickerSeparator: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    marginHorizontal: spacing.sm,
  },
  dayPickerContainer: {
    marginBottom: spacing.lg,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
  dayChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  modePickerContainer: {
    marginBottom: spacing.lg,
  },
  modeOptions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modeOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  modeOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  modeOptionDesc: {
    fontSize: typography.fontSize.xs,
    textAlign: "center",
  },
  enableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  enableInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  enableText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  scheduleInfo: {
    fontSize: typography.fontSize.xs,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  saveButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
