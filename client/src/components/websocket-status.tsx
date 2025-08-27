import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi } from 'lucide-react';

export default function WebSocketStatus() {
  const { isConnected } = useWebSocket();

  return (
    <Badge 
      variant={isConnected ? 'default' : 'secondary'} 
      className={`
        fixed bottom-4 right-4 z-50 
        flex items-center gap-2 
        transition-all duration-300 
        ${isConnected 
          ? 'bg-green-500/90 hover:bg-green-500 text-white border-green-600' 
          : 'bg-red-500/90 hover:bg-red-500 text-white border-red-600'
        }
        shadow-lg backdrop-blur-sm
      `}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3 animate-pulse" />
          <span className="text-xs font-medium">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="text-xs font-medium">Offline</span>
        </>
      )}
    </Badge>
  );
}