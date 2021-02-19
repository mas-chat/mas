import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

export function useCurrentDate(): Dayjs {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const millisecondsToMidnight = () => dayjs().add(1, 'day').startOf('date').diff(dayjs());
  const updateDate = () => {
    setCurrentDate(dayjs());
    setTimeout(updateDate, millisecondsToMidnight());
  };

  useEffect(() => updateDate);

  return currentDate;
}
