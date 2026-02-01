/**
 * Voice settings (TTS, STT, behavior) persisted in AsyncStorage.
 * Used by useVoiceAI for pitch, rate, tone, and pause behavior.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "voice_settings";

export type VoiceTone = "warmer" | "neutral" | "clear";

export interface VoiceSettings {
  /** TTS pitch: 0.5–2.0 (1.0 = normal, higher = more feminine/light) */
  pitch: number;
  /** TTS speed: 0.5–1.5 (1.0 = normal, lower = slower) */
  rate: number;
  /** Preset tone - maps to pitch/rate combos */
  tone: VoiceTone;
  /** Auto-speak AI responses; if false, user taps to hear */
  autoSpeakResponses: boolean;
  /** Show explicit "Stop speaking" button when TTS is playing */
  showStopSpeakingButton: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  pitch: 1.1,
  rate: 0.92,
  tone: "neutral",
  autoSpeakResponses: true,
  showStopSpeakingButton: true,
};

const TONE_PRESETS: Record<VoiceTone, { pitch: number; rate: number }> = {
  warmer: { pitch: 1.05, rate: 0.88 },
  neutral: { pitch: 1.0, rate: 0.92 },
  clear: { pitch: 1.15, rate: 0.95 },
};

interface VoiceSettingsContextValue {
  settings: VoiceSettings;
  updateSettings: (updates: Partial<VoiceSettings>) => Promise<void>;
  setTone: (tone: VoiceTone) => void;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextValue | null>(null);

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<VoiceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
          setSettingsState((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Ignore invalid stored data
        }
      }
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<VoiceSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setTone = useCallback(
    (tone: VoiceTone) => {
      const preset = TONE_PRESETS[tone];
      updateSettings({ tone, pitch: preset.pitch, rate: preset.rate });
    },
    [updateSettings]
  );

  return (
    <VoiceSettingsContext.Provider
      value={{ settings, updateSettings, setTone }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings(): VoiceSettingsContextValue {
  const ctx = useContext(VoiceSettingsContext);
  if (!ctx) {
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: async () => {},
      setTone: () => {},
    };
  }
  return ctx;
}

export { TONE_PRESETS, DEFAULT_SETTINGS };
