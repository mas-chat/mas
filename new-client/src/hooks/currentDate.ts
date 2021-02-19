import { useCallback, useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

const millisecondsToMidnight = () => dayjs().add(1, 'day').startOf('date').diff(dayjs());

export function useCurrentDate(): Dayjs {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const updateDate = useCallback(() => {
    setCurrentDate(dayjs());
    setTimeout(updateDate, millisecondsToMidnight());
  }, []);

  useEffect(() => updateDate, [updateDate]);

  return currentDate;
}
