import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface RealTimeIndicatorProps {
  action: 'check_in' | 'check_out';
  attendeeName: string;
  studentId?: string;
  timestamp: Date;
}

export function RealTimeIndicator({ action, attendeeName, studentId, timestamp }: RealTimeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000); // Hide after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const isCheckIn = action === 'check_in';
  const Icon = isCheckIn ? CheckCircle : XCircle;
  const bgColor = isCheckIn ? 'bg-green-500' : 'bg-red-500';
  const borderColor = isCheckIn ? 'border-green-500' : 'border-red-500';
  const actionText = isCheckIn ? 'Check-in' : 'Check-out';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={`fixed top-20 right-4 z-50 max-w-sm`}
        >
          <motion.div
            className={`
              bg-white rounded-lg shadow-2xl border-2 ${borderColor}
              p-4 flex items-center gap-3
              backdrop-blur-sm
            `}
            animate={{ 
              boxShadow: [
                "0 10px 25px rgba(0,0,0,0.1)",
                "0 10px 50px rgba(0,0,0,0.2)",
                "0 10px 25px rgba(0,0,0,0.1)"
              ]
            }}
            transition={{ 
              boxShadow: { 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <motion.div
              className={`${bgColor} rounded-full p-2`}
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              }}
              transition={{ 
                scale: { duration: 0.5 },
                rotate: { duration: 0.6 }
              }}
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {actionText} Real-time
                </span>
                <motion.span
                  className="text-xs text-gray-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ● LIVE
                </motion.span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {attendeeName}
              </p>
              {studentId && (
                <p className="text-xs text-gray-500">
                  MSSV: {studentId}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(timestamp).toLocaleTimeString('vi-VN')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MultipleRealTimeIndicators({ updates }: { updates: RealTimeIndicatorProps[] }) {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-3">
      {updates.map((update, index) => (
        <motion.div
          key={`${update.timestamp}-${index}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <RealTimeIndicator {...update} />
        </motion.div>
      ))}
    </div>
  );
}