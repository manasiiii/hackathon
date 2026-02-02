import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserContextType {
  userName: string | null;
  setUserName: (name: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userName, setUserNameState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("userName").then((stored) => {
      if (stored) setUserNameState(stored);
    });
  }, []);

  const setUserName = async (name: string) => {
    setUserNameState(name);
    await AsyncStorage.setItem("userName", name);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
