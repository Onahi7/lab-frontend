import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
import { soundService } from '@/services/soundService';

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
      setIsConnected(true);
      toast.success('Real-time updates connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast.warning('Real-time updates disconnected');
    });

    newSocket.on('connected', (data) => {
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('Error details:', error.message, (error as any).description, (error as any).context);
      setIsConnected(false);
      
      // Don't show toast for every connection attempt
      if (error.message.includes('Authentication')) {
        toast.error('WebSocket authentication failed');
      }
    });

    newSocket.on('clients:count', ({ count }: { count: number }) => {
      setConnectedClients(count);
    });

    // ── Notification Event Handlers ──────────────────────────────────────

    // Critical result alert
    newSocket.on('result:critical', (result: any) => {
      console.log('🚨 Critical result received:', result);
      
      // Play urgent sound (3 repetitions)
      soundService.play('urgent-order');
      
      // Show browser notification
      notificationService.showCriticalResult({
        orderNumber: result.orderId?.orderNumber || 'Unknown',
        testCode: result.testCode,
        value: result.value,
        unit: result.unit || '',
        flag: result.flag,
        resultId: result._id || result.id,
      });
      
      // Show toast
      toast.error(
        `🚨 CRITICAL RESULT: ${result.testCode} = ${result.value} ${result.unit || ''}`,
        {
          duration: 15000,
          important: true,
        }
      );
    });

    // New order created
    newSocket.on('order:created', (order: any) => {
      console.log('📋 New order created:', order.orderNumber);
      
      // Play new order sound
      soundService.play('new-order');
      
      // Show notification for reception staff
      if (user?.roles?.includes('receptionist')) {
        notificationService.showNewOrder({
          orderNumber: order.orderNumber,
          patientName: order.patient?.firstName + ' ' + order.patient?.lastName || 'Unknown',
          testCount: order.order_tests?.length || 0,
        });
      }
    });

    // Sample collected
    newSocket.on('sample:collected', (sample: any) => {
      console.log('🧪 Sample collected:', sample);
      
      // Play sample ready sound
      soundService.play('sample-collected');
      
      // Show notification for lab staff
      if (user?.roles?.includes('lab_tech') || user?.roles?.includes('admin')) {
        notificationService.showSampleCollected({
          orderNumber: sample.orderNumber || 'Unknown',
          patientName: sample.patientName || 'Unknown',
        });
        
        toast.success('Sample collected and ready for processing', {
          description: `Order: ${sample.orderNumber}`,
        });
      }
    });

    // Unmatched result from analyzer
    newSocket.on('result:unmatched', (result: any) => {
      console.log('⚠️ Unmatched result:', result);
      
      // Play warning sound
      soundService.play('urgent-order');
      
      // Show notification for lab staff
      if (user?.roles?.includes('lab_tech') || user?.roles?.includes('admin')) {
        notificationService.showUnmatchedResult({
          machineName: result.machineName || 'Unknown',
          testCode: result.testCode,
          value: result.value,
        });
        
        toast.warning('Unmatched result requires manual matching', {
          description: `${result.testCode} from ${result.machineName}`,
          duration: 10000,
        });
      }
    });

    // Machine status changed
    newSocket.on('machine:updated', (machine: any) => {
      console.log('⚙️ Machine status changed:', machine);
      
      // Play error sound if machine has error
      if (machine.status === 'error' || machine.status === 'maintenance') {
        soundService.play('urgent-order');
        
        notificationService.showMachineAlert({
          machineName: machine.name,
          status: machine.status,
          message: machine.statusMessage || 'Status changed',
        });
        
        toast.error(`Machine Alert: ${machine.name}`, {
          description: `Status: ${machine.status}`,
        });
      }
    });

    // Result verified
    newSocket.on('result:verified', (result: any) => {
      console.log('✅ Result verified:', result);
      
      // Play success sound
      soundService.play('results-ready');
      
      toast.success('Result verified', {
        description: `${result.testCode} for order ${result.orderId?.orderNumber}`,
      });
    });

    // Order status changed
    newSocket.on('order:status_changed', (data: any) => {
      console.log('📊 Order status changed:', data);
      
      toast.info('Order status updated', {
        description: `${data.orderNumber}: ${data.status}`,
      });
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
