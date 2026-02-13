import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectedClients: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectedClients: 0,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedClients, setConnectedClients] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Get backend URL from environment or use LAN IP
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('access_token'); // Use same key as in api.ts

    console.log('WebSocket connecting to:', `${backendUrl}/realtime`);
    console.log('Token available:', !!token);

    // Create socket connection
    const newSocket = io(`${backendUrl}/realtime`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'], // Try both transports
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      toast.success('Real-time updates connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      toast.warning('Real-time updates disconnected');
    });

    newSocket.on('connected', (data) => {
      console.log('Connection confirmed:', data);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('Error details:', error.message, error.description, error.context);
      setIsConnected(false);
      
      // Don't show toast for every connection attempt
      if (error.message.includes('Authentication')) {
        toast.error('WebSocket authentication failed');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, connectedClients }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
