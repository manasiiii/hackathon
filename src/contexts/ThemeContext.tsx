import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, ThemeName, Theme } from "../constants/theme";

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>("warm");

  useEffect(() => {
    // Load saved theme (only use if it exists in current themes)
    AsyncStorage.getItem("theme").then((saved) => {
      if (saved && saved in themes) {
        setThemeName(saved as ThemeName);
      } else if (saved) {
        // Clear stale theme from storage
        AsyncStorage.setItem("theme", "warm");
      }
    });
  }, []);

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem("theme", name);
  };

  // Guard against stale theme names (e.g. "ethereal" from old AsyncStorage)
  const theme = themes[themeName] ?? themes.warm;
  const safeThemeName = themes[themeName] ? themeName : "warm";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName: safeThemeName as ThemeName,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
