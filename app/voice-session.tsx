import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../src/contexts/ThemeContext";
import { api } from "../src/api/client";
import { GradientBackground } from "../src/components/ui/GradientBackground";
import { Button } from "../src/components/ui/Button";
import { VoiceButton } from "../src/components/voice/VoiceButton";
import { useVoiceAI } from "../src/hooks/useVoiceAI";
import { useVoiceSettings } from "../src/contexts/VoiceSettingsContext";
import { typography, spacing, borderRadius } from "../src/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

import { USER_ID } from "../src/constants/user";

export default function VoiceSessionScreen() {
  const { theme } = useTheme();
  const { settings: voiceSettings } = useVoiceSettings();
  const params = useLocalSearchParams<{ prompt?: string; recordOnly?: string }>();
  const recordOnly = params.recordOnly === "true" || params.recordOnly === "1";
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values for ambient visualization
  const orbScale1 = useSharedValue(1);
  const orbScale2 = useSharedValue(1);
  const orbOpacity = useSharedValue(0.3);

  const promptQuestion = typeof params.prompt === "string" ? params.prompt?.trim() || null : null;

  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    toggleListening,
    greet,
    speak,
    stopSpeaking,
    resetForNewSession,
  } = useVoiceAI({
    onTranscript: (text) => {
      addMessage("user", text);
    },
    onResponse: recordOnly ? undefined : (response) => {
      addMessage("assistant", response);
    },
    recordOnly,
    startingQuestion: promptQuestion,
  });

  useEffect(() => {
    // Start ambient animations
    orbScale1.value = withRepeat(
      withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    orbScale2.value = withRepeat(
      withTiming(1.3, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(orbScale1);
      cancelAnimation(orbScale2);
    };
  }, []);

  useEffect(() => {
    // Session duration timer
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    // Update animation based on listening/speaking state
    if (isListening || isSpeaking) {
      orbOpacity.value = withTiming(0.6, { duration: 300 });
    } else {
      orbOpacity.value = withTiming(0.3, { duration: 300 });
    }
  }, [isListening, isSpeaking]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${role}-${Math.random().toString(36).slice(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleStartSession = async () => {
    setIsSessionActive(true);
    resetForNewSession();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (recordOnly) return;
    if (promptQuestion) {
      addMessage("assistant", promptQuestion);
      await speak(promptQuestion);
    } else {
      await greet();
    }
  };

  const handleEndSession = async () => {
    setIsSessionActive(false);
    stopSpeaking();
    const transcript = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
    if (transcript.trim()) {
      try {
        await api.journals.create({
          user_id: USER_ID,
          content: transcript.trim(),
          prompt_used: typeof params.prompt === "string" ? params.prompt : undefined,
          is_voice_entry: true,
          voice_transcript: transcript.trim(),
          entry_type: "voice_note",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error("Error saving voice entry:", e);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
    router.replace("/(tabs)");
  };

  const handleClose = () => {
    if (isSessionActive && messages.length > 0) {
      handleEndSession();
    } else {
      stopSpeaking();
      router.replace("/(tabs)");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const orbStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale1.value }],
    opacity: orbOpacity.value,
  }));

  const orbStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale2.value }],
    opacity: orbOpacity.value * 0.7,
  }));

  return (
    <GradientBackground animated={false}>
      <SafeAreaView style={styles.container}>
        {/* Ambient orbs - pointerEvents none so close button receives touches */}
        <View style={[styles.ambientContainer, { pointerEvents: "none" as const }]}>
          <Animated.View
            style={[
              styles.ambientOrb,
              styles.orb1,
              { backgroundColor: theme.colors.primary },
              orbStyle1,
            ]}
          />
          <Animated.View
            style={[
              styles.ambientOrb,
              styles.orb2,
              { backgroundColor: theme.colors.secondary },
              orbStyle2,
            ]}
          />
        </View>

        {/* Header - zIndex ensures it's above ambient layer */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.header, { zIndex: 10 }]}
        >
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {recordOnly ? "Voice Entry" : "Voice Journal"}
            </Text>
            {isSessionActive && (
              <View style={styles.durationBadge}>
                <View
                  style={[styles.recordingDot, { backgroundColor: theme.colors.error }]}
                />
                <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(sessionDuration)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.promptButton} />
        </Animated.View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {!isSessionActive && messages.length === 0 && (
            <Animated.View
              entering={FadeIn.delay(200).duration(600)}
              style={styles.welcomeContainer}
            >
              <LinearGradient
                colors={[`${theme.colors.primary}30`, `${theme.colors.secondary}20`]}
                style={styles.welcomeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={recordOnly ? "mic" : "chatbubbles"}
                  size={64}
                  color={theme.colors.primary}
                />
                <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                  {recordOnly ? "Record Your Thoughts" : "Your AI Companion"}
                </Text>
                <Text
                  style={[
                    styles.welcomeSubtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {recordOnly
                    ? "Tap to start recording. Speak freely—no AI will respond. Your words will be transcribed and saved."
                    : "Have a reflective conversation about your day, thoughts, or feelings. I'm here to listen and help you journal."}
                </Text>
                <Button
                  title={recordOnly ? "Start Recording" : "Start Session"}
                  onPress={handleStartSession}
                  variant="gradient"
                  icon="mic"
                  size="lg"
                  style={styles.startButton}
                />
              </LinearGradient>
            </Animated.View>
          )}

          {messages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeIn.delay(index * 50).duration(300)}
              style={[
                styles.messageContainer,
                message.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage,
              ]}
            >
              {message.role === "assistant" && (
                <View
                  style={[
                    styles.avatarContainer,
                    { backgroundColor: theme.colors.surfaceHighlight },
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user"
                    ? {
                        backgroundColor: theme.colors.primary,
                      }
                    : {
                        backgroundColor: theme.colors.surface,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color:
                        message.role === "user"
                          ? "#fff"
                          : theme.colors.text,
                    },
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </Animated.View>
          ))}

          {/* Typing indicator - hide in recordOnly */}
          {!recordOnly && (isProcessing || isSpeaking) && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[styles.messageContainer, styles.assistantMessage]}
            >
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: theme.colors.surfaceHighlight },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <View
                style={[
                  styles.messageBubble,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.typingIndicator}>
                  {[0, 1, 2].map((i) => (
                    <TypingDot key={i} delay={i * 150} color={theme.colors.textMuted} />
                  ))}
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Voice Controls */}
        {isSessionActive && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.controlsContainer}
          >
            <View style={styles.voiceButtonContainer}>
              <VoiceButton
                isListening={isListening}
                isProcessing={isProcessing}
                onPress={toggleListening}
                transcript={transcript}
                size="large"
              />
            </View>

            {!recordOnly && voiceSettings.showStopSpeakingButton && isSpeaking && (
              <Button
                title="Stop speaking"
                onPress={stopSpeaking}
                variant="secondary"
                icon="pause"
                style={styles.stopSpeakingButton}
              />
            )}

            <Button
              title="End Session"
              onPress={handleEndSession}
              variant="secondary"
              icon="stop-circle"
              style={styles.endButton}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

// Typing dot animation component
const TypingDot: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 400 }),
        -1,
        true
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.typingDot, { backgroundColor: color }, animatedStyle]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientOrb: {
    position: "absolute",
    borderRadius: 9999,
  },
  orb1: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    top: -SCREEN_WIDTH * 0.2,
    left: -SCREEN_WIDTH * 0.2,
  },
  orb2: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    bottom: SCREEN_HEIGHT * 0.1,
    right: -SCREEN_WIDTH * 0.2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  durationText: {
    fontSize: typography.fontSize.sm,
  },
  promptButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing["3xl"],
  },
  welcomeGradient: {
    alignItems: "center",
    padding: spacing["2xl"],
    borderRadius: borderRadius.xl,
    width: "100%",
  },
  welcomeTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.base,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  startButton: {
    marginTop: spacing.md,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: spacing.md,
    maxWidth: "85%",
  },
  userMessage: {
    alignSelf: "flex-end",
  },
  assistantMessage: {
    alignSelf: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    maxWidth: "100%",
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controlsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  voiceButtonContainer: {
    marginBottom: spacing.xl,
  },
  stopSpeakingButton: {
    marginBottom: spacing.sm,
  },
  endButton: {
    alignSelf: "stretch",
    justifyContent: "center",
  },
});
