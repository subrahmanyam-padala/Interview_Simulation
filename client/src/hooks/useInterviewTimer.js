import { useEffect, useState } from 'react';

export const useInterviewTimer = (initialSeconds = 90, isRunning = false) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return {
    timeLeft,
    display: `${minutes}:${seconds}`,
    isExpired: timeLeft <= 0,
    reset: () => setTimeLeft(initialSeconds),
  };
};
