import { useCallback, useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

// Plus one to make sure rounding doesn't interfere
const msToMidnight = () => dayjs().add(1, 'day').startOf('date').diff(dayjs()) + 1;

export function useCurrentDate(): Dayjs {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const updateDate = useCallback(() => {
    const currentDate = dayjs();
    const msToNextDay = msToMidnight();

    setCurrentDate(currentDate);
    setTimeout(updateDate, msToNextDay);
  }, []);

  useEffect(updateDate, [updateDate]);

  return currentDate;
}
