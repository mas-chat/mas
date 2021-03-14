import React, { FunctionComponent } from 'react';
import { Flex, Badge } from '@chakra-ui/react';
import { Dayjs } from 'dayjs';

interface WindowDayDividerProps {
  ts: Dayjs;
}

const WindowDayDivider: FunctionComponent<WindowDayDividerProps> = ({ ts }: WindowDayDividerProps) => {
  return (
    <Flex width="100%" py="0.5rem" justifyContent="center">
      <Badge>{ts.format('dddd, MMMM D')}</Badge>
    </Flex>
  );
};

export default WindowDayDivider;
