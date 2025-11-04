import { createContext, useContext, useEffect, useState } from "react";

type BackgroundTheme = "canvas2d" | "webgl" | "solid";

type BackgroundContextType = {
  background: BackgroundTheme;
  setBackground: (theme: BackgroundTheme) => void;
};

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundTheme>(() => {
    const stored = localStorage.getItem("gamematch-background-theme");
    return (stored as BackgroundTheme) || "solid";
  });

  useEffect(() => {
    localStorage.setItem("gamematch-background-theme", background);
  }, [background]);

  const setBackground = (theme: BackgroundTheme) => {
    setBackgroundState(theme);
  };

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}
