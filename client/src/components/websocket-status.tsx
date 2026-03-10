import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi } from 'lucide-react';

export default function WebSocketStatus() {
  const { isConnected } = useWebSocket();

  return (
    <Badge 
      variant={isConnected ? 'default' : 'secondary'} 
      className={`
        fixed bottom-4 right-4 z-40
        hidden items-center gap-2 sm:flex
        border shadow-sm
      `}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
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
