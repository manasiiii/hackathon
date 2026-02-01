/**
 * Schedule notification service - iOS only
 * TIME_INTERVAL trigger, rescheduled when app opens
 */

import * as Notifications from "expo-notifications";
import { API_URL } from "../api/config";
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Poll every 2 minutes when app is open
const MIN_SECONDS = 60; // iOS requires >= 60 for reliability

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/** Compute seconds until next occurrence of hour:minute (today or tomorrow) */
function secondsUntilNextOccurrence(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return Math.max(MIN_SECONDS, Math.floor((next.getTime() - now.getTime()) / 1000));
}

export async function scheduleLocalNotifications(
  time: string, // "09:00" or "21:30"
  daysOfWeek: string[], // kept for API compatibility
  enabled: boolean,
  conversationMode: "voice" | "text" = "voice"
): Promise<{ ok: boolean; error?: string }> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enabled || daysOfWeek.length === 0) {
    return { ok: true };
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return { ok: false, error: "Notification permission denied" };
  }

  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const seconds = secondsUntilNextOccurrence(hour, minute);

  const isVoice = conversationMode === "voice";
  const content: Notifications.NotificationContentInput = {
    title: "Inner Circle",
    body: isVoice
      ? "Is it a good time to talk? Tap for voice journal."
      : "Time to journal! Tap to write your thoughts.",
    data: {
      screen: isVoice ? "voice-session" : "compose",
      flowType: "scheduled",
    },
  };

  try {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to schedule" };
  }
}

export async function checkScheduleFromBackend(
  userId: number
): Promise<{ shouldTrigger: boolean; conversationMode?: string } | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/schedule/${userId}/check`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      shouldTrigger: data.should_trigger ?? false,
      conversationMode: data.conversation_mode,
    };
  } catch {
    return null;
  }
}

export { CHECK_INTERVAL_MS };
