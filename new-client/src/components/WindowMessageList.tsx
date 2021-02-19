import React, { Fragment, FunctionComponent, useRef, useState } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import useResizeObserver from 'use-resize-observer';
import { MessageRow, WindowMemberList, WindowDayDivider } from '.';
import WindowModel from '../models/Window';
import { WindowType } from '../types/notifications';
import MessageModel from '../models/Message';
import { useCurrentDate } from '../hooks/currentDate';

const SCROLL_BOTTOM = Number.MAX_SAFE_INTEGER;

interface MessageListProps {
  window: WindowModel;
}

const MessageList: FunctionComponent<MessageListProps> = ({ window }: MessageListProps) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const placeholder = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const measurerContainer = useRef<HTMLDivElement>(null);
  const currentDate = useCurrentDate();
  const lastMessage = window.sortedMessages[window.sortedMessages.length - 1];

  const scrollToBottom = () => {
    const el = scrollContainer.current;
    el && (el.scrollTop = SCROLL_BOTTOM);
  };

  const handleContainerResize = ({ width = 0, height = 0 }: { width?: number; height?: number }) => {
    setDimensions({ width, height });
  };

  useResizeObserver<HTMLDivElement>({ ref: measurerContainer, onResize: scrollToBottom });
  useResizeObserver<HTMLDivElement>({ ref: placeholder, onResize: handleContainerResize });

  const isFromSameDay = (current: MessageModel, previous: MessageModel) => current.ts.isSame(previous.ts, 'd');

  return (
    <Flex margin="0.3rem" flex="1">
      <Box flex="1" ref={placeholder}>
        <Box
          position="absolute"
          width={dimensions.width}
          height={dimensions.height}
          overflowY="scroll"
          overflowX="hidden"
          ref={scrollContainer}
        >
          <Box ref={measurerContainer}>
            {window.sortedMessages.map((message, index, messages) => (
              <Fragment key={message.gid}>
                {(index === 0 || !isFromSameDay(message, messages[index - 1])) && <WindowDayDivider ts={message.ts} />}
                <MessageRow message={message} />
              </Fragment>
            ))}
            {currentDate.isSame(lastMessage.ts, 'd') ? null : <WindowDayDivider ts={currentDate} />}
          </Box>
        </Box>
      </Box>
      {window.type === WindowType.Group && window.isMemberListVisible && (
        <WindowMemberList window={window} height={dimensions.height} />
      )}
    </Flex>
  );
};

export default observer(MessageList);
