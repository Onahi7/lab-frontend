import { useWebSocket } from '@/context/WebSocketContext';
import { Badge } from './ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isConnected ? (
        <Badge variant="default" className="gap-2">
          <Wifi className="w-4 h-4" />
          Real-time Connected
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-2">
          <WifiOff className="w-4 h-4" />
          Disconnected
        </Badge>
      )}
    </div>
  );
}
