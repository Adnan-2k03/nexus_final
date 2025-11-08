import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { HMSRoomProvider } from "@100mslive/react-sdk";

type VoiceChannelType = 'individual' | 'group';

interface ActiveVoiceChannel {
  id: string;
  type: VoiceChannelType;
}

interface HMSContextType {
  isInVoiceChannel: boolean;
  currentConnectionId: string | null;
  activeVoiceChannel: ActiveVoiceChannel | null;
  setVoiceChannelActive: (connectionId: string | null, type?: VoiceChannelType) => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

export function HMSProvider({ children }: { children: ReactNode }) {
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<ActiveVoiceChannel | null>(null);
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);

  const setVoiceChannelActive = (connectionId: string | null, type: VoiceChannelType = 'individual') => {
    if (connectionId === null) {
      setActiveVoiceChannel(null);
      setIsInVoiceChannel(false);
    } else {
      setActiveVoiceChannel({ id: connectionId, type });
      setIsInVoiceChannel(true);
    }
  };

  // Persist voice channel state across page navigation
  useEffect(() => {
    const savedData = sessionStorage.getItem('activeVoiceChannel');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as ActiveVoiceChannel;
        setActiveVoiceChannel(parsed);
        // Note: isInVoiceChannel will be set to true when the user actually
        // connects to the HMS room, not just when we load from sessionStorage
      } catch (e) {
        console.warn('Failed to parse saved voice channel data');
        sessionStorage.removeItem('activeVoiceChannel');
      }
    }
  }, []);

  useEffect(() => {
    if (activeVoiceChannel) {
      sessionStorage.setItem('activeVoiceChannel', JSON.stringify(activeVoiceChannel));
    } else {
      sessionStorage.removeItem('activeVoiceChannel');
    }
  }, [activeVoiceChannel]);

  const currentConnectionId = activeVoiceChannel?.id || null;

  return (
    <HMSContext.Provider value={{ 
      isInVoiceChannel, 
      currentConnectionId,
      activeVoiceChannel,
      setVoiceChannelActive 
    }}>
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
