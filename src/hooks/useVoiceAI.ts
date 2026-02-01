import { useState, useCallback, useRef, useEffect } from "react";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { useVoiceSettings } from "../contexts/VoiceSettingsContext";
import { api } from "../api/client";
import { USER_ID } from "../constants/user";

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || "";

interface VoiceAIState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  isConnected: boolean;
}

interface UseVoiceAIOptions {
  onTranscript?: (transcript: string) => void;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
  onPartialTranscript?: (partial: string) => void;
  /** When true, no AI speaks—only transcribe user speech. */
  recordOnly?: boolean;
  /** Starting question from orchestrator (or null to fetch). */
  startingQuestion?: string | null;
}

export const useVoiceAI = (options: UseVoiceAIOptions = {}) => {
  const { settings } = useVoiceSettings();

  const [state, setState] = useState<VoiceAIState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: "",
    error: null,
    isConnected: false,
  });

  const conversationHistory = useRef<Array<{ role: string; content: string }>>([]);
  const recording = useRef<Audio.Recording | null>(null);
  const deepgramSocket = useRef<WebSocket | null>(null);
  const fullTranscript = useRef<string>("");
  const hasRespondedRef = useRef(false); // One AI response only - no loop

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (recording.current) {
      try {
        await recording.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      recording.current = null;
    }
    if (deepgramSocket.current) {
      deepgramSocket.current.close();
      deepgramSocket.current = null;
    }
    Speech.stop();
  };

  const connectToDeepgram = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === "your_deepgram_api_key_here") {
        reject(new Error("Deepgram API key not configured"));
        return;
      }

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&smart_format=true&punctuate=true`,
        ["token", DEEPGRAM_API_KEY]
      );

      socket.onopen = () => {
        console.log("Deepgram connected");
        setState((prev) => ({ ...prev, isConnected: true }));
        resolve(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript;
            const isFinal = data.is_final;

            if (isFinal && transcript.trim()) {
              fullTranscript.current += (fullTranscript.current ? " " : "") + transcript;
              setState((prev) => ({ ...prev, transcript: fullTranscript.current }));
              options.onPartialTranscript?.(fullTranscript.current);
            } else if (!isFinal && transcript.trim()) {
              options.onPartialTranscript?.(fullTranscript.current + " " + transcript);
            }
          }
        } catch (e) {
          console.error("Error parsing Deepgram response:", e);
        }
      };

      socket.onerror = (error) => {
        console.error("Deepgram error:", error);
        setState((prev) => ({ ...prev, error: "Connection error", isConnected: false }));
        reject(error);
      };

      socket.onclose = () => {
        console.log("Deepgram disconnected");
        setState((prev) => ({ ...prev, isConnected: false }));
      };
    });
  }, [options]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text?.trim()) return;
      try {
        setState((prev) => ({ ...prev, isSpeaking: true }));

        const voices = await Speech.getAvailableVoicesAsync();
        const femaleVoice = voices.find(
          (v) =>
            v.language.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("samantha") ||
              v.name.toLowerCase().includes("karen") ||
              v.name.toLowerCase().includes("moira") ||
              v.name.toLowerCase().includes("tessa") ||
              v.name.toLowerCase().includes("fiona") ||
              v.name.toLowerCase().includes("victoria") ||
              v.name.toLowerCase().includes("allison") ||
              v.name.toLowerCase().includes("ava") ||
              v.name.toLowerCase().includes("susan") ||
              v.name.toLowerCase().includes("zoe") ||
              v.identifier?.toLowerCase().includes("female") ||
              v.identifier?.toLowerCase().includes("enhanced"))
        );

        // onDone can be unreliable on iOS - use timeout fallback so we don't hang
        const timeoutMs = Math.max(3000, Math.ceil(text.length / 15) * 1000);
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            Speech.speak(text, {
              language: "en-US",
              pitch: settings.pitch,
              rate: settings.rate,
              voice: femaleVoice?.identifier,
              onDone: () => {
                setState((prev) => ({ ...prev, isSpeaking: false }));
                resolve();
              },
              onError: (err) => {
                setState((prev) => ({ ...prev, isSpeaking: false }));
                reject(err);
              },
            });
          }),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              setState((prev) => ({ ...prev, isSpeaking: false }));
              resolve();
            }, timeoutMs)
          ),
        ]);
      } catch (error: any) {
        console.error("Error speaking:", error);
        setState((prev) => ({ ...prev, isSpeaking: false }));
      }
    },
    [settings.pitch, settings.rate]
  );

  const startListening = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isListening: true, error: null, transcript: "" }));
      fullTranscript.current = "";

      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Microphone permission not granted");
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Check if Deepgram is configured
      if (DEEPGRAM_API_KEY && DEEPGRAM_API_KEY !== "your_deepgram_api_key_here") {
        // Connect to Deepgram for real-time transcription
        try {
          deepgramSocket.current = await connectToDeepgram();
        } catch (e) {
          console.warn("Deepgram connection failed, using fallback mode:", e);
        }
      }

      // Start recording
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        async (status) => {
          // This callback can be used for real-time audio streaming to Deepgram
          // For now, we'll process the full recording when stopped
        }
      );

      recording.current = rec;
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: error.message || "Failed to start recording",
      }));
      options.onError?.(error.message);
    }
  }, [options, connectToDeepgram]);

  const stopListening = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isListening: false, isProcessing: true }));

      // Stop recording
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        const uri = recording.current.getURI();
        recording.current = null;

        // Close Deepgram connection
        if (deepgramSocket.current) {
          deepgramSocket.current.close();
          deepgramSocket.current = null;
        }

        // If we don't have a transcript yet (Deepgram wasn't used or failed), transcribe the file
        if (!fullTranscript.current && uri) {
          await transcribeAudioFile(uri);
        }
      }

      // Process the transcript
      const finalTranscript = fullTranscript.current.trim();

      if (finalTranscript) {
        setState((prev) => ({ ...prev, transcript: finalTranscript }));
        options.onTranscript?.(finalTranscript);

        if (options.recordOnly) {
          setState((prev) => ({ ...prev, isProcessing: false }));
        } else if (!hasRespondedRef.current) {
          // One exchange only: transcript → reflection agent → next question. No loop.
          hasRespondedRef.current = true;
          let response = "Thank you for sharing. I'm here to listen.";
          try {
            const res = await api.voice.getReflection(finalTranscript);
            if (res?.response?.trim()) response = res.response.trim();
          } catch (e) {
            console.warn("Voice reflection API failed:", e);
          }

          conversationHistory.current.push(
            { role: "user", content: finalTranscript },
            { role: "assistant", content: response }
          );

          setState((prev) => ({ ...prev, isProcessing: false }));
          options.onResponse?.(response);
          await speak(response);
        } else {
          // User answered follow-up: just capture transcript, no AI response
          setState((prev) => ({ ...prev, isProcessing: false }));
        }
      } else {
        setState((prev) => ({ ...prev, isProcessing: false }));
        options.onError?.("No speech detected. Please try again.");
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error: any) {
      console.error("Error stopping recording:", error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error.message || "Failed to process recording",
      }));
      options.onError?.(error.message);
    }
  }, [options, settings.autoSpeakResponses]);

  const transcribeAudioFile = async (uri: string) => {
    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === "your_deepgram_api_key_here") {
      // Fallback: Use simulated transcript if no API key
      console.warn("No Deepgram API key, using simulated transcript");
      const sampleTranscripts = [
        "I had a really productive day today",
        "Feeling a bit stressed about work",
        "Had a wonderful conversation with a friend",
        "I've been thinking about my goals",
        "Today was challenging but rewarding",
      ];
      fullTranscript.current = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
      return;
    }

    try {
      // Read the audio file and send to Deepgram
      const response = await fetch(uri);
      const blob = await response.blob();

      const transcribeResponse = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "audio/wav",
          },
          body: blob,
        }
      );

      const result = await transcribeResponse.json();

      if (result.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        fullTranscript.current = result.results.channels[0].alternatives[0].transcript;
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      // Use fallback
      fullTranscript.current = "I'd like to reflect on my day";
    }
  };

  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const greet = useCallback(async () => {
    const question =
      options.startingQuestion?.trim() ||
      (await api.journals.getQuestion(USER_ID, 3).then((r) => r?.question).catch(() => null)) ||
      "How are you feeling right now?";
    conversationHistory.current.push({ role: "assistant", content: question });
    options.onResponse?.(question);
    await speak(question);
  }, [speak, options]);

  const suggestPrompt = useCallback(async () => {
    const prompts = [
      "Let me offer you a thought to reflect on: What small moment of joy did you experience today?",
      "Here's something to consider: If you could change one thing about your day, what would it be?",
      "Let me suggest: What are you most grateful for right now?",
      "Think about this: What's one thing you learned about yourself recently?",
      "Consider this: Who made a positive impact on your day, and why?",
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    conversationHistory.current.push({ role: "assistant", content: prompt });
    options.onResponse?.(prompt);
    await speak(prompt);
  }, [speak, options]);

  const resetForNewSession = useCallback(() => {
    hasRespondedRef.current = false;
    conversationHistory.current = [];
    fullTranscript.current = "";
  }, []);

  const clearHistory = useCallback(() => {
    resetForNewSession();
  }, [resetForNewSession]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    greet,
    suggestPrompt,
    resetForNewSession,
    clearHistory,
    conversationHistory: conversationHistory.current,
  };
};
