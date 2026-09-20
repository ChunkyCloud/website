import { useEffect, useState } from "react";

type Duration = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type DurationCounterProps = {
  startDate: Date | string;
  endDate?: Date | string | null;
};

function getDuration(
  startDate: Date | string,
  endDate?: Date | string | null,
): Duration {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();

  const diff = Math.max(0, end - start);

  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function DurationCounter({ startDate, endDate }: DurationCounterProps) {
  const [duration, setDuration] = useState(() =>
    getDuration(startDate, endDate),
  );

  useEffect(() => {
    const update = () => {
      setDuration(getDuration(startDate, endDate));
    };

    update();

    // Don't update if we have an end date
    if (endDate) {
      return;
    }

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return `${duration.days}d ${duration.hours}h ${duration.minutes}m ${duration.seconds}s`;
}
