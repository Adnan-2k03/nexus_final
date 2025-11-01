import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type LayoutWidth = "compact" | "comfortable" | "cozy";

interface LayoutContextType {
  layoutWidth: LayoutWidth;
  setLayoutWidth: (width: LayoutWidth) => void;
  getContainerClass: () => string;
  getFontSizeClass: () => string;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutWidth, setLayoutWidthState] = useState<LayoutWidth>(() => {
    const stored = localStorage.getItem("layoutWidth");
    return (stored as LayoutWidth) || "compact";
  });

  const setLayoutWidth = (width: LayoutWidth) => {
    setLayoutWidthState(width);
    localStorage.setItem("layoutWidth", width);
  };

  const getContainerClass = () => {
    switch (layoutWidth) {
      case "compact":
        return "max-w-3xl"; // Current narrow width for Feed/Profile
      case "comfortable":
        return "max-w-7xl"; // Wide like Discover
      case "cozy":
        return "max-w-5xl"; // In-between width
      default:
        return "max-w-3xl";
    }
  };

  const getFontSizeClass = () => {
    switch (layoutWidth) {
      case "compact":
        return "text-sm"; // Smaller text for compact
      case "comfortable":
        return "text-base"; // Normal text for comfortable
      case "cozy":
        return "text-sm"; // Small-medium for cozy
      default:
        return "text-sm";
    }
  };

  return (
    <LayoutContext.Provider
      value={{
        layoutWidth,
        setLayoutWidth,
        getContainerClass,
        getFontSizeClass,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
