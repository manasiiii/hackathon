// Inner Circle - Theme System
// Calm, soft, gentle light pastel themes

export const themes = {
  warm: {
    name: "Warm",
    colors: {
      gradientStart: "#FFFAF5",
      gradientMid: "#FFF5EB",
      gradientEnd: "#FFEBDE",
      
      primary: "#C4734A",
      primaryLight: "#D48B68",
      primaryDark: "#A35D3A",
      
      secondary: "#B88B6A",
      secondaryLight: "#C9A488",
      
      accent: "#E8B896",
      accentLight: "#F0D4BC",
      
      positive: "#7BAF8E",
      neutral: "#B8956E",
      negative: "#C9867A",
      
      text: "#5C4033",
      textSecondary: "#8B7355",
      textMuted: "#A08B75",
      textOnPrimary: "#FFFFFF",
      
      surface: "rgba(255, 255, 255, 0.8)",
      surfaceLight: "rgba(255, 255, 255, 0.95)",
      surfaceHighlight: "rgba(228, 184, 150, 0.2)",
      
      card: "rgba(255, 255, 255, 0.92)",
      cardHighlight: "rgba(255, 250, 245, 0.95)",
      
      border: "rgba(180, 140, 110, 0.18)",
      borderLight: "rgba(180, 140, 110, 0.25)",
      
      success: "#7BAF8E",
      warning: "#B8956E",
      error: "#C9867A",
      info: "#7A9FB5",
    },
    gradients: {
      background: ["#FFFAF5", "#FFF5EB", "#FFEBDE"],
      card: ["rgba(255, 255, 255, 0.95)", "rgba(255, 245, 235, 0.9)"],
      accent: ["#D4A574", "#E8C4A0"],
      warm: ["#D4A574", "#E8C4A0"],
      cool: ["#E8C4A0", "#D4A574"],
      positive: ["#9BC4AB", "#7BAF8E"],
      negative: ["#E8A89A", "#D48B7A"],
    },
  },
  cool: {
    name: "Cool",
    colors: {
      gradientStart: "#F5FAFF",
      gradientMid: "#EBF5FC",
      gradientEnd: "#DDEFFA",
      
      primary: "#6B9EB8",
      primaryLight: "#85B3C9",
      primaryDark: "#5A8AA3",
      
      secondary: "#7AABC4",
      secondaryLight: "#95BFD4",
      
      accent: "#A8C9DE",
      accentLight: "#C4DCEA",
      
      positive: "#7BAF9A",
      neutral: "#8B9CA8",
      negative: "#B8989A",
      
      text: "#3D5566",
      textSecondary: "#5C7888",
      textMuted: "#7A94A3",
      textOnPrimary: "#FFFFFF",
      
      surface: "rgba(255, 255, 255, 0.8)",
      surfaceLight: "rgba(255, 255, 255, 0.95)",
      surfaceHighlight: "rgba(168, 201, 222, 0.25)",
      
      card: "rgba(255, 255, 255, 0.92)",
      cardHighlight: "rgba(245, 250, 255, 0.95)",
      
      border: "rgba(107, 158, 184, 0.18)",
      borderLight: "rgba(107, 158, 184, 0.25)",
      
      success: "#7BAF9A",
      warning: "#8B9CA8",
      error: "#B8989A",
      info: "#6B9EB8",
    },
    gradients: {
      background: ["#F5FAFF", "#EBF5FC", "#DDEFFA"],
      card: ["rgba(255, 255, 255, 0.95)", "rgba(235, 245, 252, 0.9)"],
      accent: ["#85B3C9", "#A8C9DE"],
      warm: ["#A8C9DE", "#85B3C9"],
      cool: ["#85B3C9", "#A8C9DE"],
      positive: ["#9BC4B0", "#7BAF9A"],
      negative: ["#E8B4B6", "#D4989A"],
    },
  },
  pink: {
    name: "Pink",
    colors: {
      gradientStart: "#FFF8F9",
      gradientMid: "#FFF0F3",
      gradientEnd: "#FFE5EA",
      
      primary: "#C97B8E",
      primaryLight: "#D99AA9",
      primaryDark: "#B06878",
      
      secondary: "#D48A9B",
      secondaryLight: "#E0A8B5",
      
      accent: "#E8B8C4",
      accentLight: "#F0D4DC",
      
      positive: "#8BAF9A",
      neutral: "#B89A9E",
      negative: "#C98A8A",
      
      text: "#5C4048",
      textSecondary: "#8B5C6A",
      textMuted: "#A07882",
      textOnPrimary: "#FFFFFF",
      
      surface: "rgba(255, 255, 255, 0.8)",
      surfaceLight: "rgba(255, 255, 255, 0.95)",
      surfaceHighlight: "rgba(232, 184, 196, 0.25)",
      
      card: "rgba(255, 255, 255, 0.92)",
      cardHighlight: "rgba(255, 248, 249, 0.95)",
      
      border: "rgba(201, 123, 142, 0.18)",
      borderLight: "rgba(201, 123, 142, 0.25)",
      
      success: "#8BAF9A",
      warning: "#B89A9E",
      error: "#C98A8A",
      info: "#9E8BB8",
    },
    gradients: {
      background: ["#FFF8F9", "#FFF0F3", "#FFE5EA"],
      card: ["rgba(255, 255, 255, 0.95)", "rgba(255, 240, 243, 0.9)"],
      accent: ["#D99AA9", "#E8B8C4"],
      warm: ["#E8B8C4", "#D99AA9"],
      cool: ["#D99AA9", "#E8B8C4"],
      positive: ["#A8C4B0", "#8BAF9A"],
      negative: ["#E8A8A8", "#D49898"],
    },
  },
};

export type ThemeName = keyof typeof themes;
export type Theme = typeof themes.warm;

// Typography
export const typography = {
  fontFamily: {
    primary: "System",
    display: "System",
    mono: "monospace",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },
  fontWeight: {
    light: "300" as const,
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
};

// Border radius - softer, rounder
export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
};

// Shadows - gentle, soft
export const shadows = {
  sm: {
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  }),
};

// Animation timings
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  easing: {
    easeOut: [0.25, 0.46, 0.45, 0.94],
    easeIn: [0.55, 0.055, 0.675, 0.19],
    easeInOut: [0.645, 0.045, 0.355, 1],
    spring: { damping: 15, stiffness: 150 },
  },
};

// Mood colors and emojis - soft pastels, fancy face style
export const moodConfig = {
  1: { emoji: "🥹", label: "Very Low", color: "#D4989A" },
  2: { emoji: "😮‍💨", label: "Low", color: "#E8B896" },
  3: { emoji: "😌", label: "Neutral", color: "#C9A488" },
  4: { emoji: "🥰", label: "Good", color: "#9BC4AB" },
  5: { emoji: "🤩", label: "Great", color: "#8BC4D4" },
};

// Sentiment colors - gentle
export const sentimentColors = {
  very_negative: "#D4989A",
  negative: "#E8B896",
  neutral: "#C9A488",
  positive: "#9BC4AB",
  very_positive: "#8BC4D4",
};

// Emotion icons and colors - soft pastels
export const emotionConfig: Record<string, { icon: string; color: string }> = {
  joy: { icon: "sunny", color: "#E8C4A0" },
  happiness: { icon: "happy", color: "#9BC4AB" },
  gratitude: { icon: "heart", color: "#E8B8C4" },
  hope: { icon: "sparkles", color: "#A8C9DE" },
  peace: { icon: "leaf", color: "#8BC4A8" },
  love: { icon: "heart", color: "#D99AA9" },
  excitement: { icon: "flash", color: "#E8B896" },
  contentment: { icon: "cafe", color: "#B8A8D4" },
  
  sadness: { icon: "rainy", color: "#95BFD4" },
  anxiety: { icon: "thunderstorm", color: "#D4A574" },
  stress: { icon: "pulse", color: "#D4989A" },
  anger: { icon: "flame", color: "#C98A8A" },
  frustration: { icon: "close-circle", color: "#D4989A" },
  fear: { icon: "alert-circle", color: "#B8A8D4" },
  loneliness: { icon: "person", color: "#9CA8B4" },
  confusion: { icon: "help-circle", color: "#B8B4C4" },
};
