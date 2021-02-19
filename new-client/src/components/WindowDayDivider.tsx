import React, { FunctionComponent } from 'react';
import { Badge } from '@chakra-ui/react';
import { Dayjs } from 'dayjs';

interface WindowDayDividerProps {
  ts: Dayjs;
}

const WindowDayDivider: FunctionComponent<WindowDayDividerProps> = ({ ts }: WindowDayDividerProps) => {
  return <Badge>{ts.format('dddd, MMMM D')}</Badge>;
};

export default WindowDayDivider;
