import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import type { User } from '@shared/schema';

type WebSocketMessage = {
  type: string;
  data?: any;
  message?: string;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    let wsUrl: string;
    if (apiUrl) {
      // Use the backend API URL
      const url = new URL(apiUrl);
      const protocol = url.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${url.host}/ws`;
    } else {
      // Fallback: only use window.location if we're in development (localhost)
      const isSameDomain = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isSameDomain) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // In production without VITE_API_URL, don't attempt connection
        console.warn('WebSocket: VITE_API_URL not configured. Set it to your backend URL.');
        return;
      }
    }

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts = 0; // Reset on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            setLastMessage(message);
            setMessages(prev => [...prev.slice(-50), message]); // Keep last 50 messages
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts) * 1000;
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    // Add a small delay before initial connection to allow backend to be ready
    const initialConnectionTimeout = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(initialConnectionTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, typedUser?.id]);

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    messages,
    sendMessage
  };
}