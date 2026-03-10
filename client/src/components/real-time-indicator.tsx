import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface RealTimeIndicatorProps {
  action: "check_in" | "check_out";
  attendeeName: string;
  studentId?: string;
  timestamp: Date;
}

export function RealTimeIndicator({ action, attendeeName, studentId, timestamp }: RealTimeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const isCheckIn = action === "check_in";
  const Icon = isCheckIn ? CheckCircle : XCircle;
  const actionText = isCheckIn ? "Check-in" : "Check-out";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed right-4 top-20 z-50 max-w-sm"
        >
          <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{actionText} Real-time</p>
              <p className="text-sm text-muted-foreground">{attendeeName}</p>
              {studentId && <p className="text-xs text-muted-foreground">MSSV: {studentId}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(timestamp).toLocaleTimeString("vi-VN")}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MultipleRealTimeIndicators({ updates }: { updates: RealTimeIndicatorProps[] }) {
  return (
    <div className="fixed right-4 top-20 z-50 space-y-3">
      {updates.map((update, index) => (
        <motion.div
          key={`${update.timestamp}-${index}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
          className="rounded-lg border bg-card p-4 shadow-lg"
        >
          <p className="text-sm font-semibold">{update.action === "check_in" ? "Check-in" : "Check-out"} Real-time</p>
          <p className="text-sm text-muted-foreground">{update.attendeeName}</p>
          {update.studentId && <p className="text-xs text-muted-foreground">MSSV: {update.studentId}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{new Date(update.timestamp).toLocaleTimeString("vi-VN")}</p>
        </motion.div>
      ))}
    </div>
  );
}
