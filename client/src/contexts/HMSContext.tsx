import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { HMSRoomProvider } from "@100mslive/react-sdk";

interface HMSContextType {
  isInVoiceChannel: boolean;
  currentConnectionId: string | null;
  setVoiceChannelActive: (connectionId: string | null) => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

export function HMSProvider({ children }: { children: ReactNode }) {
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);

  const setVoiceChannelActive = (connectionId: string | null) => {
    setCurrentConnectionId(connectionId);
    setIsInVoiceChannel(connectionId !== null);
  };

  // Persist voice channel state across page navigation
  useEffect(() => {
    const savedConnectionId = sessionStorage.getItem('activeVoiceChannelId');
    if (savedConnectionId) {
      setCurrentConnectionId(savedConnectionId);
      setIsInVoiceChannel(true);
    }
  }, []);

  useEffect(() => {
    if (currentConnectionId) {
      sessionStorage.setItem('activeVoiceChannelId', currentConnectionId);
    } else {
      sessionStorage.removeItem('activeVoiceChannelId');
    }
  }, [currentConnectionId]);

  return (
    <HMSContext.Provider value={{ isInVoiceChannel, currentConnectionId, setVoiceChannelActive }}>
      <HMSRoomProvider>
        {children}
      </HMSRoomProvider>
    </HMSContext.Provider>
  );
}

export function useHMSContext() {
  const context = useContext(HMSContext);
  if (context === undefined) {
    throw new Error('useHMSContext must be used within a HMSProvider');
  }
  return context;
}
