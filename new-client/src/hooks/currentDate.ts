import { useCallback, useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

const DAY_POLLING_FREQUENCY = 1000 * 10; // 10 seconds

export function useCurrentDate(): Dayjs {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const updateDate = useCallback((): void => {
    const newCurrentDate = dayjs();

    if (!newCurrentDate.isSame(currentDate, 'day')) {
      setCurrentDate(newCurrentDate);
    }
  }, [currentDate]);

  useEffect(() => {
    updateDate();
    const timer = setInterval(updateDate, DAY_POLLING_FREQUENCY);
    return () => clearTimeout(timer);
  }, [updateDate]);

  return currentDate;
}
