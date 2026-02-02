/**
 * ScheduleContext - Handles in-app schedule checking and notification response
 * Polls backend when app is in foreground, shows prompt when it's time
 */

import React, { createContext, useContext, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Alert } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import {
  checkScheduleFromBackend,
  scheduleLocalNotifications,
  CHECK_INTERVAL_MS,
} from "../services/scheduleNotifications";

import { API_URL } from "../api/config";
import { USER_ID } from "../constants/user";

const ScheduleContext = createContext<undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const appState = useRef(AppState.currentState);
  const lastCheckedRef = useRef(0);
  const hasTriggeredThisSessionRef = useRef(false);

  const checkAndPrompt = async () => {
    const result = await checkScheduleFromBackend(USER_ID);
    if (!result?.shouldTrigger || hasTriggeredThisSessionRef.current) return;

    hasTriggeredThisSessionRef.current = true;

    Alert.alert(
      "Is it a good time to talk?",
      "Inner Circle is here for your check-in.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Let's talk",
          onPress: () => {
            router.push("/voice-session");
          },
        },
      ]
    );
  };

  // Sync local notifications with backend schedule on app start
  useEffect(() => {
    const syncSchedule = async () => {
      try {
        const res = await fetch(`${API_URL}/api/schedule?user_id=${USER_ID}`);
        if (res.ok) {
          const schedules = await res.json();
          if (schedules.length > 0) {
            const s = schedules[0];
            await scheduleLocalNotifications(
              s.time,
              s.days_of_week,
              s.is_enabled,
              s.conversation_mode || "voice"
            );
          }
        }
      } catch {
        // Backend unreachable - skip sync
      }
    };
    syncSchedule();
  }, []);

  useEffect(() => {
    // Poll when app is in foreground
    const interval = setInterval(async () => {
      if (appState.current !== "active") return;
      if (Date.now() - lastCheckedRef.current < CHECK_INTERVAL_MS) return;

      lastCheckedRef.current = Date.now();
      await checkAndPrompt();
    }, CHECK_INTERVAL_MS);

    // Check when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = nextState;
      if (wasBackground && nextState === "active") {
        checkAndPrompt();
      }
    });

    // Initial check
    checkAndPrompt();

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // Speak notification aloud when received (voice notification)
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { screen?: string; flowType?: string };
      if (data?.flowType === "scheduled" && data?.screen === "voice-session") {
        Speech.speak("Hey!, is it a good time to talk?", { rate: 0.9, pitch: 1 });
      }
    });
    return () => sub.remove();
  }, []);

  // Handle notification tap - navigate to voice session
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { screen?: string };
      if (data?.screen === "voice-session") {
        router.push("/voice-session");
      } else if (data?.screen === "compose") {
        router.push("/(tabs)/compose");
      }
    };

    // Check if app was opened from notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        handleNotificationResponse(response);
        Notifications.clearLastNotificationResponseAsync();
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, []);

  return (
    <ScheduleContext.Provider value={undefined}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  return context;
};
