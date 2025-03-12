import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Timer } from "lucide-react";

interface WorkoutTimerProps {
  duration: number;
  onComplete?: () => void;
}

export function WorkoutTimer({ duration, onComplete }: WorkoutTimerProps) {
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((time) => {
          if (time <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, remainingTime, onComplete]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (remainingTime === 0) {
      setRemainingTime(duration);
    }
    setIsActive(!isActive);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTimer}
      className="w-32"
    >
      <Timer className="h-4 w-4 mr-2" />
      {formatTime(remainingTime)}
    </Button>
  );
}
