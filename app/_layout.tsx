import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { UserProvider } from "../src/contexts/UserContext";
import { ScheduleProvider } from "../src/contexts/ScheduleContext";
import { VoiceSettingsProvider } from "../src/contexts/VoiceSettingsContext";

function ThemeAwareLayout() {
  const { theme } = useTheme();
  const bgColor = theme.gradients.background[0];

  return (
    <>
      <StatusBar style="dark" />
      <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: bgColor },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="journal/new"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="journal/[id]"
              options={{
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="voice-session"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
              }}
            />
          </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <UserProvider>
          <VoiceSettingsProvider>
            <ScheduleProvider>
              <ThemeAwareLayout />
            </ScheduleProvider>
          </VoiceSettingsProvider>
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
