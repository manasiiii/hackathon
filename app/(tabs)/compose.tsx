import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../src/contexts/ThemeContext";
import { GradientBackground } from "../../src/components/ui/GradientBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import { Button } from "../../src/components/ui/Button";
import { VoiceButton } from "../../src/components/voice/VoiceButton";
import { useVoiceAI } from "../../src/hooks/useVoiceAI";
import { typography, spacing, borderRadius } from "../../src/constants/theme";
import { api } from "../../src/api/client";
import { USER_ID } from "../../src/constants/user";

export default function ComposeScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    prompt?: string;
    type?: string;
  }>();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const textInputRef = useRef<TextInput>(null);
  const contentOpacity = useSharedValue(0);

  // Voice AI hook
  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    toggleListening,
  } = useVoiceAI({
    onTranscript: (text) => {
      setContent((prev) => prev + (prev ? " " : "") + text);
    },
  });

  // Clear form when screen gains focus (fresh entry each time)
  useFocusEffect(
    React.useCallback(() => {
      setContent("");
      setTitle("");
      setIsVoiceMode(false);
    }, [])
  );

  useEffect(() => {
    contentOpacity.value = withSpring(1);
    // Focus text input after animation
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 500);
  }, []);

  useEffect(() => {
    // Update word count
    const words = content.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [content]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleSave = async () => {
    if (!content.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const entryType = (params.type as "quick_checkin" | "reflection" | "gratitude" | "voice_note" | "guided") || "reflection";

      await api.journals.create({
        user_id: USER_ID,
        content: content.trim(),
        title: title?.trim() || undefined,
        prompt_used: typeof params.prompt === "string" ? params.prompt : undefined,
        is_voice_entry: isVoiceMode,
        voice_transcript: isVoiceMode ? transcript || content : undefined,
        entry_type: entryType,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving entry:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceToggle = () => {
    setIsVoiceMode(!isVoiceMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isVoiceMode) {
      Keyboard.dismiss();
    }
  };

  const getPlaceholder = () => {
    if (params.prompt) return "Start writing...";
    return "What's on your mind?";
  };

  return (
    <GradientBackground animated={false}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.header}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/(tabs)");
              }}
              style={styles.headerButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                New Entry
              </Text>
              {wordCount > 0 && (
                <Text
                  style={[
                    styles.wordCount,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {wordCount} words
                </Text>
              )}
            </View>

            <Button
              title="Save"
              onPress={handleSave}
              size="sm"
              disabled={!content.trim()}
              loading={isSaving}
            />
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Prompt Display */}
            {params.prompt && (
              <Animated.View entering={FadeIn.delay(200).duration(400)}>
                <GlassCard
                  style={{
                    ...styles.promptCard,
                    backgroundColor: theme.colors.surfaceHighlight,
                  }}
                  padding="md"
                >
                  <View style={styles.promptHeader}>
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.promptLabel,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Today's Prompt
                    </Text>
                  </View>
                  <Text
                    style={[styles.promptText, { color: theme.colors.text }]}
                  >
                    {params.prompt}
                  </Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* Title Input */}
            <Animated.View
              entering={FadeIn.delay(400).duration(400)}
              style={contentAnimatedStyle}
            >
              <TextInput
                style={[styles.titleInput, { color: theme.colors.text }]}
                placeholder="Title (optional)"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </Animated.View>

            {/* Content Input */}
            <Animated.View style={contentAnimatedStyle}>
              {isVoiceMode ? (
                <View style={styles.voiceSection}>
                  <VoiceButton
                    isListening={isListening}
                    isProcessing={isProcessing}
                    onPress={toggleListening}
                    transcript={transcript}
                    size="large"
                  />
                  {content.length > 0 && (
                    <View
                      style={[
                        styles.transcriptPreview,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.transcriptText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {content}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <TextInput
                  ref={textInputRef}
                  style={[styles.contentInput, { color: theme.colors.text }]}
                  placeholder={getPlaceholder()}
                  placeholderTextColor={theme.colors.textMuted}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={false}
                />
              )}
            </Animated.View>
          </ScrollView>

          {/* Bottom Toolbar */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={[
              styles.toolbar,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Pressable
              onPress={handleVoiceToggle}
              style={[
                styles.toolbarButton,
                isVoiceMode && {
                  backgroundColor: theme.colors.surfaceHighlight,
                },
              ]}
            >
              <Ionicons
                name={isVoiceMode ? "mic" : "mic-outline"}
                size={24}
                color={
                  isVoiceMode
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </Pressable>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  wordCount: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  promptCard: {
    marginBottom: spacing.lg,
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  promptLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    fontStyle: "italic",
  },
  titleInput: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  contentInput: {
    fontSize: typography.fontSize.lg,
    lineHeight: 28,
    minHeight: 200,
  },
  voiceSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  transcriptPreview: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    width: "100%",
  },
  transcriptText: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  toolbarButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
});
